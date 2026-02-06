export type AccountType = 'Cash' | 'DebitCard' | 'CreditCard' | 'Savings' | string

export interface AccountListItem {
  id: string
  name: string
  currency: string
  color: string
  type: AccountType
  initialBalance: number
  currentBalance: number
}

export interface AccountCreateRequest {
  name: string
  currency: string
  color: string
  type: AccountType
  initialBalance: number
}

export interface AccountUpdateRequest {
  name: string
  color: string
  type: AccountType
}

export type CategoryType = 'Income' | 'Expense' | string

export interface CategoryHierarchy {
  id: string
  name: string
  color: string
  icon: string
  type: CategoryType
  parentId: string | null
  subcategories: CategoryHierarchy[]
}

export type TransactionType = 'Income' | 'Expense' | 'Transfer' | string

export interface TransactionListItem {
  id: string
  date: string
  type: TransactionType
  amount: number
  accountId: string
  categoryId: string | null
  subCategoryId: string | null
  targetAccountId: string | null
  originalTransactionId: string | null
  isRefund: boolean
  note: string | null
  merchantName: string | null
  location: string | null
}
