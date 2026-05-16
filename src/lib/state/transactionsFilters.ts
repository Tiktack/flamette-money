import { create } from "zustand"

export type TransactionsFiltersState = {
  accountIds: string[]
  categoryIds: string[]
  tripIds: string[]
  transactionTypes: string[]
  amountMin: number | null
  amountMax: number | null
  setAccountIds: (value: string[]) => void
  setCategoryIds: (value: string[]) => void
  setTripIds: (value: string[]) => void
  setTransactionTypes: (value: string[]) => void
  setAmountMin: (value: number | null) => void
  setAmountMax: (value: number | null) => void
  resetFilters: () => void
}

const buildDefaultState = (): Omit<
  TransactionsFiltersState,
  | "setAccountIds"
  | "setCategoryIds"
  | "setTripIds"
  | "setTransactionTypes"
  | "setAmountMin"
  | "setAmountMax"
  | "resetFilters"
> => {
  return {
    accountIds: [],
    categoryIds: [],
    tripIds: [],
    transactionTypes: [],
    amountMin: null,
    amountMax: null,
  }
}

export const useTransactionsFilters = create<TransactionsFiltersState>(
  (set) => ({
    ...buildDefaultState(),
    setAccountIds: (value) => set((state) => ({ ...state, accountIds: value })),
    setCategoryIds: (value) =>
      set((state) => ({ ...state, categoryIds: value })),
    setTripIds: (value) => set((state) => ({ ...state, tripIds: value })),
    setTransactionTypes: (value) =>
      set((state) => ({ ...state, transactionTypes: value })),
    setAmountMin: (value) => set((state) => ({ ...state, amountMin: value })),
    setAmountMax: (value) => set((state) => ({ ...state, amountMax: value })),
    resetFilters: () => set(buildDefaultState()),
  })
)
