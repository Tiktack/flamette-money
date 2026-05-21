export function formatCompactNumber(value: number | string | null | undefined) {
  const num = Number(value ?? 0)
  try {
    return new Intl.NumberFormat(undefined, {
      notation: "compact",
      compactDisplay: "short",
      maximumFractionDigits: 0,
    })
      .format(num)
      .toLowerCase()
  } catch {
    // Fallback for environments without compact notation
    const abs = Math.abs(num)
    if (abs >= 1_000_000) return `${Math.round(num / 1_000_000)}m`
    if (abs >= 1_000) return `${Math.round(num / 1_000)}k`
    return String(Math.round(num))
  }
}

export type TimeSeriesAxisInterval = "Auto" | "None" | "Day" | "Week" | "Month"

const dayFormatter = new Intl.DateTimeFormat(undefined, { day: "numeric" })
const monthFormatter = new Intl.DateTimeFormat(undefined, { month: "short" })
const monthDayFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
})
const yearFormatter = new Intl.DateTimeFormat(undefined, { year: "2-digit" })

export function formatTimeSeriesAxisLabel(options: {
  interval: TimeSeriesAxisInterval | undefined
  rangeStart: Date | null
  rangeEnd: Date | null
  bucketStart: Date
}) {
  const { interval, rangeStart, rangeEnd, bucketStart } = options
  const isSameMonth =
    rangeStart !== null && rangeEnd !== null && rangeStart.getFullYear() === rangeEnd.getFullYear() && rangeStart.getMonth() === rangeEnd.getMonth()
  const isSameYear = rangeStart !== null && rangeEnd !== null && rangeStart.getFullYear() === rangeEnd.getFullYear()

  if (interval === "Month") {
    return isSameYear ? monthFormatter.format(bucketStart) : `${monthFormatter.format(bucketStart)}, ${yearFormatter.format(bucketStart)}`
  }

  if (interval === "Day" || interval === "Week") {
    if (isSameMonth) {
      return dayFormatter.format(bucketStart)
    }

    if (isSameYear) {
      return monthDayFormatter.format(bucketStart)
    }

    return `${monthDayFormatter.format(bucketStart)}, ${yearFormatter.format(bucketStart)}`
  }

  return monthDayFormatter.format(bucketStart)
}

export function computeNiceDomainTicks(
  values: number[],
  options?: { tickCount?: number; paddingFraction?: number }
): { domain: [number, number] | undefined; ticks?: number[] } {
  const tickCount = options?.tickCount ?? 4
  const paddingFraction = options?.paddingFraction ?? 0.08
  const cleaned = (values || []).filter((v) => typeof v === "number" && !Number.isNaN(v) && isFinite(v))

  if (cleaned.length === 0) {
    return { domain: undefined, ticks: undefined }
  }

  const min = Math.min(...cleaned)
  const max = Math.max(...cleaned)

  if (min === max) {
    const val = min
    const delta = Math.abs(val) * 0.05 || 1
    const niceMin = val - delta
    const niceMax = val + delta
    const range = niceMax - niceMin
    const spacing = niceNum(range / (tickCount - 1 || 1), true)
    const ticks: number[] = []
    for (let t = niceMin; t <= niceMax + spacing / 2; t = Number((t + spacing).toFixed(12))) {
      ticks.push(Number(t.toPrecision(15)))
    }

    return { domain: [niceMin, niceMax], ticks }
  }

  const range = max - min
  const padding = range * paddingFraction
  const minP = min - padding
  const maxP = max + padding
  const spacing = niceNum(range / (tickCount - 1 || 1), true)
  const niceMin = Math.floor(minP / spacing) * spacing
  const niceMax = Math.ceil(maxP / spacing) * spacing
  const ticks: number[] = []
  for (let t = niceMin; t <= niceMax + spacing / 2; t = Number((t + spacing).toFixed(12))) {
    ticks.push(Number(t.toPrecision(15)))
  }

  return { domain: [niceMin, niceMax], ticks }
}

export function niceNum(range: number, round: boolean) {
  const exponent = Math.floor(Math.log10(range))
  const fraction = range / Math.pow(10, exponent)
  let niceFraction: number
  if (round) {
    if (fraction < 1.5) niceFraction = 1
    else if (fraction < 3) niceFraction = 2
    else if (fraction < 3.75) niceFraction = 2.5
    else if (fraction < 7.5) niceFraction = 5
    else niceFraction = 10
  } else {
    if (fraction <= 1) niceFraction = 1
    else if (fraction <= 2) niceFraction = 2
    else if (fraction <= 2.5) niceFraction = 2.5
    else if (fraction <= 5) niceFraction = 5
    else niceFraction = 10
  }

  return niceFraction * Math.pow(10, exponent)
}
