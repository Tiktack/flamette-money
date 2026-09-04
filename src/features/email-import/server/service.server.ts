import { and, asc, desc, eq, inArray, isNotNull, ne, sql } from "drizzle-orm"

import { evaluateEmailRule, type EmailRuleAction, type EmailRuleCondition } from "@/features/email-import/rules"
import { requireAccount, requireCategory, requireUser } from "@/features/shared/server/lookups.server"
import { emailRuleActionSchema, emailRuleConditionSchema, parsedEmailTransactionSchema } from "@/features/shared/server/validators"
import type { TransactionWriteRequest } from "@/features/shared/types"
import { createTransactionForUser, TransactionCommittedButNotReadError } from "@/features/transactions/server/service.server"
import { decryptSecret, encryptSecret, SecretDecryptError } from "@/lib/crypto.server"
import { db, runDbTransaction, type AppTransaction } from "@/lib/db/client.server"
import { emailConnections, emailImportItems, emailImportRules } from "@/lib/db/schema"
import { getEmailImportDefaultPollMinutes } from "@/lib/env.server"
import { z } from "zod"

import type {
  EmailConnectionCreateRequest,
  EmailConnectionListResponse,
  EmailConnectionSummary,
  EmailConnectionTestRequest,
  EmailConnectionTestResult,
  EmailConnectionUpdateRequest,
  EmailImportItemDetail,
  EmailImportItemListItem,
  EmailImportItemsQuery,
  EmailImportItemsResponse,
  EmailImportRuleRequest,
  EmailImportRuleResponse,
  EmailImportSyncResult,
  EmailRulePreviewEntry,
  ParsedEmailTransaction,
} from "../types"
import { EmailSyncError, testImapConnection } from "./imap.server"
import { listParserOptions } from "./parsers/registry"
import { reconcileTransactionForUser } from "./reconcile.server"
import { buildEmailResolutionContext, resolveEmailItem } from "./resolve.server"
import { applyOutcomeFields, countOutcome, isEmailSyncInFlight, runExclusiveEmailSync } from "./sync.server"

const DEFAULT_HOST = "imap.gmail.com"
const DEFAULT_PORT = 993
const ITEM_EXCERPT_LENGTH = 200
const RULE_PREVIEW_SAMPLE_SIZE = 50

type EmailConnectionRecord = typeof emailConnections.$inferSelect
type EmailImportRuleRecord = typeof emailImportRules.$inferSelect
type EmailImportItemRecord = typeof emailImportItems.$inferSelect

function toIsoString(date: Date | null | undefined) {
  return date ? date.toISOString() : null
}

// ---------------------------------------------------------------------------
// Connections
// ---------------------------------------------------------------------------

type ItemCounts = { pending: number; unparsed: number; error: number }

function mapConnection(row: EmailConnectionRecord, counts: ItemCounts): EmailConnectionSummary {
  return {
    id: row.id,
    name: row.name,
    host: row.host,
    port: row.port,
    username: row.username,
    folder: row.folder,
    parserKey: row.parserKey,
    defaultAccountId: row.defaultAccountId,
    enabled: row.enabled,
    pollIntervalMinutes: row.pollIntervalMinutes,
    lastSyncAt: toIsoString(row.lastSyncAt),
    lastSyncStatus: row.lastSyncStatus,
    lastSyncError: row.lastSyncError,
    consecutiveFailures: row.consecutiveFailures,
    pendingCount: counts.pending,
    unparsedCount: counts.unparsed,
    errorCount: counts.error,
    createdAt: row.createdAt.toISOString(),
  }
}

