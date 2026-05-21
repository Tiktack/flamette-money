import {
  normalizeCurrencyOrNull,
  supportedCurrencies,
} from "@/lib/currency"
import {
  accountTypes,
  categoryTypes,
  transactionTypes,
} from "@/lib/db/schema"

type AccountType = (typeof accountTypes)[number]
type CategoryType = (typeof categoryTypes)[number]
type TransactionType = (typeof transactionTypes)[number]

function fail(message: string): never {
  throw new Error(message)
}

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
    fail("Description must be 500 characters or fewer.")
  }

  return normalized
}

export function normalizeRequiredName(value: string, fieldName = "Name") {
  const normalized = normalizeTrimmed(value)

  if (!normalized) {
    fail(`${fieldName} is required.`)
  }

  if (normalized.length > 200) {
    fail(`${fieldName} must be 200 characters or fewer.`)
  }

  return normalized
}

export function normalizeColor(value: string) {
  const normalized = normalizeTrimmed(value)

  if (!normalized) {
    fail("Color is required.")
  }

  if (!/^#?[0-9a-f]{6}$/i.test(normalized)) {
    fail("Color must be a 6-digit hex value.")
  }

  return normalized.startsWith("#")
    ? normalized.toUpperCase()
    : `#${normalized.toUpperCase()}`
}

export function normalizeCategoryColor(value: string) {
  const normalized = normalizeTrimmed(value)

  if (!normalized) {
    fail("Color is required.")
  }

  if (normalized.length > 20) {
    fail("Color must be 20 characters or fewer.")
  }

  return normalized
}

export function normalizeIcon(value: string) {
  const normalized = normalizeTrimmed(value)

  if (!normalized) {
    fail("Icon is required.")
  }

  if (normalized.length > 100) {
    fail("Icon must be 100 characters or fewer.")
  }

  return normalized
}

export function normalizeNote(value: string | null | undefined) {
  const normalized = normalizeTrimmed(value)

  if (normalized && normalized.length > 500) {
    fail("Note must be 500 characters or fewer.")
  }

  return normalized
}

export function normalizeMerchantName(value: string | null | undefined) {
  const normalized = normalizeTrimmed(value)

  if (normalized && normalized.length > 200) {
    fail("Merchant name must be 200 characters or fewer.")
  }

  return normalized
}

export function normalizeLocation(value: string | null | undefined) {
  const normalized = normalizeTrimmed(value)

  if (normalized && normalized.length > 400) {
    fail("Location must be 400 characters or fewer.")
  }

  return normalized
}

export function normalizeCountry(value: string | null | undefined) {
  const normalized = normalizeTrimmed(value)

  if (!normalized) {
    return null
  }

  if (normalized.length !== 2) {
    fail("Country must be a 2-letter ISO code.")
  }

  return normalized.toUpperCase()
}

export function normalizeImageUrl(value: string | null | undefined) {
  const normalized = normalizeTrimmed(value)

  if (!normalized) {
    return null
  }

  if (normalized.length > 1000) {
    fail("ImageUrl must be 1000 characters or fewer.")
  }

  try {
    // eslint-disable-next-line no-new
    new URL(normalized)
  } catch {
    fail("ImageUrl must be a valid absolute URL.")
  }

  return normalized
}

export function normalizeAccountType(value: string): AccountType {
  if (!(accountTypes as readonly string[]).includes(value)) {
    fail("Account type is invalid.")
  }

  return value as AccountType
}

export function normalizeCategoryType(value: string): CategoryType {
  if (!(categoryTypes as readonly string[]).includes(value)) {
    fail("Category type is invalid.")
  }

  return value as CategoryType
}

export function normalizeTransactionType(value: string): TransactionType {
  if (!(transactionTypes as readonly string[]).includes(value)) {
    fail("Transaction type is invalid.")
  }

  return value as TransactionType
}

export function normalizeSupportedCurrency(
  value: string | null | undefined,
  fieldName: string
) {
  const normalized = normalizeCurrencyOrNull(value)

  if (!normalized) {
    fail(`${fieldName} must be one of: ${supportedCurrencies.join(", ")}.`)
  }

  return normalized
}

export function normalizeOptionalSupportedCurrency(
  value: string | null | undefined
) {
  if (!value || value.trim().length === 0) {
    return null
  }

  return normalizeSupportedCurrency(value, "Currency")
}
