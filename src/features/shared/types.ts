export type ClientOptions = {
  baseUrl: `${string}://src` | (string & {})
}

export type AccountListItemResponse = {
  id: string
  name: string
  description: null | string
  currency: string
  color: string
  icon: string
  type: AccountType
  currentBalance: number | string
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
  income: number | string
  spending: number | string
  net: number | string
}

export type CashflowMetricSummaryResponse = {
  total: number | string
  previousTotal: number | string
  averagePerDay: number | string
  previousAveragePerDay: number | string
}

export type CashflowSeriesPointResponse = {
  bucketKey: string
  bucketLabel: string
  income: number | string
  spending: number | string
  net: number | string
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
  savingsRate: number | string
  previousSavingsRate: number | string
  positiveBucketCount: number | string
  negativeBucketCount: number | string
  bestBucket: null | CashflowBucketHighlightResponse
  worstBucket: null | CashflowBucketHighlightResponse
  dayCount: number | string
  bucketCount: number | string
}

export type CategoryHierarchyResponse = {
  id: string
  name: string
  color: string
  icon: string
  type: CategoryType
  parentId: null | string
  subcategories: Array<CategoryHierarchyResponse>
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

export type CreateAccountRequest = {
  name: string
  description: null | string
  currency: string
  color: string
  icon: string
  type: AccountType
  currentBalance: number | string
}

export type CreateAccountResponse = {
  id: string
  name: string
  description: null | string
  currency: string
  color: string
  icon: string
  type: AccountType
  currentBalance: number | string
}

export type CreateCategoryRequest = {
  name: string
  color: string
  icon: string
  parentId: null | string
  type: CategoryType
}

export type CreateCategoryResponse = {
  id: string
  name: string
  color: string
  icon: string
  type: CategoryType
  parentId: null | string
}

export type CreateTransactionItemRequest = {
  name: string
  quantity: number | string
  unit: null | string
  unitPrice: number | string
  promotionAmount: number | string
  categoryId: null | string
  subCategoryId: null | string
}

export type CreateTransactionRequest = {
  date: string
  type: TransactionType
  amount: number | string
  accountId: string
  tripId: null | string
  categoryId: null | string
  subCategoryId: null | string
  targetAccountId: null | string
  originalTransactionId: null | string
  note: null | string
  merchantName: null | string
  location: null | string
  amount2?: null | number | string
  currency?: null | string
  currency2?: null | string
  items?: null | Array<CreateTransactionItemRequest>
}

export type CreateTransactionResponse = {
  id: string
  date: string
  type: TransactionType
  amount: number | string
  amount2: null | number | string
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
  items: Array<TransactionItemResponse>
}

export type CreateTripRequest = {
  name: string
  country: null | string
  startDate: string
  endDate: string
  imageUrl: null | string
}

export type CreateTripResponse = {
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
  googleSubject: string
  baseCurrency: string
  subscriptionType: SubscriptionType
}

export type GetAccountResponse = {
  id: string
  name: string
  description: null | string
  currency: string
  color: string
  icon: string
  type: AccountType
  currentBalance: number | string
}

export type GetTransactionResponse = {
  id: string
  date: string
  type: TransactionType
  amount: number | string
  amount2: null | number | string
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
  items: Array<TransactionItemResponse>
}

export type HttpValidationProblemDetails = {
  type?: null | string
  title?: null | string
  status?: null | number | string
  detail?: null | string
  instance?: null | string
  errors?: {
    [key: string]: Array<string>
  }
}

export type IFormFile = Blob | File

export type ImportBackupResponse = {
  type: string
  importedTransactions: number | string
  importedAccounts: number | string
  importedCategories: number | string
  importedSubCategories: number | string
  importedTransactionItems: number | string
  updatedBalanceSnapshots: number | string
  updatedSettings: number | string
  skippedRows: number | string
}

export type MonthlyYoyPointResponse = {
  month: number | string
  monthLabel: string
  values: {
    [key: string]: number | string
  }
  total: number | string
}

export type MonthlyYoyReportResponse = {
  type: CategoryType
  baseCurrency: string
  startYear: number | string
  endYear: number | string
  months: Array<string>
  series: Array<MonthlyYoySeriesResponse>
  data: Array<MonthlyYoyPointResponse>
  yearTotals: Array<MonthlyYoyYearTotalResponse>
  summary: MonthlyYoySummaryResponse
}

export type MonthlyYoySeriesResponse = {
  key: string
  label: string
  year: number | string
  color: string
  total: number | string
}

export type MonthlyYoySummaryResponse = {
  total: number | string
  previousYearTotal: number | string
  averagePerMonth: number | string
  yearCount: number | string
}

export type MonthlyYoyYearTotalResponse = {
  year: number | string
  total: number | string
}

export type PortfolioAccountResponse = {
  id: string
  name: string
  color: string
  currency: string
  currentBalance: number | string
}

export type PortfolioBalancePointResponse = {
  bucketKey: string
  bucketLabel: string
  bucketDate: string
  totalBalance: number | string
  accountBalances: {
    [key: string]: number | string
  }
  totalsByCurrency: {
    [key: string]: number | string
  }
  missingCurrencies: Array<string>
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
  startBalance: number | string
  endBalance: number | string
  delta: number | string
  deltaPercent: number | string
  pointCount: number | string
  dayCount: number | string
}

export type ReceiptItemResponse = {
  name: string
  quantity: number | string
  unit: null | string
  unitPrice: number | string
  promotionAmount: number | string
  finalAmount: number | string
  categoryName: null | string
  categoryId: null | string
  subCategoryId: null | string
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
    [key: string]: number | string
  }
  total: number | string
}

