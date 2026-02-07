import { create } from 'zustand'

export type TransactionDatePreset = 'month' | 'year' | 'all' | 'custom'

export type TransactionsFiltersState = {
  datePreset: TransactionDatePreset
  monthAnchor: string
  yearAnchor: number
  customStartDate: string
  customEndDate: string
  accountIds: string[]
  categoryIds: string[]
  transactionTypes: string[]
  amountMin: number | null
  amountMax: number | null
  setDatePreset: (preset: TransactionDatePreset) => void
  setMonthAnchor: (value: string) => void
  shiftMonth: (delta: number) => void
  setYearAnchor: (value: number) => void
  shiftYear: (delta: number) => void
  setCustomStartDate: (value: string) => void
  setCustomEndDate: (value: string) => void
  setAccountIds: (value: string[]) => void
  setCategoryIds: (value: string[]) => void
  setTransactionTypes: (value: string[]) => void
  setAmountMin: (value: number | null) => void
  setAmountMax: (value: number | null) => void
  resetFilters: () => void
}

const formatDateInput = (value: Date) => value.toISOString().slice(0, 10)

const formatMonthAnchor = (value: Date) => {
  const monthStart = new Date(value.getFullYear(), value.getMonth(), 1)
  return formatDateInput(monthStart)
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
  TransactionsFiltersState,
  | 'setDatePreset'
  | 'setMonthAnchor'
  | 'shiftMonth'
  | 'setYearAnchor'
  | 'shiftYear'
  | 'setCustomStartDate'
  | 'setCustomEndDate'
  | 'setAccountIds'
  | 'setCategoryIds'
  | 'setAmountMin'
  | 'setAmountMax'
  | 'resetFilters'
> => {
  const monthRange = getCurrentMonthRange()
  const now = new Date()

  return {
    datePreset: 'month',
    monthAnchor: formatMonthAnchor(now),
    yearAnchor: now.getFullYear(),
    customStartDate: monthRange.start,
    customEndDate: monthRange.end,
    accountIds: [],
    categoryIds: [],
    transactionTypes: [],
    amountMin: null,
    amountMax: null,
  }
}

export const useTransactionsFilters = create<TransactionsFiltersState>((set) => ({
  ...buildDefaultState(),
  setDatePreset: (preset) =>
    set((state) => {
      const now = new Date()
      if (preset === 'month') {
        const monthRange = getCurrentMonthRange()
        return {
          ...state,
          datePreset: preset,
          monthAnchor: state.monthAnchor || formatMonthAnchor(now),
          customStartDate: monthRange.start,
          customEndDate: monthRange.end,
        }
      }

      if (preset === 'year') {
        const yearRange = getCurrentYearRange()
        return {
          ...state,
          datePreset: preset,
          yearAnchor: state.yearAnchor || now.getFullYear(),
          customStartDate: yearRange.start,
          customEndDate: yearRange.end,
        }
      }

      return {
        ...state,
        datePreset: preset,
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
  setAccountIds: (value) => set((state) => ({ ...state, accountIds: value })),
  setCategoryIds: (value) => set((state) => ({ ...state, categoryIds: value })),
  setTransactionTypes: (value) => set((state) => ({ ...state, transactionTypes: value })),
  setAmountMin: (value) => set((state) => ({ ...state, amountMin: value })),
  setAmountMax: (value) => set((state) => ({ ...state, amountMax: value })),
  resetFilters: () => set(buildDefaultState()),
}))
