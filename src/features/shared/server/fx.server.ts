import { eq } from "drizzle-orm"

import { normalizeCurrencyOrDefault } from "@/lib/currency"
import { db } from "@/lib/db/client.server"
import { accounts } from "@/lib/db/schema"

export function convertAmountToBase(amount: number, sourceCurrency: string | null | undefined, baseCurrency: string, ratesToBase: Record<string, number>) {
  if (amount === 0) {
    return 0
  }

  const normalizedSource = normalizeCurrencyOrDefault(sourceCurrency, baseCurrency)
  return amount * (ratesToBase[normalizedSource] ?? 1)
}

/** Account id → account currency, used to resolve a transaction's effective currency. */
export async function loadAccountCurrencyMap(userId: string) {
  const rows = await db.select({ id: accounts.id, currency: accounts.currency }).from(accounts).where(eq(accounts.userId, userId))
  return new Map<string, string | null>(rows.map((row) => [row.id, row.currency]))
}

export function resolveTransactionCurrency(
  transaction: { currency: string | null; accountId: string },
  accountCurrencyById: Map<string, string | null>,
  baseCurrency: string
) {
  return normalizeCurrencyOrDefault(transaction.currency ?? accountCurrencyById.get(transaction.accountId), baseCurrency)
}