export type ReportSeriesEntryResponse = {
  key: string
  label: string
  color: string
  total: number | string
  percentageOfMax: number | string
}

export type ReportSummaryResponse = {
  total: number | string
  previousTotal: number | string
  averagePerDay: number | string
  previousAveragePerDay: number | string
  averagePerWeek: number | string
  previousAveragePerWeek: number | string
  dayCount: number | string
  bucketCount: number | string
}

export type ResetUserDataResponse = {
  deletedTransactions: number | string
  deletedCategories: number | string
  deletedAccounts: number | string
  deletedTrips: number | string
  deletedTransactionItems: number | string
}

export type ScanReceiptResponse = {
  merchant: null | string
  date: null | string
  amount: number | string
  currency: null | string
  items: Array<ReceiptItemResponse>
}

export type SeedDemoResponse = {
  accountsAdded: number | string
  transactionsAdded: number | string
  transfersAdded: number | string
  refundsAdded: number | string
  startDate: string
  endDate: string
}

export type SubscriptionType = "Free" | "Premium"

export type TransactionItemResponse = {
  id: string
  name: string
  quantity: number | string
  unit: null | string
  unitPrice: number | string
  promotionAmount: number | string
  finalAmount: number | string
  categoryId: null | string
  subCategoryId: null | string
}

export type TransactionListItemResponse = {
  id: string
  date: string
  type: TransactionType
  amount: number | string
  amount2: null | number | string
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
  itemCount: number | string
}

export type TransactionType = "Income" | "Expense" | "Transfer" | "Refund"

export type TripListItemResponse = {
  id: string
  name: string
  country: null | string
  startDate: null | string
  endDate: null | string
  imageUrl: null | string
  transactionCount: number | string
  totalExpenseAmount: number | string
}

export type UpdateAccountRequest = {
  name: string
  description: null | string
  color: string
  icon: string
  type: AccountType
  currentBalance: number | string
}

export type UpdateAccountResponse = {
  id: string
  name: string
  description: null | string
  currency: string
  color: string
  icon: string
  type: AccountType
  currentBalance: number | string
}

export type UpdateCategoryRequest = {
  name: string
  color: string
  icon: string
  parentId: null | string
}

