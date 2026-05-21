import { and, asc, eq } from "drizzle-orm"

import { db } from "@/lib/db/client.server"
import { categories, transactions } from "@/lib/db/schema"

import {
  requireCategory,
  requireUser,
} from "@/features/shared/server/lookups.server"
import {
  normalizeCategoryColor,
  normalizeCategoryType,
  normalizeIcon,
  normalizeRequiredName,
} from "@/features/shared/server/normalizers.server"

import type {
  CategoryHierarchyResponse,
  CreateCategoryRequest,
  CreateCategoryResponse,
  UpdateCategoryRequest,
  UpdateCategoryResponse,
} from "@/features/shared/types"

type CategoryRecord = typeof categories.$inferSelect

function fail(message: string): never {
  throw new Error(message)
}

function mapCategoryTree(
  rows: CategoryRecord[],
  parentId: string | null
): CategoryHierarchyResponse[] {
  return rows
    .filter((row) =>
      parentId === null ? row.parentId === null : row.parentId === parentId
    )
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

export async function listCategoriesData(): Promise<
  CategoryHierarchyResponse[]
> {
  const user = await requireUser()
  const rows = await db.query.categories.findMany({
    where: eq(categories.userId, user.id),
    orderBy: [asc(categories.name)],
  })

  return mapCategoryTree(rows, null)
}

export async function createCategoryData(
  request: CreateCategoryRequest
): Promise<CreateCategoryResponse> {
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
      fail("Only one nesting level is allowed.")
    }

    if (parent.type !== type) {
      fail("Subcategory type must match parent type.")
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

export async function updateCategoryData(
  categoryId: string,
  request: UpdateCategoryRequest
): Promise<UpdateCategoryResponse> {
  const user = await requireUser()
  const category = await requireCategory(user.id, categoryId)
  const name = normalizeRequiredName(request.name)
  const color = normalizeCategoryColor(request.color)
  const icon = normalizeIcon(request.icon)
  const parentId = request.parentId

  if (parentId === categoryId) {
    fail("Category cannot be its own parent.")
  }

  if (parentId) {
    const parent = await requireCategory(user.id, parentId)

    if (parent.parentId) {
      fail("Only one nesting level is allowed.")
    }

    if (parent.type !== category.type) {
      fail("Parent category type must match.")
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
    where: and(
      eq(transactions.userId, user.id),
      eq(transactions.categoryId, categoryId)
    ),
    columns: { id: true },
  })
  const hasSubcategoryTransactions = await db.query.transactions.findFirst({
    where: and(
      eq(transactions.userId, user.id),
      eq(transactions.subCategoryId, categoryId)
    ),
    columns: { id: true },
  })

  if (hasTransactions || hasSubcategoryTransactions) {
    fail("Category cannot be deleted because it is used by transactions.")
  }

  await db
    .delete(categories)
    .where(and(eq(categories.userId, user.id), eq(categories.id, categoryId)))
}