async function loadItemCountsByConnection(userId: string) {
  const rows = await db
    .select({
      connectionId: emailImportItems.connectionId,
      status: emailImportItems.status,
      count: sql<number>`count(*)`,
    })
    .from(emailImportItems)
    .where(eq(emailImportItems.userId, userId))
    .groupBy(emailImportItems.connectionId, emailImportItems.status)

  const countsByConnection = new Map<string, ItemCounts>()
  for (const row of rows) {
    const counts = countsByConnection.get(row.connectionId) ?? { pending: 0, unparsed: 0, error: 0 }
    if (row.status === "pending") counts.pending = row.count
    else if (row.status === "unparsed") counts.unparsed = row.count
    else if (row.status === "error") counts.error = row.count
    countsByConnection.set(row.connectionId, counts)
  }

  return countsByConnection
}

async function requireEmailConnection(userId: string, connectionId: string) {
  const connection = await db.query.emailConnections.findFirst({
    where: and(eq(emailConnections.userId, userId), eq(emailConnections.id, connectionId)),
  })

  if (!connection) {
    throw new Error("Email connection was not found.")
  }

  return connection
}

export async function listEmailConnectionsData(): Promise<EmailConnectionListResponse> {
  const user = await requireUser()
  const [rows, countsByConnection] = await Promise.all([
    db.query.emailConnections.findMany({
      where: eq(emailConnections.userId, user.id),
      orderBy: [asc(emailConnections.createdAt)],
    }),
    loadItemCountsByConnection(user.id),
  ])

  return {
    connections: rows.map((row) => mapConnection(row, countsByConnection.get(row.id) ?? { pending: 0, unparsed: 0, error: 0 })),
    parserOptions: listParserOptions(),
  }
}

async function assertConnectionTestPasses(credentials: { host: string; port: number; username: string; password: string; folder: string }) {
  try {
    await testImapConnection(credentials)
  } catch (error) {
    if (error instanceof EmailSyncError) {
      throw new Error(`Connection test failed: ${error.message}`, { cause: error })
    }
    throw error
  }
}

export async function createEmailConnectionData(request: EmailConnectionCreateRequest): Promise<EmailConnectionSummary> {
  const user = await requireUser()

  if (request.defaultAccountId) {
    await requireAccount(user.id, request.defaultAccountId)
  }

  const host = request.host ?? DEFAULT_HOST
  const port = request.port ?? DEFAULT_PORT

  await assertConnectionTestPasses({
    host,
    port,
    username: request.username,
    password: request.password,
    folder: request.folder,
  })

  const id = crypto.randomUUID()
  await db.insert(emailConnections).values({
    id,
    userId: user.id,
    name: request.name,
    host,
    port,
    username: request.username,
    passwordEncrypted: encryptSecret(request.password),
    folder: request.folder,
    parserKey: request.parserKey,
    defaultAccountId: request.defaultAccountId ?? null,
    enabled: request.enabled ?? true,
    pollIntervalMinutes: request.pollIntervalMinutes ?? getEmailImportDefaultPollMinutes(),
  })

  const created = await requireEmailConnection(user.id, id)
  return mapConnection(created, { pending: 0, unparsed: 0, error: 0 })
}

