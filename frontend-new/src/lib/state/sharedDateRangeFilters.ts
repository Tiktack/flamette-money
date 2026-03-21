import { create } from 'zustand'

export type DateRangePreset = 'month' | 'year' | 'all' | 'custom'

export type SharedDateRangeState = {
  preset: DateRangePreset
  monthAnchor: string
  yearAnchor: number
  customStartDate: string
  customEndDate: string
  setPreset: (preset: DateRangePreset) => void
  setMonthAnchor: (value: string) => void
  shiftMonth: (delta: number) => void
  setYearAnchor: (value: number) => void
  shiftYear: (delta: number) => void
  setCustomStartDate: (value: string) => void
  setCustomEndDate: (value: string) => void
  shiftCustomRange: (delta: number) => void
}

const formatDateInput = (value: Date) => {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const formatMonthAnchor = (value: Date) => {
  const monthStart = new Date(value.getFullYear(), value.getMonth(), 1)
  return formatDateInput(monthStart)
}

const parseDateInput = (value: string) => {
  return value ? new Date(`${value}T00:00:00`) : null
}

const getCurrentMonthRange = () => {
  const today = new Date()
  const start = new Date(today.getFullYear(), today.getMonth(), 1)
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)

  return {
    start: formatDateInput(start),
    end: formatDateInput(end),
  }
}

const getCurrentYearRange = () => {
  const today = new Date()
  const start = new Date(today.getFullYear(), 0, 1)
  const end = new Date(today.getFullYear(), 11, 31)

  return {
    start: formatDateInput(start),
    end: formatDateInput(end),
  }
}

const buildDefaultState = (): Omit<
  SharedDateRangeState,
  | 'setPreset'
  | 'setMonthAnchor'
  | 'shiftMonth'
  | 'setYearAnchor'
  | 'shiftYear'
  | 'setCustomStartDate'
  | 'setCustomEndDate'
  | 'shiftCustomRange'
> => {
  const monthRange = getCurrentMonthRange()
  const now = new Date()

  return {
    preset: 'month',
    monthAnchor: formatMonthAnchor(now),
    yearAnchor: now.getFullYear(),
    customStartDate: monthRange.start,
    customEndDate: monthRange.end,
  }
}

export const useSharedDateRangeFilters = create<SharedDateRangeState>((set) => ({
  ...buildDefaultState(),
  setPreset: (preset) =>
    set((state) => {
      const now = new Date()
      if (preset === 'month') {
        const monthRange = getCurrentMonthRange()
        return {
          ...state,
          preset,
          monthAnchor: state.monthAnchor || formatMonthAnchor(now),
          customStartDate: monthRange.start,
          customEndDate: monthRange.end,
        }
      }

      if (preset === 'year') {
        const yearRange = getCurrentYearRange()
        return {
          ...state,
          preset,
          yearAnchor: state.yearAnchor || now.getFullYear(),
          customStartDate: yearRange.start,
          customEndDate: yearRange.end,
        }
      }

      return {
        ...state,
        preset,
      }
    }),
  setMonthAnchor: (value) => set((state) => ({ ...state, monthAnchor: value })),
  shiftMonth: (delta) =>
    set((state) => {
      const current = state.monthAnchor ? new Date(`${state.monthAnchor}T00:00:00`) : new Date()
      const next = new Date(current.getFullYear(), current.getMonth() + delta, 1)
      return {
        ...state,
        monthAnchor: formatMonthAnchor(next),
      }
    }),
  setYearAnchor: (value) => set((state) => ({ ...state, yearAnchor: value })),
  shiftYear: (delta) =>
    set((state) => ({
      ...state,
      yearAnchor: state.yearAnchor + delta,
    })),
  setCustomStartDate: (value) => set((state) => ({ ...state, customStartDate: value })),
  setCustomEndDate: (value) => set((state) => ({ ...state, customEndDate: value })),
  shiftCustomRange: (delta) =>
    set((state) => {
      const start = parseDateInput(state.customStartDate)
      const end = parseDateInput(state.customEndDate)

      if (!start && !end) {
        return state
      }

      const safeStart = start ?? end
      const safeEnd = end ?? start

      if (!safeStart || !safeEnd) {
        return state
      }

      const dayCount = Math.max(
        1,
        Math.round((safeEnd.getTime() - safeStart.getTime()) / (1000 * 60 * 60 * 24)) + 1,
      )
      const offset = delta * dayCount
      const nextStart = new Date(safeStart)
      const nextEnd = new Date(safeEnd)
      nextStart.setDate(nextStart.getDate() + offset)
      nextEnd.setDate(nextEnd.getDate() + offset)

      return {
        ...state,
        customStartDate: formatDateInput(nextStart),
        customEndDate: formatDateInput(nextEnd),
      }
    }),
}))

/**
 * Formats a Date as a local ISO 8601 datetime string WITHOUT UTC conversion.
 * Use this instead of .toISOString() when sending date filters to the API,
 * otherwise JS shifts local midnight to the previous day in UTC.
 * Example: 2026-01-01T00:00:00  (no Z / no offset)
 */
export function toApiDateString(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`
}

export function resolveSharedDateRange(state: SharedDateRangeState): { start: Date | null; end: Date | null } {
  if (state.preset === 'month') {
    const anchor = state.monthAnchor
      ? new Date(`${state.monthAnchor}T00:00:00`)
      : new Date()
    const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
    const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0, 23, 59, 59, 999)
    return { start, end }
  }

  if (state.preset === 'year') {
    const year = state.yearAnchor || new Date().getFullYear()
    const start = new Date(year, 0, 1)
    const end = new Date(year, 11, 31, 23, 59, 59, 999)
    return { start, end }
  }

  if (state.preset === 'custom') {
    const start = state.customStartDate
      ? new Date(`${state.customStartDate}T00:00:00`)
      : null
    const end = state.customEndDate
      ? new Date(`${state.customEndDate}T23:59:59`)
      : null
    return { start, end }
  }

  return { start: null, end: null }
}
