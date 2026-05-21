import { and, eq, inArray, isNotNull, isNull } from "drizzle-orm"

import { db } from "@/lib/db/client.server"
import { forEachChunkSync, SQLITE_IN_CLAUSE_BATCH_SIZE } from "@/lib/db/sqlite-batch.server"
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

  return db.transaction((tx) => {
    const userTransactions = tx.query.transactions
      .findMany({
        where: eq(transactions.userId, user.id),
        columns: { id: true },
      })
      .sync()

    const transactionIds = userTransactions.map((item) => item.id)

    tx.update(transactions)
      .set({
        originalTransactionId: null,
        relatedTransactionId: null,
      })
      .where(eq(transactions.userId, user.id))
      .run()

    let deletedTransactionItems = 0

    if (transactionIds.length > 0) {
      const transactionItemsForUser: Array<{ id: string }> = []

      forEachChunkSync(transactionIds, SQLITE_IN_CLAUSE_BATCH_SIZE, (chunk) => {
        const items = tx.query.transactionItems
          .findMany({
            where: inArray(transactionItems.transactionId, chunk),
            columns: { id: true },
          })
          .sync()

        transactionItemsForUser.push(...items)
      })

      deletedTransactionItems = transactionItemsForUser.length

      forEachChunkSync(transactionIds, SQLITE_IN_CLAUSE_BATCH_SIZE, (chunk) => {
        tx.delete(transactionItems).where(inArray(transactionItems.transactionId, chunk)).run()
      })

      tx.delete(transactions).where(eq(transactions.userId, user.id)).run()
    }

    const childCategories = tx.query.categories
      .findMany({
        where: and(eq(categories.userId, user.id), isNotNull(categories.parentId)),
        columns: { id: true },
      })
      .sync()
    const parentCategories = tx.query.categories
      .findMany({
        where: and(eq(categories.userId, user.id), isNull(categories.parentId)),
        columns: { id: true },
      })
      .sync()
    const tripsForUser = tx.query.trips
      .findMany({
        where: eq(trips.userId, user.id),
        columns: { id: true },
      })
      .sync()
    const accountsForUser = tx.query.accounts
      .findMany({
        where: eq(accounts.userId, user.id),
        columns: { id: true },
      })
      .sync()

    tx.delete(trips).where(eq(trips.userId, user.id)).run()
    tx.delete(categories)
      .where(and(eq(categories.userId, user.id), isNotNull(categories.parentId)))
      .run()
    tx.delete(categories)
      .where(and(eq(categories.userId, user.id), isNull(categories.parentId)))
      .run()
    tx.delete(accounts).where(eq(accounts.userId, user.id)).run()

    return {
      deletedTransactions: userTransactions.length,
      deletedCategories: childCategories.length + parentCategories.length,
      deletedAccounts: accountsForUser.length,
      deletedTrips: tripsForUser.length,
      deletedTransactionItems,
    }
  })
}
