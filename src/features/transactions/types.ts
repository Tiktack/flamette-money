export type {
  CreateTransactionItemRequest as TransactionItemCreateRequest,
  CreateTransactionRequest as TransactionCreateRequest,
  GetApiTransactionsSearchData,
  GetTransactionResponse as TransactionDetail,
  TransactionItemResponse as TransactionItem,
  TransactionListItemResponse as TransactionListItem,
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
