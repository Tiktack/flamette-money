import type { ReportBucketResponse, ReportInterval } from "@/features/shared/types"

type Bucket = {
  key: string
  label: string
  start: Date
  end: Date
}

const DAY_MS = 86_400_000

// Transaction dates are stored as UTC midnights, so report bucket math must stay in UTC.
export function asDateOnly(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()))
}

export function endOfDate(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), 23, 59, 59, 999))
}

export function addUtcDays(value: Date, days: number) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate() + days))
}

export function utcMonthStart(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1))
}

function monthKey(value: Date) {
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}`
}

function resolveAutoInterval(startDate: Date, endDate: Date, requested: ReportInterval | undefined, thresholds: { month: number; day: number }) {
  if (requested && requested !== "Auto") return requested

  const isSameMonth = startDate.getUTCFullYear() === endDate.getUTCFullYear() && startDate.getUTCMonth() === endDate.getUTCMonth()
  if (isSameMonth) return "Day" as const

  const monthSpan = (endDate.getUTCFullYear() - startDate.getUTCFullYear()) * 12 + endDate.getUTCMonth() - startDate.getUTCMonth()
  if (monthSpan > thresholds.month) return "Month" as const

  const daySpan = Math.floor((asDateOnly(endDate).getTime() - asDateOnly(startDate).getTime()) / DAY_MS) + 1
  return daySpan > thresholds.day ? ("Week" as const) : ("Day" as const)
}

export function resolveReportInterval(startDate: Date, endDate: Date, requested: ReportInterval | undefined) {
  return resolveAutoInterval(startDate, endDate, requested, { month: 3, day: 31 })
}

export function resolvePortfolioInterval(startDate: Date, endDate: Date, requested: ReportInterval | undefined) {
  return resolveAutoInterval(startDate, endDate, requested, { month: 6, day: 45 })
}

export function buildBuckets(startDate: Date, endDate: Date, interval: ReportInterval): ReportBucketResponse[] {
  if (interval === "None") return [{ key: "all", label: "All" }]

  const buckets: ReportBucketResponse[] = []
  if (interval === "Day") {
    const singleMonth = startDate.getUTCFullYear() === endDate.getUTCFullYear() && startDate.getUTCMonth() === endDate.getUTCMonth()
    for (let cursor = asDateOnly(startDate); cursor <= asDateOnly(endDate); cursor = addUtcDays(cursor, 1)) {
      const key = cursor.toISOString().slice(0, 10)
      const label = singleMonth ? String(cursor.getUTCDate()) : cursor.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
      buckets.push({ key, label })
    }
    return buckets
  }

  if (interval === "Week") {
    for (let cursor = asDateOnly(startDate); cursor <= asDateOnly(endDate); cursor = addUtcDays(cursor, 7)) {
      buckets.push({ key: cursor.toISOString().slice(0, 10), label: cursor.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }) })
    }
    return buckets
  }

  let cursor = utcMonthStart(startDate)
  const lastMonth = utcMonthStart(endDate)
  const showYear = cursor.getUTCFullYear() !== lastMonth.getUTCFullYear()
  while (cursor <= lastMonth) {
    buckets.push({
      key: monthKey(cursor),
      label: cursor.toLocaleDateString("en-US", { month: "short", year: showYear ? "2-digit" : undefined, timeZone: "UTC" }),
    })
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1))
  }
  return buckets
}

export function buildPortfolioBuckets(startDate: Date, endDate: Date, interval: ReportInterval): Bucket[] {
  if (interval === "None") return [{ key: "all", label: "All", start: asDateOnly(startDate), end: endOfDate(endDate) }]

  const buckets: Bucket[] = []
  if (interval === "Day") {
    for (let cursor = asDateOnly(startDate); cursor <= asDateOnly(endDate); cursor = addUtcDays(cursor, 1)) {
      buckets.push({
        key: cursor.toISOString().slice(0, 10),
        label: cursor.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }),
        start: cursor,
        end: endOfDate(cursor),
      })
    }
    return buckets
  }

  if (interval === "Week") {
    for (let cursor = asDateOnly(startDate); cursor <= asDateOnly(endDate); cursor = addUtcDays(cursor, 7)) {
      const bucketEnd = new Date(Math.min(endOfDate(addUtcDays(cursor, 6)).getTime(), endOfDate(endDate).getTime()))
      buckets.push({
        key: bucketEnd.toISOString().slice(0, 10),
        label: bucketEnd.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }),
        start: cursor,
        end: bucketEnd,
      })
    }
    return buckets
  }

  let cursor = utcMonthStart(startDate)
  const lastMonth = utcMonthStart(endDate)
  while (cursor <= lastMonth) {
    const rawMonthEnd = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0))
    const monthEnd = rawMonthEnd > asDateOnly(endDate) ? asDateOnly(endDate) : rawMonthEnd
    buckets.push({
      key: monthKey(cursor),
      label: cursor.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" }),
      start: cursor,
      end: endOfDate(monthEnd),
    })
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1))
  }
  return buckets
}

export function resolveBucketKey(startDate: Date, transactionDate: Date, interval: ReportInterval) {
  if (interval === "None") return "all"
  if (interval === "Day") return transactionDate.toISOString().slice(0, 10)
  if (interval === "Week") {
    const dayOffset = Math.floor((asDateOnly(transactionDate).getTime() - asDateOnly(startDate).getTime()) / DAY_MS)
    return addUtcDays(startDate, Math.floor(dayOffset / 7) * 7)
      .toISOString()
      .slice(0, 10)
  }
  return monthKey(transactionDate)
}