export type UpdateCategoryResponse = {
  id: string
  name: string
  color: string
  icon: string
  type: CategoryType
  parentId: null | string
}

export type UpdateTransactionRequest = {
  date: string
  type: TransactionType
  amount: number | string
  accountId: string
  tripId: null | string
  categoryId: null | string
  subCategoryId: null | string
  targetAccountId: null | string
  originalTransactionId: null | string
  note: null | string
  merchantName: null | string
  location: null | string
  amount2?: null | number | string
  currency?: null | string
  currency2?: null | string
  items?: null | Array<CreateTransactionItemRequest>
}

export type UpdateTransactionResponse = {
  id: string
  date: string
  type: TransactionType
  amount: number | string
  amount2: null | number | string
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
  items: Array<TransactionItemResponse>
}

export type UpdateTripRequest = {
  name: string
  country: null | string
  startDate: string
  endDate: string
  imageUrl: null | string
}

export type UpdateTripResponse = {
  id: string
  name: string
  country: null | string
  startDate: null | string
  endDate: null | string
  imageUrl: null | string
}

export type UpdateUserSettingsRequest = {
  baseCurrency: string
}

export type UserSettingsResponse = {
  baseCurrency: string
}

export type GetApiTripsData = {
  body?: never
  path?: never
  query?: never
  url: "/api/trips"
}

export type GetApiTripsResponses = {
  /**
   * OK
   */
  200: Array<TripListItemResponse>
}

export type GetApiTripsResponse = GetApiTripsResponses[keyof GetApiTripsResponses]

export type PostApiTripsData = {
  body: CreateTripRequest
  path?: never
  query?: never
  url: "/api/trips"
}

export type PostApiTripsErrors = {
  /**
   * Bad Request
   */
  400: HttpValidationProblemDetails
}

export type PostApiTripsError = PostApiTripsErrors[keyof PostApiTripsErrors]

export type PostApiTripsResponses = {
  /**
   * Created
   */
  201: CreateTripResponse
}

export type PostApiTripsResponse = PostApiTripsResponses[keyof PostApiTripsResponses]

export type PutApiTripsByIdData = {
  body: UpdateTripRequest
  path: {
    id: string
  }
  query?: never
  url: "/api/trips/{id}"
}

export type PutApiTripsByIdErrors = {
  /**
   * Bad Request
   */
  400: HttpValidationProblemDetails
  /**
   * Not Found
   */
  404: unknown
}

export type PutApiTripsByIdError = PutApiTripsByIdErrors[keyof PutApiTripsByIdErrors]

export type PutApiTripsByIdResponses = {
  /**
   * OK
   */
  200: UpdateTripResponse
}

export type PutApiTripsByIdResponse = PutApiTripsByIdResponses[keyof PutApiTripsByIdResponses]

export type GetApiTransactionsData = {
  body?: never
  path?: never
  query: {
    page: number | string
    pageSize: number | string
  }
  url: "/api/transactions"
}

export type GetApiTransactionsResponses = {
  /**
   * OK
   */
  200: Array<TransactionListItemResponse>
}

export type GetApiTransactionsResponse = GetApiTransactionsResponses[keyof GetApiTransactionsResponses]

export type PostApiTransactionsData = {
  body: CreateTransactionRequest
  path?: never
  query?: never
  url: "/api/transactions"
}

export type PostApiTransactionsErrors = {
  /**
   * Bad Request
   */
  400: HttpValidationProblemDetails
}

export type PostApiTransactionsError = PostApiTransactionsErrors[keyof PostApiTransactionsErrors]

export type PostApiTransactionsResponses = {
  /**
   * Created
   */
  201: CreateTransactionResponse
}

export type PostApiTransactionsResponse = PostApiTransactionsResponses[keyof PostApiTransactionsResponses]

export type DeleteApiTransactionsByIdData = {
  body?: never
  path: {
    id: string
  }
  query?: never
  url: "/api/transactions/{id}"
}

