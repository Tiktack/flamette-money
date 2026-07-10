import { normalizeCurrencyOrDefault, supportedCurrencies } from "@/lib/currency"
import { getExchangeRateApiKey, getExchangeRateCacheHours } from "@/lib/env.server"

type ExchangeRateSnapshot = {
  baseCurrency: string
  ratesToBase: Record<string, number>
  usedFallback: boolean
}

const fallbackUsdRates: Record<string, number> = {
  USD: 1,
  EUR: 1.08,
  GBP: 1.27,
  CAD: 0.74,
  PLN: 0.26,
}

const cache = new Map<string, { expiresAt: number; snapshot: ExchangeRateSnapshot }>()

function buildFallbackSnapshot(baseCurrency: string): ExchangeRateSnapshot {
  const normalizedBase = normalizeCurrencyOrDefault(baseCurrency, "USD")
  const baseToUsd = fallbackUsdRates[normalizedBase] ?? 1
  const ratesToBase: Record<string, number> = {
    [normalizedBase]: 1,
  }

  for (const currency of supportedCurrencies) {
    const currencyToUsd = fallbackUsdRates[currency]
    ratesToBase[currency] = currency === normalizedBase ? 1 : currencyToUsd / baseToUsd
  }

  return {
    baseCurrency: normalizedBase,
    ratesToBase,
    usedFallback: true,
  }
}

export async function getRatesToBase(baseCurrency: string) {
  const normalizedBase = normalizeCurrencyOrDefault(baseCurrency, "USD")
  const now = Date.now()
  const cached = cache.get(normalizedBase)

  if (cached && cached.expiresAt > now) {
    return cached.snapshot
  }

  const apiKey = getExchangeRateApiKey()
  const cacheHours = getExchangeRateCacheHours()
  const ttl = Math.max(1, Number.isNaN(cacheHours) ? 5 : cacheHours) * 60 * 60 * 1000

  if (!apiKey) {
    const snapshot = buildFallbackSnapshot(normalizedBase)
    cache.set(normalizedBase, { expiresAt: now + ttl, snapshot })
    return snapshot
  }

  try {
    const response = await fetch(`https://v6.exchangerate-api.com/v6/${apiKey}/latest/${normalizedBase}`, { method: "GET" })

    if (!response.ok) {
      throw new Error(`Exchange rate request failed with ${response.status}.`)
    }

    const payload = (await response.json()) as {
      result?: string
      conversion_rates?: Record<string, number>
    }

    if (payload.result !== "success" || !payload.conversion_rates) {
      throw new Error("Exchange rate payload was invalid.")
    }

    const ratesToBase: Record<string, number> = {
      [normalizedBase]: 1,
    }

    for (const currency of supportedCurrencies) {
      const conversionRate = payload.conversion_rates[currency]

      if (!conversionRate || conversionRate <= 0) {
        continue
      }

      ratesToBase[currency] = currency === normalizedBase ? 1 : 1 / conversionRate
    }

    const snapshot = {
      baseCurrency: normalizedBase,
      ratesToBase,
      usedFallback: false,
    }

    cache.set(normalizedBase, { expiresAt: now + ttl, snapshot })
    return snapshot
  } catch {
    // A transient API failure should not pin the hardcoded approximate rates for the full
    // TTL — retry soon while still absorbing short outages.
    const fallbackTtl = Math.min(ttl, 5 * 60 * 1000)
    const snapshot = buildFallbackSnapshot(normalizedBase)
    cache.set(normalizedBase, { expiresAt: now + fallbackTtl, snapshot })
    return snapshot
  }
}
