import { ImapFlow } from "imapflow"
import { simpleParser } from "mailparser"

import type { EmailSyncStatus } from "../types"

export type EmailSyncErrorCode = Exclude<EmailSyncStatus, "ok">

export class EmailSyncError extends Error {
  code: EmailSyncErrorCode

  constructor(code: EmailSyncErrorCode, message: string) {
    super(message)
    this.name = "EmailSyncError"
    this.code = code
  }
}

export type ImapCredentials = {
  host: string
  port: number
  username: string
  password: string
  folder: string
}

export type FetchedEmailMessage = {
  uid: number
  messageId: string | null
  subject: string
  from: string
  date: Date | null
  text: string
  html: string | null
}

export type FetchNewMessagesResult = {
  uidValidity: number
  uidValidityChanged: boolean
  messages: FetchedEmailMessage[]
}

// Stored bodies are capped so a single oversized email cannot bloat the database.
const MAX_STORED_TEXT_LENGTH = 64 * 1024

const NETWORK_ERROR_CODES = new Set(["ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "ENOTFOUND", "EAI_AGAIN", "EPIPE", "EHOSTUNREACH", "ENETUNREACH"])

type ImapErrorLike = {
  code?: string
  authenticationFailed?: boolean
  responseText?: string
  message?: string
}

function toSyncError(error: unknown, step: "connect" | "mailbox" | "fetch"): EmailSyncError {
  if (error instanceof EmailSyncError) {
    return error
  }

  const imapError = error as ImapErrorLike

  if (imapError?.authenticationFailed) {
    return new EmailSyncError("auth_failed", "Sign-in failed. Check the email address and app password.")
  }

  if (imapError?.code && NETWORK_ERROR_CODES.has(imapError.code)) {
    return new EmailSyncError("network", `Could not reach the mail server (${imapError.code}).`)
  }

  if (step === "mailbox") {
    return new EmailSyncError("folder_missing", "The configured folder was not found in this mailbox. Check the Gmail label name.")
  }

  const detail = imapError?.responseText || imapError?.message
  return new EmailSyncError("error", detail ? `Mail server error: ${detail}` : "Unexpected mail server error.")
}

async function withImapClient<T>(credentials: ImapCredentials, fn: (client: ImapFlow) => Promise<T>): Promise<T> {
  const client = new ImapFlow({
    host: credentials.host,
    port: credentials.port,
    secure: true,
    auth: {
      user: credentials.username,
      pass: credentials.password,
    },
    logger: false,
  })

  try {
    try {
      await client.connect()
    } catch (error) {
      throw toSyncError(error, "connect")
    }

    return await fn(client)
  } finally {
    try {
      await client.logout()
    } catch {
      client.close()
    }
  }
}

export async function testImapConnection(credentials: ImapCredentials): Promise<{ messageCount: number }> {
  return withImapClient(credentials, async (client) => {
    try {
      const status = await client.status(credentials.folder, { messages: true })
      return { messageCount: status.messages ?? 0 }
    } catch (error) {
      throw toSyncError(error, "mailbox")
    }
  })
}

export async function fetchNewMessages(
  credentials: ImapCredentials,
  options: { storedUidValidity: number | null; lastSeenUid: number; maxMessages: number }
): Promise<FetchNewMessagesResult> {
  return withImapClient(credentials, async (client) => {
    let lock: Awaited<ReturnType<ImapFlow["getMailboxLock"]>>
    try {
      lock = await client.getMailboxLock(credentials.folder, { readOnly: true })
    } catch (error) {
      throw toSyncError(error, "mailbox")
    }

    try {
      const mailbox = client.mailbox
      if (!mailbox || typeof mailbox === "boolean") {
        throw new EmailSyncError("folder_missing", "The configured folder could not be opened.")
      }

      const uidValidity = Number(mailbox.uidValidity ?? 0n)
      // A different UIDVALIDITY means the folder was recreated and UIDs restarted; rescan
      // from the beginning (content-level Message-ID dedupe prevents duplicate items).
      const uidValidityChanged = options.storedUidValidity !== null && options.storedUidValidity !== uidValidity
      const effectiveLastSeenUid = uidValidityChanged ? 0 : options.lastSeenUid

      let foundUids: number[] = []
      try {
        const found = await client.search({ uid: `${effectiveLastSeenUid + 1}:*` }, { uid: true })
        foundUids = Array.isArray(found) ? found : []
      } catch (error) {
        throw toSyncError(error, "fetch")
      }

      // IMAP's "n:*" range always returns the highest-UID message even when there is
      // nothing new, so filter explicitly.
      const newUids = foundUids
        .filter((uid) => uid > effectiveLastSeenUid)
        .sort((a, b) => a - b)
        .slice(0, options.maxMessages)

      const messages: FetchedEmailMessage[] = []

      for (const uid of newUids) {
        let source: Buffer | undefined
        try {
          const fetched = await client.fetchOne(String(uid), { source: true }, { uid: true })
          source = fetched && typeof fetched !== "boolean" ? fetched.source : undefined
        } catch (error) {
          console.error(`[email-import] failed to fetch message uid=${uid}`, error)
        }

        if (!source) {
          continue
        }

        try {
          const parsed = await simpleParser(source)
          messages.push({
            uid,
            messageId: parsed.messageId ?? null,
            subject: parsed.subject ?? "",
            from: parsed.from?.text ?? "",
            date: parsed.date ?? null,
            text: (parsed.text ?? "").slice(0, MAX_STORED_TEXT_LENGTH),
            html: typeof parsed.html === "string" ? parsed.html.slice(0, MAX_STORED_TEXT_LENGTH) : null,
          })
        } catch (error) {
          // Keep a stub so the message becomes a visible unparsed item instead of being
          // silently skipped forever once the UID cursor moves past it.
          console.error(`[email-import] failed to parse MIME for uid=${uid}`, error)
          messages.push({ uid, messageId: null, subject: "", from: "", date: null, text: "", html: null })
        }
      }

      return { uidValidity, uidValidityChanged, messages }
    } finally {
      lock.release()
    }
  })
}
