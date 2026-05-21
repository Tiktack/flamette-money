import type {
  TransactionListItem,
  TransactionType,
} from "@/features/transactions/types"
import type { CategoryHierarchy } from "@/features/categories/types"

export const DEFAULT_ACCOUNT_COLOR = "#B9A88A"
export const DEFAULT_CATEGORY_COLOR = "#D96B4F"

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function toNumber(value: number | string | null | undefined) {
  if (typeof value === "number") {
    return value
  }

  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

export function normalizeHexColor(
  value?: string | null,
  fallback = DEFAULT_ACCOUNT_COLOR
) {
  if (!value) {
    return fallback
  }

  return value.startsWith("#") ? value : `#${value}`
}

export function formatCurrency(
  value: number | string | null | undefined,
  currency = "USD",
  minimumFractionDigits = 0
) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    minimumFractionDigits,
    maximumFractionDigits: 2,
  }).format(toNumber(value))
}

export function formatDateInput(value: Date) {
  return value.toISOString().slice(0, 10)
}

export function formatDateLabel(value?: string | null) {
  if (!value) {
    return "-"
  }

  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export function formatMonthLabel(value: string) {
  const date = new Date(`${value}T00:00:00`)
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
  })
}

export function formatShortMonth(value: string) {
  const date = new Date(`${value}T00:00:00`)
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })
}

export function initials(value: string) {
  return (
    value
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((segment) => segment[0]?.toUpperCase() ?? "")
      .join("") || "FM"
  )
}

export function buildSeed(value: string) {
  let hash = 0

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0
  }

  return Math.abs(hash)
}

export function buildTrendSeries(seed: number, points = 12) {
  const values: Array<{ index: number; value: number }> = []
  let next = seed || 1
  let current = (seed % 40) + 30

  for (let index = 0; index < points; index += 1) {
    next = (next * 9301 + 49297) % 233280
    const delta = (next / 233280 - 0.5) * 12
    current = Math.max(6, current + delta)
    values.push({ index, value: Number(current.toFixed(2)) })
  }

  return values
}

export function transactionTone(type: TransactionType, isRefund?: boolean) {
  if (isRefund || type === "Refund") {
    return "text-foreground"
  }

  if (type === "Income") {
    return "text-emerald-600"
  }

  if (type === "Expense") {
    return "text-rose-600"
  }

  if (type === "Transfer") {
    return "text-amber-600"
  }

  return "text-foreground"
}

export function getCategoryLabel(
  transaction: TransactionListItem,
  categoryMap: Map<string, CategoryHierarchy>
) {
  if (transaction.type === "Transfer") {
    return "Transfer"
  }

  const categoryId = transaction.subCategoryId ?? transaction.categoryId
  if (!categoryId) {
    return "-"
  }

  const category = categoryMap.get(categoryId)
  if (!category) {
    return "-"
  }

  if (transaction.subCategoryId && category.parentId) {
    const parent = categoryMap.get(category.parentId)
    if (parent) {
      return `${parent.name} / ${category.name}`
    }
  }

  return category.name
}
