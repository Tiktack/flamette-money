import { and, count, eq, isNotNull, isNull } from "drizzle-orm"

import { db, runWithDb } from "@/lib/db/client.server"
import { accounts, categories, transactionItems, transactions, trips, users } from "@/lib/db/schema"

import { requireUser } from "@/features/shared/server/lookups.server"
import { normalizeSupportedCurrency } from "@/features/shared/server/normalizers.server"

import type { ResetUserDataResponse, UserSettingsResponse } from "@/features/shared/types"

export async function getSettingsData(): Promise<UserSettingsResponse> {
  const user = await requireUser()

  return {
    baseCurrency: user.baseCurrency,
  }
}

export async function updateSettingsData(request: { baseCurrency: string }): Promise<UserSettingsResponse> {
  const user = await requireUser()
  const baseCurrency = normalizeSupportedCurrency(request.baseCurrency, "BaseCurrency")
  const now = new Date()

  await db
    .update(users)
    .set({
      baseCurrency,
      updatedAt: now,
    })
    .where(eq(users.id, user.id))

  return {
    baseCurrency,
  }
}

export async function resetUserData(): Promise<ResetUserDataResponse> {
  const user = await requireUser()

  return runWithDb(async (database) => {
    const [
      [{ deletedTransactions }],
      [{ deletedTransactionItems }],
      [{ deletedChildCategories }],
      [{ deletedParentCategories }],
      [{ deletedTrips }],
      [{ deletedAccounts }],
    ] = await Promise.all([
      database.select({ deletedTransactions: count() }).from(transactions).where(eq(transactions.userId, user.id)),
      database
        .select({ deletedTransactionItems: count() })
        .from(transactionItems)
        .innerJoin(transactions, eq(transactionItems.transactionId, transactions.id))
        .where(eq(transactions.userId, user.id)),
      database
        .select({ deletedChildCategories: count() })
        .from(categories)
        .where(and(eq(categories.userId, user.id), isNotNull(categories.parentId))),
      database
        .select({ deletedParentCategories: count() })
        .from(categories)
        .where(and(eq(categories.userId, user.id), isNull(categories.parentId))),
      database.select({ deletedTrips: count() }).from(trips).where(eq(trips.userId, user.id)),
      database.select({ deletedAccounts: count() }).from(accounts).where(eq(accounts.userId, user.id)),
    ])

    if (deletedTransactions > 0) {
      await database.update(transactions)
        .set({
          originalTransactionId: null,
          relatedTransactionId: null,
        })
        .where(eq(transactions.userId, user.id))

      // transaction_items.transaction_id uses ON DELETE CASCADE, so removing
      // the user's transactions also clears their items without chunked deletes.
      await database.delete(transactions).where(eq(transactions.userId, user.id))
    }


    await database.delete(trips).where(eq(trips.userId, user.id))
    await database.delete(categories)
      .where(and(eq(categories.userId, user.id), isNotNull(categories.parentId)))
    await database.delete(categories)
      .where(and(eq(categories.userId, user.id), isNull(categories.parentId)))
    await database.delete(accounts).where(eq(accounts.userId, user.id))

    return {
      deletedTransactions,
      deletedCategories: deletedChildCategories + deletedParentCategories,
      deletedAccounts,
      deletedTrips,
      deletedTransactionItems,
    }
  })
}