export async function updateEmailConnectionData(connectionId: string, request: EmailConnectionUpdateRequest): Promise<EmailConnectionSummary> {
  const user = await requireUser()
  const existing = await requireEmailConnection(user.id, connectionId)

  if (request.defaultAccountId) {
    await requireAccount(user.id, request.defaultAccountId)
  }

  const host = request.host ?? existing.host
  const port = request.port ?? existing.port
  const newPassword = request.password && request.password.length > 0 ? request.password : null
  const mailboxChanged = host !== existing.host || port !== existing.port || request.username !== existing.username || request.folder !== existing.folder
  const credentialsChanged = mailboxChanged || newPassword !== null

  if (credentialsChanged) {
    let password = newPassword
    if (!password) {
      try {
        password = decryptSecret(existing.passwordEncrypted)
      } catch (error) {
        if (error instanceof SecretDecryptError) {
          throw new Error("The stored app password can no longer be decrypted. Enter it again to update this connection.", { cause: error })
        }
        throw error
      }
    }

    await assertConnectionTestPasses({ host, port, username: request.username, password, folder: request.folder })
  }

  const now = new Date()
  await db
    .update(emailConnections)
    .set({
      name: request.name,
      host,
      port,
      username: request.username,
      folder: request.folder,
      parserKey: request.parserKey,
      defaultAccountId: request.defaultAccountId ?? null,
      enabled: request.enabled ?? existing.enabled,
      pollIntervalMinutes: request.pollIntervalMinutes ?? existing.pollIntervalMinutes,
      ...(newPassword ? { passwordEncrypted: encryptSecret(newPassword) } : {}),
      // A different mailbox means the UID cursor no longer applies.
      ...(mailboxChanged ? { uidValidity: null, lastSeenUid: 0 } : {}),
      ...(credentialsChanged ? { lastSyncStatus: null, lastSyncError: null, consecutiveFailures: 0 } : {}),
      updatedAt: now,
    })
    .where(and(eq(emailConnections.userId, user.id), eq(emailConnections.id, connectionId)))

  const [updated, countsByConnection] = await Promise.all([requireEmailConnection(user.id, connectionId), loadItemCountsByConnection(user.id)])
  return mapConnection(updated, countsByConnection.get(connectionId) ?? { pending: 0, unparsed: 0, error: 0 })
}

export async function deleteEmailConnectionData(connectionId: string): Promise<void> {
  const user = await requireUser()
  await requireEmailConnection(user.id, connectionId)
  await db.delete(emailConnections).where(and(eq(emailConnections.userId, user.id), eq(emailConnections.id, connectionId)))
}

// Wipes a connection's import history so the next sync re-reads the whole mailbox folder:
// every item (including imported/dismissed dedupe records) is deleted and the UID cursor is
// reset. Transactions that were already created are kept — a re-imported email links back
// to its matching transaction through reconciliation instead of duplicating it.
export async function resetEmailConnectionData(connectionId: string): Promise<void> {
  const user = await requireUser()
  await requireEmailConnection(user.id, connectionId)

  // A running sync would re-insert items and advance the cursor mid-reset.
  if (isEmailSyncInFlight(connectionId)) {
    throw new Error("A sync for this connection is running. Try again in a moment.")
  }

  runDbTransaction((tx) => {
    tx.delete(emailImportItems)
      .where(and(eq(emailImportItems.userId, user.id), eq(emailImportItems.connectionId, connectionId)))
      .run()
    tx.update(emailConnections)
      .set({
        uidValidity: null,
        lastSeenUid: 0,
        lastSyncAt: null,
        lastSyncStatus: null,
        lastSyncError: null,
        consecutiveFailures: 0,
        updatedAt: new Date(),
      })
      .where(and(eq(emailConnections.userId, user.id), eq(emailConnections.id, connectionId)))
      .run()
  })
}

export async function testEmailConnectionData(request: EmailConnectionTestRequest): Promise<EmailConnectionTestResult> {
  const user = await requireUser()

  let credentials: { host: string; port: number; username: string; password: string; folder: string }

  if (request.connectionId) {
    const existing = await requireEmailConnection(user.id, request.connectionId)
    let password = request.password && request.password.length > 0 ? request.password : null
    if (!password) {
      try {
        password = decryptSecret(existing.passwordEncrypted)
      } catch (error) {
        if (error instanceof SecretDecryptError) {
          return { ok: false, code: "auth_failed", message: "The stored app password can no longer be decrypted. Enter it again." }
        }
        throw error
      }
    }

    credentials = {
      host: request.host ?? existing.host,
      port: request.port ?? existing.port,
      username: request.username ?? existing.username,
      password,
      folder: request.folder ?? existing.folder,
    }
  } else {
    if (!request.username || !request.password || !request.folder) {
      throw new Error("Email address, app password, and folder are required to test a connection.")
    }

    credentials = {
      host: request.host ?? DEFAULT_HOST,
      port: request.port ?? DEFAULT_PORT,
      username: request.username,
      password: request.password,
      folder: request.folder,
    }
  }

  try {
    const result = await testImapConnection(credentials)
    return { ok: true, messageCount: result.messageCount }
  } catch (error) {
    if (error instanceof EmailSyncError) {
      return { ok: false, code: error.code, message: error.message }
    }
    throw error
  }
}

