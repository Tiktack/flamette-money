import { eq } from "drizzle-orm"

import { categorySeeds } from "@/lib/categories/category-seeds"
import { db, runWithDb } from "@/lib/db/client.server"
import { forEachChunk, SQLITE_INSERT_BATCH_SIZE } from "@/lib/db/sqlite-batch.server"
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

  await runWithDb(async (database) => {
    const freshUser = await database.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        id: true,
        bootstrapCompletedAt: true,
      },
    })

    if (!freshUser) {
      throw new Error("User was not found.")
    }

    if (freshUser.bootstrapCompletedAt) {
      return
    }

    await forEachChunk(categoryValues, SQLITE_INSERT_BATCH_SIZE, async (chunk) => {
      await database.insert(categories).values(chunk)
    })

    await database
      .update(users)
      .set({
        bootstrapCompletedAt: now,
        updatedAt: now,
      })
      .where(eq(users.id, userId))
  })
}
