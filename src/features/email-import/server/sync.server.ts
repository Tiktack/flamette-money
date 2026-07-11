import { and, eq } from "drizzle-orm"

import { decryptSecret, SecretDecryptError } from "@/lib/crypto.server"
import { db } from "@/lib/db/client.server"
import { emailConnections, emailImportItems } from "@/lib/db/schema"
import { getEmailImportMaxMessagesPerSync } from "@/lib/env.server"

import type { EmailImportSyncResult } from "../types"
import { EmailSyncError, fetchNewMessages, type FetchedEmailMessage } from "./imap.server"
import { stripHtml } from "./parsers/html"
import { buildEmailResolutionContext, resolveEmailItem, type EmailResolutionContext, type EmailResolutionOutcome } from "./resolve.server"

type EmailConnectionRecord = typeof emailConnections.$inferSelect

// Shared across module graphs (dev SSR/HMR can evaluate this module more than once) so a
// connection is never synced concurrently by the scheduler and a manual "Sync now".
const activeSyncs = ((globalThis as Record<symbol, unknown>)[Symbol.for("flamette.emailImport.activeSyncs")] ??= new Set<string>()) as Set<string>

export function isEmailSyncInFlight(connectionId: string) {
  return activeSyncs.has(connectionId)
}

export async function runExclusiveEmailSync(connectionId: string): Promise<EmailImportSyncResult> {
  if (activeSyncs.has(connectionId)) {
    throw new Error("A sync for this connection is already running. Try again in a moment.")
  }

  activeSyncs.add(connectionId)
  try {
    return await syncEmailConnection(connectionId)
  } finally {
    activeSyncs.delete(connectionId)
  }
}

function emptySyncResult(): EmailImportSyncResult {
  return { fetched: 0, imported: 0, pending: 0, unparsed: 0, ignored: 0, errors: 0 }
}

function countOutcome(result: EmailImportSyncResult, outcome: EmailResolutionOutcome) {
  if (outcome.status === "imported") result.imported += 1
  else if (outcome.status === "pending") result.pending += 1
  else if (outcome.status === "unparsed") result.unparsed += 1
  else if (outcome.status === "ignored") result.ignored += 1
  else result.errors += 1
}

function resolveStoredBody(message: FetchedEmailMessage) {
  const text = message.text.trim()
  if (text.length > 0) {
    return message.text
  }
  return message.html ? stripHtml(message.html) : ""
}

export function applyOutcomeFields(outcome: EmailResolutionOutcome, now: Date) {
  return {
    status: outcome.status,
    parsedJson: "parsed" in outcome ? JSON.stringify(outcome.parsed) : null,
    parseError: outcome.status === "unparsed" ? outcome.parseError : null,
    matchedRuleId: "matchedRuleId" in outcome ? outcome.matchedRuleId : null,
    transactionId: outcome.status === "imported" ? outcome.transactionId : null,
    error: outcome.status === "error" ? outcome.error : null,
    importedAt: outcome.status === "imported" ? now : null,
    updatedAt: now,
  }
}

async function processMessage(
  context: EmailResolutionContext,
  message: FetchedEmailMessage,
  uidValidity: number,
  result: EmailImportSyncResult
): Promise<void> {
  const connectionId = context.connection.id

  // Content-level dedupe: after a UIDVALIDITY reset the same email comes back with a new
  // UID, but its RFC822 Message-ID is unchanged.
  if (message.messageId) {
    const existing = await db.query.emailImportItems.findFirst({
      where: and(eq(emailImportItems.connectionId, connectionId), eq(emailImportItems.messageId, message.messageId)),
      columns: { id: true },
    })
    if (existing) {
      return
    }
  }

  const id = crypto.randomUUID()
  const insertResult = await db
    .insert(emailImportItems)
    .values({
      id,
      userId: context.connection.userId,
      connectionId,
      uidValidity,
      messageUid: message.uid,
      messageId: message.messageId,
      subject: message.subject || null,
      fromAddress: message.from || null,
      emailDate: message.date,
      rawText: resolveStoredBody(message) || null,
      status: "pending",
    })
    .onConflictDoNothing()
    .run()

  if (insertResult.changes === 0) {
    // Already processed in a previous run (unique UID index) — skip.
    return
  }

  result.fetched += 1

  const outcome = await resolveEmailItem(context, {
    subject: message.subject,
    from: message.from,
    date: message.date,
    text: message.text,
    html: message.html,
  })

  await db.update(emailImportItems).set(applyOutcomeFields(outcome, new Date())).where(eq(emailImportItems.id, id))

  countOutcome(result, outcome)
}

async function recordSyncFailure(connection: EmailConnectionRecord, error: EmailSyncError) {
  const now = new Date()
  await db
    .update(emailConnections)
    .set({
      lastSyncAt: now,
      lastSyncStatus: error.code,
      lastSyncError: error.message,
      consecutiveFailures: connection.consecutiveFailures + 1,
      updatedAt: now,
    })
    .where(eq(emailConnections.id, connection.id))
}

export async function syncEmailConnection(connectionId: string): Promise<EmailImportSyncResult> {
  const connection = await db.query.emailConnections.findFirst({ where: eq(emailConnections.id, connectionId) })
  if (!connection) {
    throw new Error("Email connection was not found.")
  }

  try {
    let password: string
    try {
      password = decryptSecret(connection.passwordEncrypted)
    } catch (error) {
      if (error instanceof SecretDecryptError) {
        throw new EmailSyncError("auth_failed", "The stored app password can no longer be decrypted. Re-enter it in the connection settings.")
      }
      throw error
    }

    const fetchResult = await fetchNewMessages(
      {
        host: connection.host,
        port: connection.port,
        username: connection.username,
        password,
        folder: connection.folder,
      },
      {
        storedUidValidity: connection.uidValidity,
        lastSeenUid: connection.lastSeenUid,
        maxMessages: getEmailImportMaxMessagesPerSync(),
      }
    )

    const context = await buildEmailResolutionContext(connection)
    const result = emptySyncResult()
    let maxProcessedUid = fetchResult.uidValidityChanged ? 0 : connection.lastSeenUid

    for (const message of fetchResult.messages) {
      try {
        await processMessage(context, message, fetchResult.uidValidity, result)
      } catch (error) {
        // Never let one poison message stall the cursor or the rest of the batch.
        console.error(`[email-import] failed to process message uid=${message.uid} for connection ${connectionId}`, error)
        result.errors += 1
      }
      maxProcessedUid = Math.max(maxProcessedUid, message.uid)
    }

    const now = new Date()
    await db
      .update(emailConnections)
      .set({
        uidValidity: fetchResult.uidValidity,
        lastSeenUid: maxProcessedUid,
        lastSyncAt: now,
        lastSyncStatus: "ok",
        lastSyncError: null,
        consecutiveFailures: 0,
        updatedAt: now,
      })
      .where(eq(emailConnections.id, connection.id))

    return result
  } catch (error) {
    const syncError = error instanceof EmailSyncError ? error : new EmailSyncError("error", error instanceof Error ? error.message : "Sync failed unexpectedly.")
    await recordSyncFailure(connection, syncError).catch((recordError) => {
      console.error(`[email-import] failed to record sync failure for connection ${connectionId}`, recordError)
    })
    throw syncError
  }
}
