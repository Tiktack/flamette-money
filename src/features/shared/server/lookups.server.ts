import { and, asc, eq } from "drizzle-orm"

import { ensureUserBootstrap } from "@/lib/bootstrap.server"
import { requireSessionData } from "@/lib/auth/session.server"
import { db } from "@/lib/db/client.server"
import { accounts, categories, transactionItems, transactions, trips, users } from "@/lib/db/schema"

export async function requireUser() {
  const session = await requireSessionData()
  await ensureUserBootstrap(session.user.id)
  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  })

  if (!user) {
    throw new Error("User was not found.")
  }

  return user
}

export async function requireAccount(userId: string, accountId: string) {
  const account = await db.query.accounts.findFirst({
    where: and(eq(accounts.userId, userId), eq(accounts.id, accountId)),
  })

  if (!account) {
    throw new Error("Account was not found.")
  }

  return account
}

export async function requireCategory(userId: string, categoryId: string) {
  const category = await db.query.categories.findFirst({
    where: and(eq(categories.userId, userId), eq(categories.id, categoryId)),
  })

  if (!category) {
    throw new Error("Category was not found.")
  }

  return category
}

export async function requireTrip(userId: string, tripId: string) {
  const trip = await db.query.trips.findFirst({
    where: and(eq(trips.userId, userId), eq(trips.id, tripId)),
  })

  if (!trip) {
    throw new Error("Trip was not found.")
  }

  return trip
}

export async function requireTransaction(userId: string, transactionId: string) {
  const transaction = await db.query.transactions.findFirst({
    where: and(eq(transactions.userId, userId), eq(transactions.id, transactionId)),
    with: {
      items: {
        orderBy: [asc(transactionItems.createdAt)],
      },
    },
  })

  if (!transaction) {
    throw new Error("Transaction was not found.")
  }

  return transaction
}