export async function syncEmailConnectionNowData(connectionId: string): Promise<EmailImportSyncResult> {
  const user = await requireUser()
  await requireEmailConnection(user.id, connectionId)

  try {
    return await runExclusiveEmailSync(connectionId)
  } catch (error) {
    if (error instanceof EmailSyncError) {
      throw new Error(error.message, { cause: error })
    }
    throw error
  }
}

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

const conditionsReadSchema = z.array(emailRuleConditionSchema)

function mapRule(row: EmailImportRuleRecord): EmailImportRuleResponse | null {
  try {
    return {
      id: row.id,
      name: row.name,
      enabled: row.enabled,
      priority: row.priority,
      matchMode: row.matchMode,
      conditions: conditionsReadSchema.parse(JSON.parse(row.conditions)) as EmailRuleCondition[],
      action: emailRuleActionSchema.parse(JSON.parse(row.action)) as EmailRuleAction,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }
  } catch (error) {
    console.error(`[email-import] skipping invalid rule ${row.id}`, error)
    return null
  }
}

async function requireEmailImportRule(userId: string, ruleId: string) {
  const rule = await db.query.emailImportRules.findFirst({
    where: and(eq(emailImportRules.userId, userId), eq(emailImportRules.id, ruleId)),
  })

  if (!rule) {
    throw new Error("Import rule was not found.")
  }

  return rule
}

// Rules embed entity ids as JSON, so referential integrity is enforced here on write and
// re-checked at evaluation time.
async function assertRuleReferences(userId: string, request: EmailImportRuleRequest) {
  if (request.action.type === "assign") {
    const { accountId, categoryId, subCategoryId } = request.action

    if (accountId) {
      await requireAccount(userId, accountId)
    }

    if (subCategoryId && !categoryId) {
      throw new Error("A subcategory requires a category.")
    }

    if (categoryId) {
      const category = await requireCategory(userId, categoryId)
      if (category.parentId) {
        throw new Error("Choose a top-level category; use the subcategory field for children.")
      }
    }

    if (subCategoryId) {
      const subCategory = await requireCategory(userId, subCategoryId)
      if (subCategory.parentId !== categoryId) {
        throw new Error("The subcategory must belong to the selected category.")
      }
    }
  }

  for (const condition of request.conditions) {
    if (condition.field === "connectionId") {
      await requireEmailConnection(userId, condition.value)
    }
  }
}

export async function listEmailImportRulesData(): Promise<EmailImportRuleResponse[]> {
  const user = await requireUser()
  const rows = await db.query.emailImportRules.findMany({
    where: eq(emailImportRules.userId, user.id),
    orderBy: [asc(emailImportRules.priority), asc(emailImportRules.createdAt)],
  })

  return rows.map(mapRule).filter((rule): rule is EmailImportRuleResponse => rule !== null)
}

export async function createEmailImportRuleData(request: EmailImportRuleRequest): Promise<EmailImportRuleResponse> {
  const user = await requireUser()
  await assertRuleReferences(user.id, request)

  const [{ maxPriority }] = await db
    .select({ maxPriority: sql<number>`coalesce(max(priority), 0)` })
    .from(emailImportRules)
    .where(eq(emailImportRules.userId, user.id))

  const id = crypto.randomUUID()
  await db.insert(emailImportRules).values({
    id,
    userId: user.id,
    name: request.name,
    enabled: request.enabled,
    priority: maxPriority + 1,
    matchMode: request.matchMode,
    conditions: JSON.stringify(request.conditions),
    action: JSON.stringify(request.action),
  })

  const created = mapRule(await requireEmailImportRule(user.id, id))
  if (!created) {
    throw new Error("The rule could not be saved.")
  }
  return created
}