export type DeleteApiTransactionsByIdErrors = {
  /**
   * Not Found
   */
  404: unknown
}

export type DeleteApiTransactionsByIdResponses = {
  /**
   * No Content
   */
  204: void
}

export type DeleteApiTransactionsByIdResponse = DeleteApiTransactionsByIdResponses[keyof DeleteApiTransactionsByIdResponses]

export type GetApiTransactionsByIdData = {
  body?: never
  path: {
    id: string
  }
  query?: never
  url: "/api/transactions/{id}"
}

export type GetApiTransactionsByIdErrors = {
  /**
   * Not Found
   */
  404: unknown
}

export type GetApiTransactionsByIdResponses = {
  /**
   * OK
   */
  200: GetTransactionResponse
}

export type GetApiTransactionsByIdResponse = GetApiTransactionsByIdResponses[keyof GetApiTransactionsByIdResponses]

export type PutApiTransactionsByIdData = {
  body: UpdateTransactionRequest
  path: {
    id: string
  }
  query?: never
  url: "/api/transactions/{id}"
}

export type PutApiTransactionsByIdErrors = {
  /**
   * Bad Request
   */
  400: HttpValidationProblemDetails
  /**
   * Not Found
   */
  404: unknown
}

export type PutApiTransactionsByIdError = PutApiTransactionsByIdErrors[keyof PutApiTransactionsByIdErrors]

export type PutApiTransactionsByIdResponses = {
  /**
   * OK
   */
  200: UpdateTransactionResponse
}

export type PutApiTransactionsByIdResponse = PutApiTransactionsByIdResponses[keyof PutApiTransactionsByIdResponses]

export type GetApiTransactionsSearchData = {
  body?: never
  path?: never
  query?: {
    StartDate?: string
    EndDate?: string
    AccountIds?: Array<string>
    TripIds?: Array<string>
    CategoryIds?: Array<string>
    Types?: Array<TransactionType>
    SearchText?: string
    MinAmount?: number | string
    MaxAmount?: number | string
    Page?: number
    PageSize?: number
  }
  url: "/api/transactions/search"
}

export type GetApiTransactionsSearchResponses = {
  /**
   * OK
   */
  200: Array<TransactionListItemResponse>
}

export type GetApiTransactionsSearchResponse = GetApiTransactionsSearchResponses[keyof GetApiTransactionsSearchResponses]

export type GetApiSettingsData = {
  body?: never
  path?: never
  query?: never
  url: "/api/settings"
}

export type GetApiSettingsErrors = {
  /**
   * Not Found
   */
  404: unknown
}

export type GetApiSettingsResponses = {
  /**
   * OK
   */
  200: UserSettingsResponse
}

export type GetApiSettingsResponse = GetApiSettingsResponses[keyof GetApiSettingsResponses]

export type PutApiSettingsData = {
  body: UpdateUserSettingsRequest
  path?: never
  query?: never
  url: "/api/settings"
}

export type PutApiSettingsErrors = {
  /**
   * Bad Request
   */
  400: HttpValidationProblemDetails
  /**
   * Not Found
   */
  404: unknown
}

export type PutApiSettingsError = PutApiSettingsErrors[keyof PutApiSettingsErrors]

export type PutApiSettingsResponses = {
  /**
   * OK
   */
  200: UserSettingsResponse
}

export type PutApiSettingsResponse = PutApiSettingsResponses[keyof PutApiSettingsResponses]

export type PostApiSettingsResetDataData = {
  body?: never
  path?: never
  query?: never
  url: "/api/settings/reset-data"
}

export type PostApiSettingsResetDataErrors = {
  /**
   * Not Found
   */
  404: unknown
}

export type PostApiSettingsResetDataResponses = {
  /**
   * OK
   */
  200: ResetUserDataResponse
}

export type PostApiSettingsResetDataResponse = PostApiSettingsResetDataResponses[keyof PostApiSettingsResetDataResponses]

