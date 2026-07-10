import { format, parseISO } from "date-fns"

import { formatDateInput } from "@/lib/finance"

/**
 * State + pure resolver for the analytics Compare page. Mirrors the shape of
 * `sharedDateRangeFilters` but resolves *two* periods (A vs B) instead of one.
 * Kept framework-free so the page can hold it in local React state.
 */

export type CompareGranularity = "month" | "year" | "custom"
export type MonthCompareMode = "previousMonth" | "sameMonthLastYear"

export type ComparePeriodsState = {
  granularity: CompareGranularity
  /** YYYY-MM-01 anchor for the primary month (period A) in month mode. */
  monthAnchor: string
  monthCompareMode: MonthCompareMode
  /** Primary year (period A) in year mode; B is the preceding year. */
  yearAnchor: number
  // Custom mode — explicit YYYY-MM-DD ranges for each period.
  customAStart: string
  customAEnd: string
  customBStart: string
  customBEnd: string
}

export type ResolvedPeriod = {
  start: Date
  end: Date
  label: string
}

export type ResolvedComparison = {
  a: ResolvedPeriod
  b: ResolvedPeriod
}

const toDateInput = formatDateInput

const parseAnchor = (value: string) => (value ? new Date(`${value}T00:00:00`) : new Date())

const endOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)

/** Parse a YYYY-MM-DD input value, treating the empty string as "unset". */
export const toDateOrUndefined = (value: string) => (value ? parseISO(value) : undefined)

/** Human-readable label for a (possibly open-ended) date range. Shared by the analytics toolbars. */
export function formatRangeLabel(start: Date | null, end: Date | null) {
  if (!start && !end) {
    return "All time"
  }

  if (start && end) {
    return `${format(start, "LLL dd, y")} - ${format(end, "LLL dd, y")}`
  }

  if (start) {
    return format(start, "LLL dd, y")
  }

  return end ? format(end, "LLL dd, y") : "Pick a date"
}

export function defaultComparePeriodsState(now: Date = new Date()): ComparePeriodsState {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const aEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const bStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const bEnd = new Date(now.getFullYear(), now.getMonth(), 0)

  return {
    granularity: "month",
    monthAnchor: toDateInput(monthStart),
    monthCompareMode: "previousMonth",
    yearAnchor: now.getFullYear(),
    customAStart: toDateInput(monthStart),
    customAEnd: toDateInput(aEnd),
    customBStart: toDateInput(bStart),
    customBEnd: toDateInput(bEnd),
  }
}

export function shiftMonthAnchor(value: string, delta: number): string {
  const anchor = parseAnchor(value)
  return toDateInput(new Date(anchor.getFullYear(), anchor.getMonth() + delta, 1))
}

export function resolveComparePeriods(state: ComparePeriodsState): ResolvedComparison {
  if (state.granularity === "year") {
    const aStart = new Date(state.yearAnchor, 0, 1)
    const aEnd = new Date(state.yearAnchor, 11, 31, 23, 59, 59, 999)
    const bStart = new Date(state.yearAnchor - 1, 0, 1)
    const bEnd = new Date(state.yearAnchor - 1, 11, 31, 23, 59, 59, 999)

    return {
      a: { start: aStart, end: aEnd, label: String(state.yearAnchor) },
      b: { start: bStart, end: bEnd, label: String(state.yearAnchor - 1) },
    }
  }

  if (state.granularity === "custom") {
    const aStart = parseAnchor(state.customAStart)
    const aEnd = state.customAEnd ? endOfDay(new Date(`${state.customAEnd}T00:00:00`)) : endOfDay(aStart)
    const bStart = parseAnchor(state.customBStart)
    const bEnd = state.customBEnd ? endOfDay(new Date(`${state.customBEnd}T00:00:00`)) : endOfDay(bStart)

    return {
      a: { start: aStart, end: aEnd, label: formatRangeLabel(aStart, aEnd) },
      b: { start: bStart, end: bEnd, label: formatRangeLabel(bStart, bEnd) },
    }
  }

  const anchor = parseAnchor(state.monthAnchor)
  const aStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const aEnd = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0, 23, 59, 59, 999)
  const monthsBack = state.monthCompareMode === "sameMonthLastYear" ? 12 : 1
  const bAnchor = new Date(anchor.getFullYear(), anchor.getMonth() - monthsBack, 1)
  const bStart = new Date(bAnchor.getFullYear(), bAnchor.getMonth(), 1)
  const bEnd = new Date(bAnchor.getFullYear(), bAnchor.getMonth() + 1, 0, 23, 59, 59, 999)

  return {
    a: { start: aStart, end: aEnd, label: format(aStart, "LLLL yyyy") },
    b: { start: bStart, end: bEnd, label: format(bStart, "LLLL yyyy") },
  }
}