export async function updateEmailImportRuleData(ruleId: string, request: EmailImportRuleRequest): Promise<EmailImportRuleResponse> {
  const user = await requireUser()
  await requireEmailImportRule(user.id, ruleId)
  await assertRuleReferences(user.id, request)

  await db
    .update(emailImportRules)
    .set({
      name: request.name,
      enabled: request.enabled,
      matchMode: request.matchMode,
      conditions: JSON.stringify(request.conditions),
      action: JSON.stringify(request.action),
      updatedAt: new Date(),
    })
    .where(and(eq(emailImportRules.userId, user.id), eq(emailImportRules.id, ruleId)))

  const updated = mapRule(await requireEmailImportRule(user.id, ruleId))
  if (!updated) {
    throw new Error("The rule could not be saved.")
  }
  return updated
}

export async function deleteEmailImportRuleData(ruleId: string): Promise<void> {
  const user = await requireUser()
  await requireEmailImportRule(user.id, ruleId)
  await db.delete(emailImportRules).where(and(eq(emailImportRules.userId, user.id), eq(emailImportRules.id, ruleId)))
}

export async function reorderEmailImportRulesData(orderedIds: string[]): Promise<void> {
  const user = await requireUser()
  const rows = await db.query.emailImportRules.findMany({
    where: eq(emailImportRules.userId, user.id),
    columns: { id: true, priority: true },
    orderBy: [asc(emailImportRules.priority), asc(emailImportRules.createdAt)],
  })

  const existingIds = new Set(rows.map((row) => row.id))
  const uniqueProvided = new Set(orderedIds)
  // Every provided id must be a distinct rule that belongs to the user. We do NOT require
  // the client to list every rule: rows hidden from the list (e.g. corrupt JSON that fails
  // to map) would otherwise make reordering impossible, since the client never sees them.
  if (uniqueProvided.size !== orderedIds.length || orderedIds.some((id) => !existingIds.has(id))) {
    throw new Error("The rule order is out of date. Refresh and try again.")
  }

  // Any rules the client didn't send keep their existing relative order after the reordered
  // ones, so a hidden/corrupt row can't block reordering the visible rules.
  const trailingIds = rows.map((row) => row.id).filter((id) => !uniqueProvided.has(id))
  const finalOrder = [...orderedIds, ...trailingIds]

  const now = new Date()
  runDbTransaction((tx) => {
    finalOrder.forEach((id, index) => {
      tx.update(emailImportRules)
        .set({ priority: index + 1, updatedAt: now })
        .where(and(eq(emailImportRules.userId, user.id), eq(emailImportRules.id, id)))
        .run()
    })
  })
}

export async function previewEmailImportRuleData(request: { matchMode: "all" | "any"; conditions: EmailRuleCondition[] }): Promise<EmailRulePreviewEntry[]> {
  const user = await requireUser()
  const rows = await db.query.emailImportItems.findMany({
    where: and(eq(emailImportItems.userId, user.id), isNotNull(emailImportItems.parsedJson)),
    orderBy: [desc(emailImportItems.createdAt)],
    limit: RULE_PREVIEW_SAMPLE_SIZE,
  })

  const entries: EmailRulePreviewEntry[] = []
  for (const row of rows) {
    const parsed = parseStoredTransaction(row.parsedJson)
    if (!parsed) {
      continue
    }

    entries.push({
      itemId: row.id,
      subject: row.subject,
      merchant: parsed.merchant,
      description: parsed.description,
      amount: parsed.amount,
      currency: parsed.currency,
      direction: parsed.direction,
      matches: evaluateEmailRule({ matchMode: request.matchMode, conditions: request.conditions }, { ...parsed, connectionId: row.connectionId }),
    })
  }

  return entries
}

