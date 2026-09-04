export type AccountResponse = {
  id: string
  name: string
  description: null | string
  currency: string
  color: string
  icon: string
  type: AccountType
  currentBalance: number
  bankAccountHint: null | string
}

export type AccountType = "Cash" | "DebitCard" | "CreditCard" | "Savings"

export type AppInfoCurrencyResponse = {
  code: string
}

export type AppInfoResponse = {
  supportedCurrencies: Array<AppInfoCurrencyResponse>
}

export type CashflowBucketHighlightResponse = {
  bucketKey: string
  bucketLabel: string
  income: number
  spending: number
  net: number
}

export type CashflowMetricSummaryResponse = {
  total: number
  previousTotal: number
  averagePerDay: number
  previousAveragePerDay: number
}

export type CashflowSeriesPointResponse = {
  bucketKey: string
  bucketLabel: string
  income: number
  spending: number
  net: number
}

export type CashflowSeriesReportQuery = {
  StartDate?: string
  EndDate?: string
  Interval?: ReportInterval
}

export type CashflowSeriesReportResponse = {
  baseCurrency: string
  interval: ReportInterval
  startDate: string
  endDate: string
  buckets: Array<ReportBucketResponse>
  data: Array<CashflowSeriesPointResponse>
  summary: CashflowSummaryResponse
}

export type CashflowSummaryResponse = {
  income: CashflowMetricSummaryResponse
  spending: CashflowMetricSummaryResponse
  net: CashflowMetricSummaryResponse
  savingsRate: number
  previousSavingsRate: number
  positiveBucketCount: number
  negativeBucketCount: number
  bestBucket: null | CashflowBucketHighlightResponse
  worstBucket: null | CashflowBucketHighlightResponse
  dayCount: number
  bucketCount: number
}

export type CategoryResponse = {
  id: string
  name: string
  color: string
  icon: string
  type: CategoryType
  parentId: null | string
}

export type CategoryHierarchyResponse = CategoryResponse & {
  subcategories: Array<CategoryHierarchyResponse>
}

export type CategorySeriesReportQuery = {
  StartDate?: string
  EndDate?: string
  Type?: CategoryType
  Interval?: ReportInterval
  TripId?: string
  GroupTripsAsCategory?: boolean
}

export type CategorySeriesReportResponse = {
  type: CategoryType
  baseCurrency: string
  interval: ReportInterval
  startDate: null | string
  endDate: null | string
  buckets: Array<ReportBucketResponse>
  series: Array<ReportSeriesEntryResponse>
  data: Array<ReportPointResponse>
  summary: ReportSummaryResponse
}

export type CategoryType = "Income" | "Expense"

export type ComparisonPeriodSummaryResponse = {
  startDate: string
  endDate: string
  income: number
  spending: number
  net: number
  savingsRate: number
  dayCount: number
}

export type ComparisonSeriesPointResponse = {
  index: number
  label: string
  aBucketKey: null | string
  bBucketKey: null | string
  aLabel: null | string
  bLabel: null | string
  aIncome: null | number
  aSpending: null | number
  aNet: null | number
  bIncome: null | number
  bSpending: null | number
  bNet: null | number
}

export type ComparisonCategoryMoverResponse = {
  key: string
  label: string
  color: string
  aTotal: number
  bTotal: number
  delta: number
  deltaPercent: null | number
}

export type ComparisonReportQuery = {
  PeriodAStart?: string
  PeriodAEnd?: string
  PeriodBStart?: string
  PeriodBEnd?: string
  Type?: CategoryType
  Interval?: ReportInterval
}

export type ComparisonReportResponse = {
  type: CategoryType
  baseCurrency: string
  interval: ReportInterval
  periodA: ComparisonPeriodSummaryResponse
  periodB: ComparisonPeriodSummaryResponse
  series: Array<ComparisonSeriesPointResponse>
  categoryMovers: Array<ComparisonCategoryMoverResponse>
}

export type CreateAccountRequest = {
  name: string
  description: null | string
  currency: string
  color: string
  icon: string
  type: AccountType
  currentBalance: number
  bankAccountHint?: null | string
}

export type CreateCategoryRequest = {
  name: string
  color: string
  icon: string
  parentId: null | string
  type: CategoryType
}

