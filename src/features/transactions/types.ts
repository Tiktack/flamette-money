export type {
  CreateTransactionRequest as TransactionCreateRequest,
  GetTransactionResponse as TransactionDetail,
  TransactionListItemResponse as TransactionListItem,
  TransactionSearchQuery,
  TransactionType,
  UpdateTransactionRequest as TransactionUpdateRequest,
} from "@/features/shared/types"

export type TransactionSearchSummary = {
  baseCurrency: string
  transactionCount: number
  incomeCount: number
  incomeTotal: number
  expenseCount: number
  expenseTotal: number
}

export type TransactionSearchFacets = {
  accountCounts: Record<string, number>
  categoryCounts: Record<string, number>
  tripCounts: Record<string, number>
  transactionTypeCounts: Record<string, number>
  maxAvailableAmount: number
}
