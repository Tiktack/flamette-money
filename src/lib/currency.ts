export const supportedCurrencies = ["PLN", "USD", "EUR", "GBP", "CAD"] as const

export function isSupportedCurrency(currency: string | null | undefined): currency is (typeof supportedCurrencies)[number] {
  if (!currency) {
    return false
  }

  return supportedCurrencies.includes(currency.trim().toUpperCase() as (typeof supportedCurrencies)[number])
}

export function normalizeCurrencyOrDefault(
  currency: string | null | undefined,
  fallback: string,
) {
  if (!currency) {
    return fallback
  }

  const normalized = currency.trim().toUpperCase()
  return isSupportedCurrency(normalized) ? normalized : fallback
}

export function normalizeCurrencyOrNull(currency: string | null | undefined) {
  if (!currency) {
    return null
  }

  const normalized = currency.trim().toUpperCase()
  return isSupportedCurrency(normalized) ? normalized : null
}