export type PostApiSeedDemoData = {
  body?: never
  path?: never
  query?: {
    Years?: number | string
    Seed?: number | string
  }
  url: "/api/seed/demo"
}

export type PostApiSeedDemoResponses = {
  /**
   * OK
   */
  200: SeedDemoResponse
}

export type PostApiSeedDemoResponse = PostApiSeedDemoResponses[keyof PostApiSeedDemoResponses]

export type GetApiReportsCashflowSeriesData = {
  body?: never
  path?: never
  query?: {
    StartDate?: string
    EndDate?: string
    Interval?: ReportInterval
  }
  url: "/api/reports/cashflow-series"
}

export type GetApiReportsCashflowSeriesErrors = {
  /**
   * Bad Request
   */
  400: HttpValidationProblemDetails
}

export type GetApiReportsCashflowSeriesError = GetApiReportsCashflowSeriesErrors[keyof GetApiReportsCashflowSeriesErrors]

export type GetApiReportsCashflowSeriesResponses = {
  /**
   * OK
   */
  200: CashflowSeriesReportResponse
}

export type GetApiReportsCashflowSeriesResponse = GetApiReportsCashflowSeriesResponses[keyof GetApiReportsCashflowSeriesResponses]

export type GetApiReportsCategorySeriesData = {
  body?: never
  path?: never
  query?: {
    StartDate?: string
    EndDate?: string
    Type?: CategoryType
    Interval?: ReportInterval
    TripId?: string
    GroupTripsAsCategory?: boolean
  }
  url: "/api/reports/category-series"
}

export type GetApiReportsCategorySeriesErrors = {
  /**
   * Bad Request
   */
  400: HttpValidationProblemDetails
}

export type GetApiReportsCategorySeriesError = GetApiReportsCategorySeriesErrors[keyof GetApiReportsCategorySeriesErrors]

export type GetApiReportsCategorySeriesResponses = {
  /**
   * OK
   */
  200: CategorySeriesReportResponse
}

export type GetApiReportsCategorySeriesResponse = GetApiReportsCategorySeriesResponses[keyof GetApiReportsCategorySeriesResponses]

export type GetApiReportsMonthlyYoyData = {
  body?: never
  path?: never
  query?: {
    StartYear?: number | string
    EndYear?: number | string
    Type?: CategoryType
    TripId?: string
  }
  url: "/api/reports/monthly-yoy"
}

export type GetApiReportsMonthlyYoyErrors = {
  /**
   * Bad Request
   */
  400: HttpValidationProblemDetails
}

export type GetApiReportsMonthlyYoyError = GetApiReportsMonthlyYoyErrors[keyof GetApiReportsMonthlyYoyErrors]

export type GetApiReportsMonthlyYoyResponses = {
  /**
   * OK
   */
  200: MonthlyYoyReportResponse
}

export type GetApiReportsMonthlyYoyResponse = GetApiReportsMonthlyYoyResponses[keyof GetApiReportsMonthlyYoyResponses]

export type GetApiReportsPortfolioBalanceSeriesData = {
  body?: never
  path?: never
  query?: {
    StartDate?: string
    EndDate?: string
    Interval?: ReportInterval
    BaseCurrency?: string
    AccountIds?: Array<string>
  }
  url: "/api/reports/portfolio-balance-series"
}

export type GetApiReportsPortfolioBalanceSeriesErrors = {
  /**
   * Bad Request
   */
  400: HttpValidationProblemDetails
}

export type GetApiReportsPortfolioBalanceSeriesError = GetApiReportsPortfolioBalanceSeriesErrors[keyof GetApiReportsPortfolioBalanceSeriesErrors]

export type GetApiReportsPortfolioBalanceSeriesResponses = {
  /**
   * OK
   */
  200: PortfolioBalanceSeriesResponse
}

export type GetApiReportsPortfolioBalanceSeriesResponse = GetApiReportsPortfolioBalanceSeriesResponses[keyof GetApiReportsPortfolioBalanceSeriesResponses]

