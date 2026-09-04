import { and, asc, eq, or } from "drizzle-orm"

import { db } from "@/lib/db/client.server"
import { categories, transactions } from "@/lib/db/schema"

import { requireCategory, requireUser } from "@/features/shared/server/lookups.server"
import { normalizeCategoryColor, normalizeCategoryType, normalizeIcon, normalizeRequiredName } from "@/features/shared/server/normalizers.server"

import type { CategoryHierarchyResponse, CategoryResponse, CreateCategoryRequest, UpdateCategoryRequest } from "@/features/shared/types"

type CategoryRecord = typeof categories.$inferSelect

function mapCategoryTree(rows: CategoryRecord[], parentId: string | null): CategoryHierarchyResponse[] {
  return rows
    .filter((row) => (parentId === null ? row.parentId === null : row.parentId === parentId))
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((row) => ({
      id: row.id,
      name: row.name,
      color: row.color,
      icon: row.icon,
      type: row.type,
      parentId: row.parentId,
      subcategories: mapCategoryTree(rows, row.id),
    }))
}

export async function listCategoriesData(): Promise<CategoryHierarchyResponse[]> {
  const user = await requireUser()
  const rows = await db.query.categories.findMany({
    where: eq(categories.userId, user.id),
    orderBy: [asc(categories.name)],
  })

  return mapCategoryTree(rows, null)
}

export async function createCategoryData(request: CreateCategoryRequest): Promise<CategoryResponse> {
  const user = await requireUser()
  const name = normalizeRequiredName(request.name)
  const color = normalizeCategoryColor(request.color)
  const icon = normalizeIcon(request.icon)
  const type = normalizeCategoryType(request.type)
  const parentId = request.parentId
  const now = new Date()
  const id = crypto.randomUUID()

  if (parentId) {
    const parent = await requireCategory(user.id, parentId)

    if (parent.parentId) {
      throw new Error("Only one nesting level is allowed.")
    }

    if (parent.type !== type) {
      throw new Error("Subcategory type must match parent type.")
    }
  }

  await db.insert(categories).values({
    id,
    userId: user.id,
    name,
    color,
    icon,
    parentId,
    type,
    createdAt: now,
    updatedAt: now,
  })

  return {
    id,
    name,
    color,
    icon,
    type,
    parentId,
  }
}

export async function updateCategoryData(categoryId: string, request: UpdateCategoryRequest): Promise<CategoryResponse> {
  const user = await requireUser()
  const category = await requireCategory(user.id, categoryId)
  const name = normalizeRequiredName(request.name)
  const color = normalizeCategoryColor(request.color)
  const icon = normalizeIcon(request.icon)
  const parentId = request.parentId

  if (parentId === categoryId) {
    throw new Error("Category cannot be its own parent.")
  }

  if (parentId) {
    // Moving a parent that still has children would create a second nesting level, which
    // reports and imports assume cannot exist.
    const hasChildren = await db.query.categories.findFirst({
      where: and(eq(categories.userId, user.id), eq(categories.parentId, category.id)),
      columns: { id: true },
    })

    if (hasChildren) {
      throw new Error("A category with subcategories cannot become a subcategory.")
    }

    const parent = await requireCategory(user.id, parentId)

    if (parent.parentId) {
      throw new Error("Only one nesting level is allowed.")
    }

    if (parent.type !== category.type) {
      throw new Error("Parent category type must match.")
    }
  }

  await db
    .update(categories)
    .set({
      name,
      color,
      icon,
      parentId,
      updatedAt: new Date(),
    })
    .where(and(eq(categories.userId, user.id), eq(categories.id, category.id)))

  return {
    id: category.id,
    name,
    color,
    icon,
    type: category.type,
    parentId,
  }
}

export async function deleteCategoryData(categoryId: string) {
  const user = await requireUser()
  await requireCategory(user.id, categoryId)

  const hasTransactions = await db.query.transactions.findFirst({
    where: and(eq(transactions.userId, user.id), or(eq(transactions.categoryId, categoryId), eq(transactions.subCategoryId, categoryId))),
    columns: { id: true },
  })

  if (hasTransactions) {
    throw new Error("Category cannot be deleted because it is used by transactions.")
  }

  const hasChildren = await db.query.categories.findFirst({
    where: and(eq(categories.userId, user.id), eq(categories.parentId, categoryId)),
    columns: { id: true },
  })

  if (hasChildren) {
    throw new Error("Category cannot be deleted while it has subcategories.")
  }

  await db.delete(categories).where(and(eq(categories.userId, user.id), eq(categories.id, categoryId)))
}