export type TransactionWriteRequest = {
  date: string
  type: TransactionType
  amount: number
  accountId: string
  tripId: null | string
  categoryId: null | string
  subCategoryId: null | string
  targetAccountId: null | string
  originalTransactionId: null | string
  note: null | string
  merchantName: null | string
  location: null | string
  amount2?: null | number
  currency?: null | string
  currency2?: null | string
}

export type TransactionResponse = {
  id: string
  date: string
  type: TransactionType
  amount: number
  amount2: null | number
  currency: null | string
  currency2: null | string
  accountId: string
  tripId: null | string
  categoryId: null | string
  subCategoryId: null | string
  targetAccountId: null | string
  originalTransactionId: null | string
  isRefund: boolean
  note: null | string
  merchantName: null | string
  location: null | string
}

export type TripWriteRequest = {
  name: string
  country: null | string
  startDate: string
  endDate: string
  imageUrl: null | string
}

export type TripResponse = {
  id: string
  name: string
  country: null | string
  startDate: null | string
  endDate: null | string
  imageUrl: null | string
}

export type CurrentUserResponse = {
  id: string
  name: string
  email: string
  baseCurrency: string
  subscriptionType: SubscriptionType
}

export type ImportBackupResponse = {
  type: string
  importedTransactions: number
  importedAccounts: number
  importedCategories: number
  importedSubCategories: number
  updatedBalanceSnapshots: number
  updatedSettings: number
  skippedRows: number
}

export type PortfolioAccountResponse = {
  id: string
  name: string
  color: string
  currency: string
  currentBalance: number
}

export type PortfolioBalancePointResponse = {
  bucketKey: string
  bucketLabel: string
  bucketDate: string
  totalBalance: number
  accountBalances: {
    [key: string]: number
  }
  totalsByCurrency: {
    [key: string]: number
  }
  missingCurrencies: Array<string>
}

export type PortfolioBalanceSeriesQuery = {
  StartDate?: string
  EndDate?: string
  Interval?: ReportInterval
  BaseCurrency?: string
  AccountIds?: Array<string>
}

export type PortfolioBalanceSeriesResponse = {
  baseCurrency: string
  startDate: string
  endDate: string
  interval: ReportInterval
  accounts: Array<PortfolioAccountResponse>
  points: Array<PortfolioBalancePointResponse>
  summary: PortfolioBalanceSummaryResponse
}

export type PortfolioBalanceSummaryResponse = {
  startBalance: number
  endBalance: number
  delta: number
  deltaPercent: number
  pointCount: number
  dayCount: number
}

export type ReportBucketResponse = {
  key: string
  label: string
}

export type ReportInterval = "Auto" | "None" | "Day" | "Week" | "Month"

export type ReportPointResponse = {
  bucketKey: string
  bucketLabel: string
  values: {
    [key: string]: number
  }
  total: number
}

export type ReportSeriesEntryResponse = {
  key: string
  label: string
  color: string
  total: number
  percentageOfMax: number
}

export type ReportSummaryResponse = {
  total: number
  previousTotal: number
  averagePerDay: number
  previousAveragePerDay: number
  averagePerWeek: number
  previousAveragePerWeek: number
  dayCount: number
  bucketCount: number
}

export type ResetUserDataResponse = {
  deletedTransactions: number
  deletedCategories: number
  deletedAccounts: number
  deletedTrips: number
}

export type SeedDemoResponse = {
  accountsAdded: number
  transactionsAdded: number
  transfersAdded: number
  refundsAdded: number
  startDate: string
  endDate: string
}

export type SubscriptionType = "Free" | "Premium"

export type TransactionSearchQuery = {
  StartDate?: string
  EndDate?: string
  AccountIds?: Array<string>
  TripIds?: Array<string>
  CategoryIds?: Array<string>
  Types?: Array<TransactionType>
  SearchText?: string
  MinAmount?: number
  MaxAmount?: number
  Page?: number
  PageSize?: number
}

export type TransactionType = "Income" | "Expense" | "Transfer" | "Refund"

export type TripListItemResponse = TripResponse & {
  transactionCount: number
  totalExpenseAmount: number
}

export type UpdateAccountRequest = {
  name: string
  description: null | string
  color: string
  icon: string
  type: AccountType
  currentBalance: number
  bankAccountHint?: null | string
}

export type UpdateCategoryRequest = {
  name: string
  color: string
  icon: string
  parentId: null | string
}

export type UpdateUserSettingsRequest = {
  baseCurrency: string
}

export type UserSettingsResponse = {
  baseCurrency: string
}