export type PostApiReceiptsScanData = {
  body: {
    file: IFormFile
  } & {
    accountId: string
  }
  path?: never
  query?: never
  url: "/api/receipts/scan"
}

export type PostApiReceiptsScanErrors = {
  /**
   * Bad Request
   */
  400: unknown
}

export type PostApiReceiptsScanResponses = {
  /**
   * OK
   */
  200: ScanReceiptResponse
}

export type PostApiReceiptsScanResponse = PostApiReceiptsScanResponses[keyof PostApiReceiptsScanResponses]

export type GetApiProfileExportBackupData = {
  body?: never
  path?: never
  query?: {
    type?: string
  }
  url: "/api/profile/export-backup"
}

export type GetApiProfileExportBackupErrors = {
  /**
   * Bad Request
   */
  400: unknown
}

export type GetApiProfileExportBackupResponses = {
  /**
   * OK
   */
  200: unknown
}

export type PostApiProfileImportBackupData = {
  body: {
    file: IFormFile
  } & {
    type: string
  }
  path?: never
  query?: never
  url: "/api/profile/import-backup"
}

export type PostApiProfileImportBackupErrors = {
  /**
   * Bad Request
   */
  400: unknown
}

export type PostApiProfileImportBackupResponses = {
  /**
   * OK
   */
  200: ImportBackupResponse
}

export type PostApiProfileImportBackupResponse = PostApiProfileImportBackupResponses[keyof PostApiProfileImportBackupResponses]

export type GetApiCategoriesData = {
  body?: never
  path?: never
  query?: never
  url: "/api/categories"
}

export type GetApiCategoriesResponses = {
  /**
   * OK
   */
  200: Array<CategoryHierarchyResponse>
}

export type GetApiCategoriesResponse = GetApiCategoriesResponses[keyof GetApiCategoriesResponses]

export type PostApiCategoriesData = {
  body: CreateCategoryRequest
  path?: never
  query?: never
  url: "/api/categories"
}

export type PostApiCategoriesErrors = {
  /**
   * Bad Request
   */
  400: HttpValidationProblemDetails
}

export type PostApiCategoriesError = PostApiCategoriesErrors[keyof PostApiCategoriesErrors]

export type PostApiCategoriesResponses = {
  /**
   * Created
   */
  201: CreateCategoryResponse
}

export type PostApiCategoriesResponse = PostApiCategoriesResponses[keyof PostApiCategoriesResponses]

export type DeleteApiCategoriesByIdData = {
  body?: never
  path: {
    id: string
  }
  query?: never
  url: "/api/categories/{id}"
}

export type DeleteApiCategoriesByIdErrors = {
  /**
   * Not Found
   */
  404: unknown
  /**
   * Conflict
   */
  409: unknown
}

export type DeleteApiCategoriesByIdResponses = {
  /**
   * No Content
   */
  204: void
}

export type DeleteApiCategoriesByIdResponse = DeleteApiCategoriesByIdResponses[keyof DeleteApiCategoriesByIdResponses]

export type PutApiCategoriesByIdData = {
  body: UpdateCategoryRequest
  path: {
    id: string
  }
  query?: never
  url: "/api/categories/{id}"
}

export type PutApiCategoriesByIdErrors = {
  /**
   * Bad Request
   */
  400: HttpValidationProblemDetails
  /**
   * Not Found
   */
  404: unknown
}

export type PutApiCategoriesByIdError = PutApiCategoriesByIdErrors[keyof PutApiCategoriesByIdErrors]

export type PutApiCategoriesByIdResponses = {
  /**
   * OK
   */
  200: UpdateCategoryResponse
}

export type PutApiCategoriesByIdResponse = PutApiCategoriesByIdResponses[keyof PutApiCategoriesByIdResponses]

export type GetApiAuthLoginGoogleData = {
  body?: never
  path?: never
  query?: {
    returnUrl?: string
  }
  url: "/api/auth/login/google"
}

export type GetApiAuthLoginGoogleResponses = {
  /**
   * OK
   */
  200: unknown
}

