import { normalizeCurrencyOrNull, supportedCurrencies } from "@/lib/currency"
import { accountTypes, categoryTypes, transactionTypes } from "@/lib/db/schema"

type AccountType = (typeof accountTypes)[number]
type CategoryType = (typeof categoryTypes)[number]
type TransactionType = (typeof transactionTypes)[number]

export function normalizeTrimmed(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function normalizeDescription(value: string | null | undefined) {
  const normalized = normalizeTrimmed(value)

  if (normalized && normalized.length > 500) {
    throw new Error("Description must be 500 characters or fewer.")
  }

  return normalized
}

export function normalizeRequiredName(value: string, fieldName = "Name") {
  const normalized = normalizeTrimmed(value)

  if (!normalized) {
    throw new Error(`${fieldName} is required.`)
  }

  if (normalized.length > 200) {
    throw new Error(`${fieldName} must be 200 characters or fewer.`)
  }

  return normalized
}

export function normalizeColor(value: string) {
  const normalized = normalizeTrimmed(value)

  if (!normalized) {
    throw new Error("Color is required.")
  }

  if (!/^#?[0-9a-f]{6}$/i.test(normalized)) {
    throw new Error("Color must be a 6-digit hex value.")
  }

  return normalized.startsWith("#") ? normalized.toUpperCase() : `#${normalized.toUpperCase()}`
}

export function normalizeCategoryColor(value: string) {
  const normalized = normalizeTrimmed(value)

  if (!normalized) {
    throw new Error("Color is required.")
  }

  if (normalized.length > 20) {
    throw new Error("Color must be 20 characters or fewer.")
  }

  return normalized
}

export function normalizeIcon(value: string) {
  const normalized = normalizeTrimmed(value)

  if (!normalized) {
    throw new Error("Icon is required.")
  }

  if (normalized.length > 100) {
    throw new Error("Icon must be 100 characters or fewer.")
  }

  return normalized
}

export function normalizeNote(value: string | null | undefined) {
  const normalized = normalizeTrimmed(value)

  if (normalized && normalized.length > 500) {
    throw new Error("Note must be 500 characters or fewer.")
  }

  return normalized
}

export function normalizeMerchantName(value: string | null | undefined) {
  const normalized = normalizeTrimmed(value)

  if (normalized && normalized.length > 200) {
    throw new Error("Merchant name must be 200 characters or fewer.")
  }

  return normalized
}

export function normalizeLocation(value: string | null | undefined) {
  const normalized = normalizeTrimmed(value)

  if (normalized && normalized.length > 400) {
    throw new Error("Location must be 400 characters or fewer.")
  }

  return normalized
}

export function normalizeCountry(value: string | null | undefined) {
  const normalized = normalizeTrimmed(value)

  if (!normalized) {
    return null
  }

  if (normalized.length !== 2) {
    throw new Error("Country must be a 2-letter ISO code.")
  }

  return normalized.toUpperCase()
}

export function normalizeImageUrl(value: string | null | undefined) {
  const normalized = normalizeTrimmed(value)

  if (!normalized) {
    return null
  }

  if (normalized.length > 1000) {
    throw new Error("ImageUrl must be 1000 characters or fewer.")
  }

  try {
    // eslint-disable-next-line no-new
    new URL(normalized)
  } catch {
    throw new Error("ImageUrl must be a valid absolute URL.")
  }

  return normalized
}

export function normalizeAccountType(value: string): AccountType {
  if (!(accountTypes as readonly string[]).includes(value)) {
    throw new Error("Account type is invalid.")
  }

  return value as AccountType
}

export function normalizeCategoryType(value: string): CategoryType {
  if (!(categoryTypes as readonly string[]).includes(value)) {
    throw new Error("Category type is invalid.")
  }

  return value as CategoryType
}

export function normalizeTransactionType(value: string): TransactionType {
  if (!(transactionTypes as readonly string[]).includes(value)) {
    throw new Error("Transaction type is invalid.")
  }

  return value as TransactionType
}

export function normalizeSupportedCurrency(value: string | null | undefined, fieldName: string) {
  const normalized = normalizeCurrencyOrNull(value)

  if (!normalized) {
    throw new Error(`${fieldName} must be one of: ${supportedCurrencies.join(", ")}.`)
  }

  return normalized
}

export function normalizeOptionalSupportedCurrency(value: string | null | undefined) {
  if (!value || value.trim().length === 0) {
    return null
  }

  return normalizeSupportedCurrency(value, "Currency")
}