// ---------------------------------------------------------------------------
// Review items
// ---------------------------------------------------------------------------

function parseStoredTransaction(parsedJson: string | null): ParsedEmailTransaction | null {
  if (!parsedJson) {
    return null
  }

  try {
    return parsedEmailTransactionSchema.parse(JSON.parse(parsedJson))
  } catch {
    return null
  }
}

type ItemWithRelations = EmailImportItemRecord & {
  connection: { name: string } | null
  matchedRule: { name: string } | null
}

function mapItem(row: ItemWithRelations): EmailImportItemListItem {
  return {
    id: row.id,
    connectionId: row.connectionId,
    connectionName: row.connection?.name ?? "Deleted connection",
    status: row.status,
    subject: row.subject,
    fromAddress: row.fromAddress,
    emailDate: toIsoString(row.emailDate),
    excerpt: row.rawText ? row.rawText.slice(0, ITEM_EXCERPT_LENGTH) : null,
    parsed: parseStoredTransaction(row.parsedJson),
    parseError: row.parseError,
    matchedRuleId: row.matchedRuleId,
    matchedRuleName: row.matchedRule?.name ?? null,
    transactionId: row.transactionId,
    error: row.error,
    importedAt: toIsoString(row.importedAt),
    createdAt: row.createdAt.toISOString(),
  }
}

function buildItemsWhere(userId: string, query?: EmailImportItemsQuery) {
  const filters = [eq(emailImportItems.userId, userId)]
  if (query?.statuses && query.statuses.length > 0) {
    filters.push(inArray(emailImportItems.status, query.statuses))
  }
  if (query?.connectionId) {
    filters.push(eq(emailImportItems.connectionId, query.connectionId))
  }
  return and(...filters)
}

export async function listEmailImportItemsData(query?: EmailImportItemsQuery): Promise<EmailImportItemsResponse> {
  const user = await requireUser()
  const where = buildItemsWhere(user.id, query)

  const [rows, [{ totalCount }]] = await Promise.all([
    db.query.emailImportItems.findMany({
      where,
      orderBy: [desc(emailImportItems.emailDate), desc(emailImportItems.createdAt)],
      limit: query?.limit ?? 100,
      offset: query?.offset ?? 0,
      with: {
        connection: { columns: { name: true } },
        matchedRule: { columns: { name: true } },
      },
    }),
    db
      .select({ totalCount: sql<number>`count(*)` })
      .from(emailImportItems)
      .where(where),
  ])

  return {
    items: rows.map((row) => mapItem(row)),
    totalCount,
  }
}

async function requireEmailImportItem(userId: string, itemId: string) {
  const item = await db.query.emailImportItems.findFirst({
    where: and(eq(emailImportItems.userId, userId), eq(emailImportItems.id, itemId)),
    with: {
      connection: { columns: { name: true } },
      matchedRule: { columns: { name: true } },
    },
  })

  if (!item) {
    throw new Error("Imported email was not found.")
  }

  return item
}

export async function getEmailImportItemData(itemId: string): Promise<EmailImportItemDetail> {
  const user = await requireUser()
  const item = await requireEmailImportItem(user.id, itemId)
  return { ...mapItem(item), rawText: item.rawText }
}