export type PostApiAuthLogoutData = {
  body?: never
  path?: never
  query?: never
  url: "/api/auth/logout"
}

export type PostApiAuthLogoutResponses = {
  /**
   * No Content
   */
  204: void
}

export type PostApiAuthLogoutResponse = PostApiAuthLogoutResponses[keyof PostApiAuthLogoutResponses]

export type GetApiAuthMeData = {
  body?: never
  path?: never
  query?: never
  url: "/api/auth/me"
}

export type GetApiAuthMeErrors = {
  /**
   * Unauthorized
   */
  401: unknown
  /**
   * Not Found
   */
  404: unknown
}

export type GetApiAuthMeResponses = {
  /**
   * OK
   */
  200: CurrentUserResponse
}

export type GetApiAuthMeResponse = GetApiAuthMeResponses[keyof GetApiAuthMeResponses]

export type GetApiAppInfoData = {
  body?: never
  path?: never
  query?: never
  url: "/api/app-info"
}

export type GetApiAppInfoResponses = {
  /**
   * OK
   */
  200: AppInfoResponse
}

export type GetApiAppInfoResponse = GetApiAppInfoResponses[keyof GetApiAppInfoResponses]

export type GetApiAccountsData = {
  body?: never
  path?: never
  query?: never
  url: "/api/accounts"
}

export type GetApiAccountsResponses = {
  /**
   * OK
   */
  200: Array<AccountListItemResponse>
}

export type GetApiAccountsResponse = GetApiAccountsResponses[keyof GetApiAccountsResponses]

export type PostApiAccountsData = {
  body: CreateAccountRequest
  path?: never
  query?: never
  url: "/api/accounts"
}

export type PostApiAccountsErrors = {
  /**
   * Bad Request
   */
  400: HttpValidationProblemDetails
}

export type PostApiAccountsError = PostApiAccountsErrors[keyof PostApiAccountsErrors]

export type PostApiAccountsResponses = {
  /**
   * Created
   */
  201: CreateAccountResponse
}

export type PostApiAccountsResponse = PostApiAccountsResponses[keyof PostApiAccountsResponses]

export type DeleteApiAccountsByIdData = {
  body?: never
  path: {
    id: string
  }
  query?: never
  url: "/api/accounts/{id}"
}

export type DeleteApiAccountsByIdErrors = {
  /**
   * Not Found
   */
  404: unknown
  /**
   * Conflict
   */
  409: unknown
}

export type DeleteApiAccountsByIdResponses = {
  /**
   * No Content
   */
  204: void
}

export type DeleteApiAccountsByIdResponse = DeleteApiAccountsByIdResponses[keyof DeleteApiAccountsByIdResponses]

export type GetApiAccountsByIdData = {
  body?: never
  path: {
    id: string
  }
  query?: never
  url: "/api/accounts/{id}"
}

export type GetApiAccountsByIdErrors = {
  /**
   * Not Found
   */
  404: unknown
}

export type GetApiAccountsByIdResponses = {
  /**
   * OK
   */
  200: GetAccountResponse
}

export type GetApiAccountsByIdResponse = GetApiAccountsByIdResponses[keyof GetApiAccountsByIdResponses]

export type PutApiAccountsByIdData = {
  body: UpdateAccountRequest
  path: {
    id: string
  }
  query?: never
  url: "/api/accounts/{id}"
}

export type PutApiAccountsByIdErrors = {
  /**
   * Bad Request
   */
  400: HttpValidationProblemDetails
  /**
   * Not Found
   */
  404: unknown
}

export type PutApiAccountsByIdError = PutApiAccountsByIdErrors[keyof PutApiAccountsByIdErrors]

export type PutApiAccountsByIdResponses = {
  /**
   * OK
   */
  200: UpdateAccountResponse
}

export type PutApiAccountsByIdResponse = PutApiAccountsByIdResponses[keyof PutApiAccountsByIdResponses]
