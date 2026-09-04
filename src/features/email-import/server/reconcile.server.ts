import { format } from "date-fns"
import { and, asc, eq, gte, inArray, lte } from "drizzle-orm"

import { normalizeLocation, normalizeMerchantName } from "@/features/shared/server/normalizers.server"
import type { TransactionWriteRequest } from "@/features/shared/types"
import { normalizeCurrencyOrNull } from "@/lib/currency"
import { db, runDbTransaction, type AppTransaction } from "@/lib/db/client.server"
import { emailImportItems, transactions } from "@/lib/db/schema"
import { parsePositiveAmount } from "@/lib/server/parsing.server"

// Amounts are stored as SQLite reals; two values less than half a cent apart are the same
// amount, anything else is a different transaction.
const AMOUNT_EPSILON = 0.005

// Day-granularity dates are stored at UTC midnight. The transaction editor used to send
// local-midnight datetimes (a manual entry for Jul 14 in UTC+2 was stored at Jul 13 22:00Z)
// until migration 0006 normalized them — matching still tolerates both conventions as
// defense: candidates are fetched over a window wide enough for any UTC offset and kept
// when either their UTC or their server-local calendar day equals D.
const MAX_TZ_OFFSET_MS = 14 * 3_600_000

const leadingDayRegex = /^(\d{4}-\d{2}-\d{2})/

// Every caller encodes the intended calendar day as the string's leading "yyyy-MM-dd"
// (both the email parser and the transaction editor send plain "2026-07-14").
function requestCalendarDay(value: string): string | null {
  const match = leadingDayRegex.exec(value.trim())
  if (match) {
    return match[1]
  }
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : format(parsed, "yyyy-MM-dd")
}

function isOnCalendarDay(date: Date, day: string) {
  return date.toISOString().slice(0, 10) === day || format(date, "yyyy-MM-dd") === day
}

export type ReconcileTransactionOptions = {
  // Runs inside the same DB transaction as the enrichment update, mirroring
  // CreateTransactionForUserOptions so callers can link an email item to the matched
  // transaction atomically. Throwing here rolls back the enrichment too.
  withinTransaction?: (tx: AppTransaction, transactionId: string) => void
}

// Finds a transaction the user already recorded by hand that matches an incoming email —
// same account, type, calendar day and amount — so the import links to it instead of
// creating a duplicate. Transactions already linked to another email item are skipped: two
// identical purchases on the same day arrive as two emails and must stay two transactions.
// On a match, empty merchant/location fields are filled from the email; values the user
// typed themselves are never overwritten.
export async function reconcileTransactionForUser(
  user: { id: string },
  request: TransactionWriteRequest,
  options?: ReconcileTransactionOptions
): Promise<{ id: string } | null> {
  // Emails only produce Income/Expense; transfers and refunds have pairing semantics of
  // their own and must never be matched by amount.
  if (request.type !== "Income" && request.type !== "Expense") {
    return null
  }

  const amount = parsePositiveAmount(request.amount, "Amount")
  const requestCurrency = normalizeCurrencyOrNull(request.currency)

  const day = requestCalendarDay(request.date)
  if (!day) {
    return null
  }

  const dayStartUtc = new Date(`${day}T00:00:00Z`)
  const nearby = await db.query.transactions.findMany({
    where: and(
      eq(transactions.userId, user.id),
      eq(transactions.accountId, request.accountId),
      eq(transactions.type, request.type),
      gte(transactions.date, new Date(dayStartUtc.getTime() - MAX_TZ_OFFSET_MS)),
      lte(transactions.date, new Date(dayStartUtc.getTime() + 24 * 3_600_000 - 1 + MAX_TZ_OFFSET_MS))
    ),
    orderBy: [asc(transactions.createdAt)],
  })

  const candidates = nearby.filter((candidate) => {
    if (!isOnCalendarDay(candidate.date, day)) {
      return false
    }

    if (Math.abs(candidate.amount - amount) >= AMOUNT_EPSILON) {
      return false
    }

    // A null currency means "the account's currency", and the account already matched —
    // only an explicit, different currency disqualifies.
    const candidateCurrency = normalizeCurrencyOrNull(candidate.currency)
    return !candidateCurrency || !requestCurrency || candidateCurrency === requestCurrency
  })

  if (candidates.length === 0) {
    return null
  }

  const linkedRows = await db.query.emailImportItems.findMany({
    where: inArray(
      emailImportItems.transactionId,
      candidates.map((candidate) => candidate.id)
    ),
    columns: { transactionId: true },
  })
  const alreadyLinked = new Set(linkedRows.map((row) => row.transactionId))

  // Oldest first: when several transactions qualify, each successive email claims the
  // earliest one still unclaimed.
  const match = candidates.find((candidate) => !alreadyLinked.has(candidate.id))
  if (!match) {
    return null
  }

  const merchantName = match.merchantName ?? normalizeMerchantName(request.merchantName)
  const location = match.location ?? normalizeLocation(request.location)
  const needsEnrichment = merchantName !== match.merchantName || location !== match.location

  if (needsEnrichment || options?.withinTransaction) {
    runDbTransaction((tx) => {
      if (needsEnrichment) {
        tx.update(transactions).set({ merchantName, location, updatedAt: new Date() }).where(eq(transactions.id, match.id)).run()
      }

      options?.withinTransaction?.(tx, match.id)
    })
  }

  return { id: match.id }
}
