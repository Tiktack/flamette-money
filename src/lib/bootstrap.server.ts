import { eq } from "drizzle-orm"

import { categorySeeds } from "@/lib/categories/category-seeds"
import { db, runDbTransaction } from "@/lib/db/client.server"
import { forEachChunkSync, SQLITE_INSERT_BATCH_SIZE } from "@/lib/db/sqlite-batch.server"
import { categories, users } from "@/lib/db/schema"

export async function ensureUserBootstrap(userId: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      id: true,
      bootstrapCompletedAt: true,
    },
  })

  if (!user) {
    throw new Error("User was not found.")
  }

  if (user.bootstrapCompletedAt) {
    return
  }

  const now = new Date()
  const idMap = new Map(categorySeeds.map((category) => [category.id, crypto.randomUUID()]))
  const categoryValues = categorySeeds.map((category) => ({
    ...category,
    id: idMap.get(category.id) ?? crypto.randomUUID(),
    parentId: category.parentId ? (idMap.get(category.parentId) ?? null) : null,
    userId,
  }))

  runDbTransaction((tx) => {
    // Re-check inside the transaction so two concurrent first requests can't double-seed.
    const freshUser = tx.select({ bootstrapCompletedAt: users.bootstrapCompletedAt }).from(users).where(eq(users.id, userId)).get()

    if (!freshUser) {
      throw new Error("User was not found.")
    }

    if (freshUser.bootstrapCompletedAt) {
      return
    }

    forEachChunkSync(categoryValues, SQLITE_INSERT_BATCH_SIZE, (chunk) => {
      tx.insert(categories).values(chunk).run()
    })

    tx.update(users)
      .set({
        bootstrapCompletedAt: now,
        updatedAt: now,
      })
      .where(eq(users.id, userId))
      .run()
  })
}