// Approve a reviewed email into a transaction. Creating the transaction and marking the
// item imported happen in ONE DB transaction, so a failure can never leave a created
// transaction with a still-pending item (which a re-approve would then duplicate).
export async function approveEmailImportItemData(itemId: string, request: TransactionWriteRequest): Promise<{ transactionId: string }> {
  const user = await requireUser()
  const item = await requireEmailImportItem(user.id, itemId)
  if (item.status === "imported") {
    throw new Error("This email has already been imported.")
  }

  const linkItem = (tx: AppTransaction, transactionId: string) => {
    const linked = tx
      .update(emailImportItems)
      .set({ status: "imported", transactionId, importedAt: new Date(), error: null, updatedAt: new Date() })
      // The `ne(..., "imported")` guard makes a concurrent approve of the same item a
      // no-op update; 0 rows changed rolls back the whole creation.
      .where(and(eq(emailImportItems.userId, user.id), eq(emailImportItems.id, itemId), ne(emailImportItems.status, "imported")))
      .run()
    if (linked.changes === 0) {
      throw new Error("This email has already been imported.")
    }
  }

  try {
    // If the user already recorded this transaction by hand, link the email to it instead
    // of creating a duplicate.
    const reconciled = await reconcileTransactionForUser(user, request, { withinTransaction: linkItem })
    if (reconciled) {
      return { transactionId: reconciled.id }
    }

    const created = await createTransactionForUser(user, request, { withinTransaction: linkItem })
    return { transactionId: created.id }
  } catch (error) {
    // The transaction and the link committed together; only the read-back failed.
    if (error instanceof TransactionCommittedButNotReadError) {
      return { transactionId: error.transactionId }
    }
    throw error
  }
}

export async function dismissEmailImportItemData(itemId: string): Promise<void> {
  const user = await requireUser()
  const item = await requireEmailImportItem(user.id, itemId)

  if (item.status === "imported") {
    throw new Error("Imported items cannot be dismissed.")
  }

  await db
    .update(emailImportItems)
    .set({ status: "dismissed", updatedAt: new Date() })
    .where(and(eq(emailImportItems.userId, user.id), eq(emailImportItems.id, itemId)))
}

export async function restoreEmailImportItemData(itemId: string): Promise<void> {
  const user = await requireUser()
  const item = await requireEmailImportItem(user.id, itemId)

  if (item.status !== "dismissed" && item.status !== "ignored") {
    throw new Error("Only dismissed or ignored items can be restored.")
  }

  await db
    .update(emailImportItems)
    .set({ status: item.parsedJson ? "pending" : "unparsed", updatedAt: new Date() })
    .where(and(eq(emailImportItems.userId, user.id), eq(emailImportItems.id, itemId)))
}

// Re-runs parser + rules + auto-create over stored raw bodies. Used after the parser is
// improved or rules change — unparsed history flows through without refetching mail.
export async function reparseEmailImportItemsData(request: { ids?: string[]; connectionId?: string }): Promise<EmailImportSyncResult> {
  const user = await requireUser()

  const filters = [eq(emailImportItems.userId, user.id), inArray(emailImportItems.status, ["unparsed", "pending", "error"])]
  if (request.ids && request.ids.length > 0) {
    filters.push(inArray(emailImportItems.id, request.ids))
  }
  if (request.connectionId) {
    filters.push(eq(emailImportItems.connectionId, request.connectionId))
  }

  const items = await db.query.emailImportItems.findMany({
    where: and(...filters),
    orderBy: [asc(emailImportItems.createdAt)],
  })

  const result: EmailImportSyncResult = { fetched: items.length, imported: 0, linked: 0, pending: 0, unparsed: 0, ignored: 0, errors: 0 }
  const contextByConnection = new Map<string, Awaited<ReturnType<typeof buildEmailResolutionContext>>>()

  for (const item of items) {
    let context = contextByConnection.get(item.connectionId)
    if (!context) {
      const connection = await requireEmailConnection(user.id, item.connectionId)
      context = await buildEmailResolutionContext(connection)
      contextByConnection.set(item.connectionId, context)
    }

    const outcome = await resolveEmailItem(context, {
      subject: item.subject ?? "",
      from: item.fromAddress ?? "",
      date: item.emailDate,
      text: item.rawText ?? "",
      html: null,
    })

    await db.update(emailImportItems).set(applyOutcomeFields(outcome, new Date())).where(eq(emailImportItems.id, item.id))

    countOutcome(result, outcome)
  }

  return result
}
