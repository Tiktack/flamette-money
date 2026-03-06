import { create } from 'zustand'

export type TransactionsFiltersState = {
  accountIds: string[]
  categoryIds: string[]
  transactionTypes: string[]
  amountMin: number | null
  amountMax: number | null
  setAccountIds: (value: string[]) => void
  setCategoryIds: (value: string[]) => void
  setTransactionTypes: (value: string[]) => void
  setAmountMin: (value: number | null) => void
  setAmountMax: (value: number | null) => void
  resetFilters: () => void
}

const buildDefaultState = (): Omit<
  TransactionsFiltersState,
  | 'setAccountIds'
  | 'setCategoryIds'
  | 'setTransactionTypes'
  | 'setAmountMin'
  | 'setAmountMax'
  | 'resetFilters'
> => {
  return {
    accountIds: [],
    categoryIds: [],
    transactionTypes: [],
    amountMin: null,
    amountMax: null,
  }
}

export const useTransactionsFilters = create<TransactionsFiltersState>((set) => ({
  ...buildDefaultState(),
  setAccountIds: (value) => set((state) => ({ ...state, accountIds: value })),
  setCategoryIds: (value) => set((state) => ({ ...state, categoryIds: value })),
  setTransactionTypes: (value) => set((state) => ({ ...state, transactionTypes: value })),
  setAmountMin: (value) => set((state) => ({ ...state, amountMin: value })),
  setAmountMax: (value) => set((state) => ({ ...state, amountMax: value })),
  resetFilters: () => set(buildDefaultState()),
}))
