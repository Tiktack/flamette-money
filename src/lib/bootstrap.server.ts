import { count, eq } from "drizzle-orm"

import { categorySeeds } from "@/lib/categories/category-seeds"
import { db } from "@/lib/db/client.server"
import { forEachChunk, SQLITE_INSERT_BATCH_SIZE } from "@/lib/db/sqlite-batch.server"
import { categories } from "@/lib/db/schema"

export async function ensureUserBootstrap(userId: string) {
  const existing = await db.select({ value: count() }).from(categories).where(eq(categories.userId, userId))

  if ((existing[0]?.value ?? 0) > 0) {
    return
  }

  const idMap = new Map(categorySeeds.map((category) => [category.id, crypto.randomUUID()]))
  const categoryValues = categorySeeds.map((category) => ({
    ...category,
    id: idMap.get(category.id) ?? crypto.randomUUID(),
    parentId: category.parentId ? (idMap.get(category.parentId) ?? null) : null,
    userId,
  }))

  await forEachChunk(categoryValues, SQLITE_INSERT_BATCH_SIZE, async (chunk) => {
    await db.insert(categories).values(chunk)
  })
}
