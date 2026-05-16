import { normalizeCurrencyOrDefault, supportedCurrencies } from "@/lib/currency"

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

const cache = new Map<
  string,
  { expiresAt: number; snapshot: ExchangeRateSnapshot }
>()

function buildFallbackSnapshot(baseCurrency: string): ExchangeRateSnapshot {
  const normalizedBase = normalizeCurrencyOrDefault(baseCurrency, "USD")
  const baseToUsd = fallbackUsdRates[normalizedBase] ?? 1
  const ratesToBase: Record<string, number> = {
    [normalizedBase]: 1,
  }

  for (const currency of supportedCurrencies) {
    const currencyToUsd = fallbackUsdRates[currency]
    ratesToBase[currency] =
      currency === normalizedBase ? 1 : currencyToUsd / baseToUsd
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

  const apiKey = process.env.EXCHANGE_RATE_API_KEY?.trim()
  const cacheHours = Number.parseInt(
    process.env.EXCHANGE_RATE_CACHE_HOURS ?? "5",
    10
  )
  const ttl =
    Math.max(1, Number.isNaN(cacheHours) ? 5 : cacheHours) * 60 * 60 * 1000

  if (!apiKey) {
    const snapshot = buildFallbackSnapshot(normalizedBase)
    cache.set(normalizedBase, { expiresAt: now + ttl, snapshot })
    return snapshot
  }

  try {
    const response = await fetch(
      `https://v6.exchangerate-api.com/v6/${apiKey}/latest/${normalizedBase}`,
      { method: "GET" }
    )

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

      ratesToBase[currency] =
        currency === normalizedBase ? 1 : 1 / conversionRate
    }

    const snapshot = {
      baseCurrency: normalizedBase,
      ratesToBase,
      usedFallback: false,
    }

    cache.set(normalizedBase, { expiresAt: now + ttl, snapshot })
    return snapshot
  } catch {
    const snapshot = buildFallbackSnapshot(normalizedBase)
    cache.set(normalizedBase, { expiresAt: now + ttl, snapshot })
    return snapshot
  }
}
