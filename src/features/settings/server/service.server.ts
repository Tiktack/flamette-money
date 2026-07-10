import { and, count, eq, isNotNull, isNull } from "drizzle-orm"

import { ensureUserBootstrap } from "@/lib/bootstrap.server"
import { db, runDbTransaction } from "@/lib/db/client.server"
import { accounts, categories, transactionItems, transactions, trips, users } from "@/lib/db/schema"

import { requireUser } from "@/features/shared/server/lookups.server"
import { normalizeSupportedCurrency } from "@/features/shared/server/normalizers.server"
import { clearUserScopedData } from "@/features/shared/server/user-data.server"

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

  const result = runDbTransaction((tx) => {
    const [{ deletedTransactions }] = tx.select({ deletedTransactions: count() }).from(transactions).where(eq(transactions.userId, user.id)).all()
    const [{ deletedTransactionItems }] = tx
      .select({ deletedTransactionItems: count() })
      .from(transactionItems)
      .innerJoin(transactions, eq(transactionItems.transactionId, transactions.id))
      .where(eq(transactions.userId, user.id))
      .all()
    const [{ deletedChildCategories }] = tx
      .select({ deletedChildCategories: count() })
      .from(categories)
      .where(and(eq(categories.userId, user.id), isNotNull(categories.parentId)))
      .all()
    const [{ deletedParentCategories }] = tx
      .select({ deletedParentCategories: count() })
      .from(categories)
      .where(and(eq(categories.userId, user.id), isNull(categories.parentId)))
      .all()
    const [{ deletedTrips }] = tx.select({ deletedTrips: count() }).from(trips).where(eq(trips.userId, user.id)).all()
    const [{ deletedAccounts }] = tx.select({ deletedAccounts: count() }).from(accounts).where(eq(accounts.userId, user.id)).all()

    clearUserScopedData(tx, user.id)

    tx.update(users)
      .set({
        bootstrapCompletedAt: null,
      })
      .where(eq(users.id, user.id))
      .run()

    return {
      deletedTransactions,
      deletedCategories: deletedChildCategories + deletedParentCategories,
      deletedAccounts,
      deletedTrips,
      deletedTransactionItems,
    }
  })

  await ensureUserBootstrap(user.id)
  return result
}
