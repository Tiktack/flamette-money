import { and, asc, desc, eq, inArray, isNotNull, isNull } from "drizzle-orm"

import { ensureUserBootstrap } from "@/lib/bootstrap.server"
import { getSessionData, requireSessionData } from "@/lib/auth/session.server"
import {
  normalizeCurrencyOrDefault,
  normalizeCurrencyOrNull,
  supportedCurrencies,
} from "@/lib/currency"
import { db } from "@/lib/db/client.server"
import {
  forEachChunkSync,
  SQLITE_IN_CLAUSE_BATCH_SIZE,
} from "@/lib/db/sqlite-batch.server"
import {
  accounts,
  accountTypes,
  categories,
  categoryTypes,
  transactionItems,
  transactions,
  transactionTypes,
  trips,
  users,
} from "@/lib/db/schema"
import { getRatesToBase } from "@/lib/exchange-rate.server"

import type {
  AccountListItemResponse,
  AppInfoResponse,
  CategoryHierarchyResponse,
  CreateAccountRequest,
  CreateAccountResponse,
  CreateCategoryRequest,
  CreateCategoryResponse,
  CreateTransactionRequest,
  CreateTransactionResponse,
  CreateTripRequest,
  CreateTripResponse,
  CurrentUserResponse,
  GetAccountResponse,
  GetTransactionResponse,
  GetApiTransactionsSearchData,
  ResetUserDataResponse,
  TransactionItemResponse,
  TransactionListItemResponse,
  TripListItemResponse,
  UpdateAccountRequest,
  UpdateAccountResponse,
  UpdateCategoryRequest,
  UpdateCategoryResponse,
  UpdateTransactionRequest,
  UpdateTransactionResponse,
  UpdateTripRequest,
  UpdateTripResponse,
  UserSettingsResponse,
} from "@/features/shared/types"

type AccountType = (typeof accountTypes)[number]
type CategoryType = (typeof categoryTypes)[number]
type TransactionType = (typeof transactionTypes)[number]

type UserRecord = typeof users.$inferSelect
type AccountRecord = typeof accounts.$inferSelect
type CategoryRecord = typeof categories.$inferSelect
type TransactionRecord = typeof transactions.$inferSelect
type TransactionItemRecord = typeof transactionItems.$inferSelect

type LoadedTransaction = TransactionRecord & {
  items: TransactionItemRecord[]
}

function fail(message: string): never {
  throw new Error(message)
}

function parseAmount(
  value: number | string | null | undefined,
  fieldName: string
) {
  const parsed = typeof value === "number" ? value : Number(value)

  if (!Number.isFinite(parsed)) {
    fail(`${fieldName} must be a valid number.`)
  }

  return parsed
}

function parsePositiveAmount(
  value: number | string | null | undefined,
  fieldName: string
) {
  const parsed = parseAmount(value, fieldName)

  if (parsed <= 0) {
    fail(`${fieldName} must be greater than 0.`)
  }

  return parsed
}

function parseDateInput(value: string, fieldName: string) {
  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    fail(`${fieldName} must be a valid date.`)
  }

  return parsed
}

function normalizeTrimmed(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function normalizeDescription(value: string | null | undefined) {
  const normalized = normalizeTrimmed(value)

  if (normalized && normalized.length > 500) {
    fail("Description must be 500 characters or fewer.")
  }

  return normalized
}

function normalizeRequiredName(value: string, fieldName = "Name") {
  const normalized = normalizeTrimmed(value)

  if (!normalized) {
    fail(`${fieldName} is required.`)
  }

  if (normalized.length > 200) {
    fail(`${fieldName} must be 200 characters or fewer.`)
  }

  return normalized
}

function normalizeColor(value: string) {
  const normalized = normalizeTrimmed(value)

  if (!normalized) {
    fail("Color is required.")
  }

  if (!/^#?[0-9a-f]{6}$/i.test(normalized)) {
    fail("Color must be a 6-digit hex value.")
  }

  return normalized.startsWith("#")
    ? normalized.toUpperCase()
    : `#${normalized.toUpperCase()}`
}

function normalizeCategoryColor(value: string) {
  const normalized = normalizeTrimmed(value)

  if (!normalized) {
    fail("Color is required.")
  }

  if (normalized.length > 20) {
    fail("Color must be 20 characters or fewer.")
  }

  return normalized
}

function normalizeIcon(value: string) {
  const normalized = normalizeTrimmed(value)

  if (!normalized) {
    fail("Icon is required.")
  }

  if (normalized.length > 100) {
    fail("Icon must be 100 characters or fewer.")
  }

  return normalized
}

function normalizeNote(value: string | null | undefined) {
  const normalized = normalizeTrimmed(value)

  if (normalized && normalized.length > 500) {
    fail("Note must be 500 characters or fewer.")
  }

  return normalized
}

function normalizeMerchantName(value: string | null | undefined) {
  const normalized = normalizeTrimmed(value)

  if (normalized && normalized.length > 200) {
    fail("Merchant name must be 200 characters or fewer.")
  }

  return normalized
}

function normalizeLocation(value: string | null | undefined) {
  const normalized = normalizeTrimmed(value)

  if (normalized && normalized.length > 400) {
    fail("Location must be 400 characters or fewer.")
  }

  return normalized
}

function normalizeCountry(value: string | null | undefined) {
  const normalized = normalizeTrimmed(value)

  if (!normalized) {
    return null
  }

  if (normalized.length !== 2) {
    fail("Country must be a 2-letter ISO code.")
  }

  return normalized.toUpperCase()
}

function normalizeImageUrl(value: string | null | undefined) {
  const normalized = normalizeTrimmed(value)

  if (!normalized) {
    return null
  }

  if (normalized.length > 1000) {
    fail("ImageUrl must be 1000 characters or fewer.")
  }

  try {
    // eslint-disable-next-line no-new
    new URL(normalized)
  } catch {
    fail("ImageUrl must be a valid absolute URL.")
  }

  return normalized
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function startOfDay(value: string) {
  const date = parseDateInput(value, "StartDate")
  date.setHours(0, 0, 0, 0)
  return date
}

function endOfDay(value: string) {
  const date = parseDateInput(value, "EndDate")
  date.setHours(23, 59, 59, 999)
  return date
}

function normalizeAccountType(value: string): AccountType {
  if (!(accountTypes as readonly string[]).includes(value)) {
    fail("Account type is invalid.")
  }

  return value as AccountType
}

function normalizeCategoryType(value: string): CategoryType {
  if (!(categoryTypes as readonly string[]).includes(value)) {
    fail("Category type is invalid.")
  }

  return value as CategoryType
}

function normalizeTransactionType(value: string): TransactionType {
  if (!(transactionTypes as readonly string[]).includes(value)) {
    fail("Transaction type is invalid.")
  }

  return value as TransactionType
}

function normalizeSupportedCurrency(
  value: string | null | undefined,
  fieldName: string
) {
  const normalized = normalizeCurrencyOrNull(value)

  if (!normalized) {
    fail(`${fieldName} must be one of: ${supportedCurrencies.join(", ")}.`)
  }

  return normalized
}

function normalizeOptionalSupportedCurrency(value: string | null | undefined) {
  if (!value || value.trim().length === 0) {
    return null
  }

  return normalizeSupportedCurrency(value, "Currency")
}

function typeMatches(
  categoryType: CategoryType,
  transactionType: TransactionType
) {
  if (categoryType === "Income") {
    return transactionType === "Income"
  }

  return transactionType === "Expense" || transactionType === "Refund"
}

function getBalanceDeltas(
  type: TransactionType,
  amount: number,
  amount2: number | null
) {
  switch (type) {
    case "Expense":
      return { sourceDelta: -amount, targetDelta: null as number | null }
    case "Income":
    case "Refund":
      return { sourceDelta: amount, targetDelta: null as number | null }
    case "Transfer":
      return { sourceDelta: -amount, targetDelta: amount2 ?? amount }
    default:
      return { sourceDelta: 0, targetDelta: null as number | null }
  }
}

function normalizeAmount2(
  type: TransactionType,
  amount: number,
  amount2: number | null | undefined
) {
  if (type === "Transfer") {
    return amount2 && amount2 > 0 ? amount2 : amount
  }

  return amount2 ?? null
}

function mapTransactionItems(
  items: TransactionItemRecord[]
): TransactionItemResponse[] {
  return items.map((item) => ({
    id: item.id,
    name: item.name,
    quantity: item.quantity,
    unit: item.unit,
    unitPrice: item.unitPrice,
    promotionAmount: item.promotionAmount,
    finalAmount: item.finalAmount,
    categoryId: item.categoryId,
    subCategoryId: item.subCategoryId,
  }))
}

function mapTransactionListItem(
  transaction: LoadedTransaction
): TransactionListItemResponse {
  return {
    id: transaction.id,
    date: transaction.date.toISOString(),
    type: transaction.type,
    amount: transaction.amount,
    amount2: transaction.amount2,
    currency: transaction.currency,
    currency2: transaction.currency2,
    accountId: transaction.accountId,
    tripId: transaction.tripId,
    categoryId: transaction.categoryId,
    subCategoryId: transaction.subCategoryId,
    targetAccountId: transaction.targetAccountId,
    originalTransactionId: transaction.originalTransactionId,
    isRefund: transaction.isRefund,
    note: transaction.note,
    merchantName: transaction.merchantName,
    location: transaction.location,
    itemCount: transaction.items.length,
  }
}

function mapTransactionDetail(
  transaction: LoadedTransaction
): GetTransactionResponse &
  CreateTransactionResponse &
  UpdateTransactionResponse {
  return {
    id: transaction.id,
    date: transaction.date.toISOString(),
    type: transaction.type,
    amount: transaction.amount,
    amount2: transaction.amount2,
    currency: transaction.currency,
    currency2: transaction.currency2,
    accountId: transaction.accountId,
    tripId: transaction.tripId,
    categoryId: transaction.categoryId,
    subCategoryId: transaction.subCategoryId,
    targetAccountId: transaction.targetAccountId,
    originalTransactionId: transaction.originalTransactionId,
    isRefund: transaction.isRefund,
    note: transaction.note,
    merchantName: transaction.merchantName,
    location: transaction.location,
    items: mapTransactionItems(transaction.items),
  }
}

function mapCategoryTree(
  rows: CategoryRecord[],
  parentId: string | null
): CategoryHierarchyResponse[] {
  return rows
    .filter((row) =>
      parentId === null ? row.parentId === null : row.parentId === parentId
    )
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((row) => ({
      id: row.id,
      name: row.name,
      color: row.color,
      icon: row.icon,
      type: row.type,
      parentId: row.parentId,
      subcategories: mapCategoryTree(rows, row.id),
    }))
}

async function requireUser() {
  const session = await requireSessionData()
  await ensureUserBootstrap(session.user.id)
  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  })

  if (!user) {
    fail("User was not found.")
  }

  return user
}

async function requireAccount(userId: string, accountId: string) {
  const account = await db.query.accounts.findFirst({
    where: and(eq(accounts.userId, userId), eq(accounts.id, accountId)),
  })

  if (!account) {
    fail("Account was not found.")
  }

  return account
}

async function requireCategory(userId: string, categoryId: string) {
  const category = await db.query.categories.findFirst({
    where: and(eq(categories.userId, userId), eq(categories.id, categoryId)),
  })

  if (!category) {
    fail("Category was not found.")
  }

  return category
}

async function requireTrip(userId: string, tripId: string) {
  const trip = await db.query.trips.findFirst({
    where: and(eq(trips.userId, userId), eq(trips.id, tripId)),
  })

  if (!trip) {
    fail("Trip was not found.")
  }

  return trip
}

async function requireTransaction(userId: string, transactionId: string) {
  const transaction = await db.query.transactions.findFirst({
    where: and(
      eq(transactions.userId, userId),
      eq(transactions.id, transactionId)
    ),
    with: {
      items: {
        orderBy: [asc(transactionItems.createdAt)],
      },
    },
  })

  if (!transaction) {
    fail("Transaction was not found.")
  }

  return transaction
}

async function listAllTransactions(userId: string) {
  return db.query.transactions.findMany({
    where: eq(transactions.userId, userId),
    orderBy: [desc(transactions.date), desc(transactions.createdAt)],
    with: {
      items: {
        orderBy: [asc(transactionItems.createdAt)],
      },
    },
  })
}

async function buildTransactionItems(
  itemsInput:
    | CreateTransactionRequest["items"]
    | UpdateTransactionRequest["items"],
  transactionId: string
) {
  const rows: (typeof transactionItems.$inferInsert)[] = []

  for (const item of itemsInput ?? []) {
    const name = normalizeRequiredName(item.name, "Item name")
    const quantity = item.quantity ? parseAmount(item.quantity, "Quantity") : 1
    const unitPrice = parseAmount(item.unitPrice, "Unit price")
    const promotionAmount = parseAmount(
      item.promotionAmount,
      "Promotion amount"
    )
    const finalAmount =
      unitPrice * (quantity > 0 ? quantity : 1) - promotionAmount

    rows.push({
      id: crypto.randomUUID(),
      transactionId,
      name,
      quantity: quantity > 0 ? quantity : 1,
      unit: normalizeTrimmed(item.unit),
      unitPrice,
      promotionAmount,
      finalAmount,
      categoryId: item.categoryId,
      subCategoryId: item.subCategoryId,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  return rows
}

async function validateTransactionRequest(
  user: UserRecord,
  request: CreateTransactionRequest | UpdateTransactionRequest
) {
  const type = normalizeTransactionType(request.type)
  const amount = parsePositiveAmount(request.amount, "Amount")
  const amount2 =
    request.amount2 === null || request.amount2 === undefined
      ? null
      : parsePositiveAmount(request.amount2, "Amount2")
  const date = parseDateInput(request.date, "Date")
  const note = normalizeNote(request.note)
  const merchantName = normalizeMerchantName(request.merchantName)
  const location = normalizeLocation(request.location)
  const account = await requireAccount(user.id, request.accountId)

  let targetAccount: AccountRecord | null = null
  let categoryId: string | null = request.categoryId
  let subCategoryId: string | null = request.subCategoryId
  let tripId: string | null = request.tripId
  let originalTransactionId: string | null = null

  if (type === "Transfer") {
    if (!request.targetAccountId) {
      fail("Target account is required for transfers.")
    }

    if (request.targetAccountId === request.accountId) {
      fail("Target account must be different from source account.")
    }

    if (request.categoryId) {
      fail("Category is not applicable for transfers.")
    }

    if (request.tripId) {
      fail("Trip is only applicable for expense transactions.")
    }

    if (request.originalTransactionId) {
      fail("Original transaction is only valid for refunds.")
    }

    targetAccount = await requireAccount(user.id, request.targetAccountId)
    categoryId = null
    subCategoryId = null
    tripId = null

    const sourceCurrency = normalizeCurrencyOrNull(request.currency)
    if (
      sourceCurrency &&
      sourceCurrency !== normalizeCurrencyOrDefault(account.currency, "USD")
    ) {
      fail("Transfer source currency must match source account currency.")
    }

    const targetCurrency = normalizeCurrencyOrNull(request.currency2)
    if (
      targetCurrency &&
      targetCurrency !==
        normalizeCurrencyOrDefault(targetAccount.currency, "USD")
    ) {
      fail("Transfer target currency must match target account currency.")
    }
  } else if (type === "Refund") {
    if (request.targetAccountId) {
      fail("Target account is only valid for transfers.")
    }

    if (!request.originalTransactionId) {
      fail("Original transaction is required for refunds.")
    }

    if (request.tripId) {
      fail("Trip is inherited from the original expense for refunds.")
    }

    const originalTransaction = await requireTransaction(
      user.id,
      request.originalTransactionId
    )

    if (originalTransaction.type !== "Expense") {
      fail("Refunds can only reference expense transactions.")
    }

    if (originalTransaction.accountId !== request.accountId) {
      fail("Refunds must use the same account as the original transaction.")
    }

    if (
      request.categoryId &&
      request.categoryId !== originalTransaction.categoryId
    ) {
      fail("Refund category must match the original transaction.")
    }

    if (
      request.subCategoryId &&
      request.subCategoryId !== originalTransaction.subCategoryId
    ) {
      fail("Refund subcategory must match the original transaction.")
    }

    categoryId = originalTransaction.categoryId
    subCategoryId = originalTransaction.subCategoryId
    tripId = originalTransaction.tripId
    originalTransactionId = originalTransaction.id

    if (!categoryId) {
      fail("Refunds require a category.")
    }

    const refundCategory = await requireCategory(user.id, categoryId)
    if (refundCategory.type !== "Expense") {
      fail("Refunds must use an expense category.")
    }
  } else {
    if (request.targetAccountId) {
      fail("Target account is only valid for transfers.")
    }

    if (request.originalTransactionId) {
      fail("Original transaction is only valid for refunds.")
    }

    if (type !== "Expense" && request.tripId) {
      fail("Trip is only applicable for expense transactions.")
    }

    if (type === "Expense" && request.tripId) {
      await requireTrip(user.id, request.tripId)
    }

    if (type !== "Expense") {
      tripId = null
    }

    if (!request.categoryId) {
      fail("Category is required.")
    }

    const category = await requireCategory(user.id, request.categoryId)
    if (!typeMatches(category.type, type)) {
      fail("Transaction type must match category type.")
    }

    if (request.subCategoryId) {
      const subCategory = await requireCategory(user.id, request.subCategoryId)

      if (subCategory.parentId !== request.categoryId) {
        fail("Subcategory must be a child of the category.")
      }

      if (subCategory.type !== category.type) {
        fail("Subcategory type must match category type.")
      }
    }
  }

  return {
    user,
    account,
    targetAccount,
    date,
    type,
    amount,
    amount2: normalizeAmount2(type, amount, amount2),
    tripId,
    categoryId,
    subCategoryId,
    originalTransactionId,
    note,
    merchantName,
    location,
    currency:
      type === "Transfer"
        ? normalizeCurrencyOrDefault(account.currency, "USD")
        : (normalizeOptionalSupportedCurrency(request.currency) ??
          normalizeCurrencyOrDefault(account.currency, "USD")),
    currency2:
      type === "Transfer"
        ? normalizeCurrencyOrDefault(targetAccount?.currency, "USD")
        : normalizeCurrencyOrNull(request.currency2),
  }
}

export async function getCurrentUserData(): Promise<CurrentUserResponse | null> {
  const session = await getSessionData()

  if (!session) {
    return null
  }

  await ensureUserBootstrap(session.user.id)

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  })

  if (!user) {
    return null
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    googleSubject: "",
    baseCurrency: user.baseCurrency,
    subscriptionType: user.subscriptionType,
  }
}

export async function getAppInfoData(): Promise<AppInfoResponse> {
  return {
    supportedCurrencies: supportedCurrencies.map((code) => ({ code })),
  }
}

export async function getSettingsData(): Promise<UserSettingsResponse> {
  const user = await requireUser()

  return {
    baseCurrency: user.baseCurrency,
  }
}

export async function updateSettingsData(request: {
  baseCurrency: string
}): Promise<UserSettingsResponse> {
  const user = await requireUser()
  const baseCurrency = normalizeSupportedCurrency(
    request.baseCurrency,
    "BaseCurrency"
  )
  const now = new Date()

  await db
    .update(users)
    .set({
      baseCurrency,
      updatedAt: now,
    })
    .where(eq(users.id, user.id))

  return {
    baseCurrency,
  }
}

export async function resetUserData(): Promise<ResetUserDataResponse> {
  const user = await requireUser()

  return db.transaction((tx) => {
    const userTransactions = tx.query.transactions
      .findMany({
        where: eq(transactions.userId, user.id),
        columns: { id: true },
      })
      .sync()

    const transactionIds = userTransactions.map((item) => item.id)

    tx.update(transactions)
      .set({
        originalTransactionId: null,
        relatedTransactionId: null,
      })
      .where(eq(transactions.userId, user.id))
      .run()

    let deletedTransactionItems = 0

    if (transactionIds.length > 0) {
      const transactionItemsForUser: Array<{ id: string }> = []

      forEachChunkSync(transactionIds, SQLITE_IN_CLAUSE_BATCH_SIZE, (chunk) => {
        const items = tx.query.transactionItems
          .findMany({
            where: inArray(transactionItems.transactionId, chunk),
            columns: { id: true },
          })
          .sync()

        transactionItemsForUser.push(...items)
      })

      deletedTransactionItems = transactionItemsForUser.length

      forEachChunkSync(transactionIds, SQLITE_IN_CLAUSE_BATCH_SIZE, (chunk) => {
        tx.delete(transactionItems)
          .where(inArray(transactionItems.transactionId, chunk))
          .run()
      })

      tx.delete(transactions).where(eq(transactions.userId, user.id)).run()
    }

    const childCategories = tx.query.categories
      .findMany({
        where: and(
          eq(categories.userId, user.id),
          isNotNull(categories.parentId)
        ),
        columns: { id: true },
      })
      .sync()
    const parentCategories = tx.query.categories
      .findMany({
        where: and(eq(categories.userId, user.id), isNull(categories.parentId)),
        columns: { id: true },
      })
      .sync()
    const tripsForUser = tx.query.trips
      .findMany({
        where: eq(trips.userId, user.id),
        columns: { id: true },
      })
      .sync()
    const accountsForUser = tx.query.accounts
      .findMany({
        where: eq(accounts.userId, user.id),
        columns: { id: true },
      })
      .sync()

    tx.delete(trips).where(eq(trips.userId, user.id)).run()
    tx.delete(categories).where(eq(categories.userId, user.id)).run()
    tx.delete(accounts).where(eq(accounts.userId, user.id)).run()

    return {
      deletedTransactions: userTransactions.length,
      deletedCategories: childCategories.length + parentCategories.length,
      deletedAccounts: accountsForUser.length,
      deletedTrips: tripsForUser.length,
      deletedTransactionItems,
    }
  })
}

export async function listAccountsData(): Promise<AccountListItemResponse[]> {
  const user = await requireUser()
  const baseCurrency = normalizeCurrencyOrDefault(user.baseCurrency, "USD")
  const fx = await getRatesToBase(baseCurrency)
  const rows = await db.query.accounts.findMany({
    where: eq(accounts.userId, user.id),
  })

  return rows
    .map((account) => ({
      id: account.id,
      name: account.name,
      description: account.description,
      currency: account.currency,
      color: account.color,
      icon: account.icon,
      type: account.type,
      currentBalance: account.currentBalance,
      sortBalance:
        account.currentBalance *
        (fx.ratesToBase[
          normalizeCurrencyOrDefault(account.currency, baseCurrency)
        ] ?? 1),
    }))
    .sort((left, right) => {
      if (right.sortBalance !== left.sortBalance) {
        return right.sortBalance - left.sortBalance
      }

      return left.name.localeCompare(right.name)
    })
    .map(({ sortBalance: _ignoredSortBalance, ...account }) => account)
}

export async function getAccountData(
  accountId: string
): Promise<GetAccountResponse> {
  const user = await requireUser()
  const account = await requireAccount(user.id, accountId)

  return {
    id: account.id,
    name: account.name,
    description: account.description,
    currency: account.currency,
    color: account.color,
    icon: account.icon,
    type: account.type,
    currentBalance: account.currentBalance,
  }
}

export async function createAccountData(
  request: CreateAccountRequest
): Promise<CreateAccountResponse> {
  const user = await requireUser()
  const name = normalizeRequiredName(request.name)
  const description = normalizeDescription(request.description)
  const currency = normalizeSupportedCurrency(request.currency, "Currency")
  const color = normalizeColor(request.color)
  const icon = normalizeIcon(request.icon)
  const type = normalizeAccountType(request.type)
  const currentBalance = parseAmount(request.currentBalance, "CurrentBalance")
  const now = new Date()
  const id = crypto.randomUUID()

  await db.insert(accounts).values({
    id,
    userId: user.id,
    name,
    description,
    currency,
    color,
    icon,
    type,
    currentBalance,
    createdAt: now,
    updatedAt: now,
  })

  return {
    id,
    name,
    description,
    currency,
    color,
    icon,
    type,
    currentBalance,
  }
}

export async function updateAccountData(
  accountId: string,
  request: UpdateAccountRequest
): Promise<UpdateAccountResponse> {
  const user = await requireUser()
  const account = await requireAccount(user.id, accountId)
  const name = normalizeRequiredName(request.name)
  const description = normalizeDescription(request.description)
  const color = normalizeColor(request.color)
  const icon = normalizeIcon(request.icon)
  const type = normalizeAccountType(request.type)
  const currentBalance = parseAmount(request.currentBalance, "CurrentBalance")
  const now = new Date()

  await db
    .update(accounts)
    .set({
      name,
      description,
      color,
      icon,
      type,
      currentBalance,
      updatedAt: now,
    })
    .where(and(eq(accounts.userId, user.id), eq(accounts.id, account.id)))

  return {
    id: account.id,
    name,
    description,
    currency: account.currency,
    color,
    icon,
    type,
    currentBalance,
  }
}

export async function deleteAccountData(accountId: string) {
  const user = await requireUser()
  await requireAccount(user.id, accountId)

  const hasTransactions = await db.query.transactions.findFirst({
    where: and(
      eq(transactions.userId, user.id),
      eq(transactions.accountId, accountId)
    ),
    columns: { id: true },
  })

  if (hasTransactions) {
    fail("Account cannot be deleted because it has transactions.")
  }

  await db
    .delete(accounts)
    .where(and(eq(accounts.userId, user.id), eq(accounts.id, accountId)))
}

export async function listCategoriesData(): Promise<
  CategoryHierarchyResponse[]
> {
  const user = await requireUser()
  const rows = await db.query.categories.findMany({
    where: eq(categories.userId, user.id),
    orderBy: [asc(categories.name)],
  })

  return mapCategoryTree(rows, null)
}

export async function createCategoryData(
  request: CreateCategoryRequest
): Promise<CreateCategoryResponse> {
  const user = await requireUser()
  const name = normalizeRequiredName(request.name)
  const color = normalizeCategoryColor(request.color)
  const icon = normalizeIcon(request.icon)
  const type = normalizeCategoryType(request.type)
  const parentId = request.parentId
  const now = new Date()
  const id = crypto.randomUUID()

  if (parentId) {
    const parent = await requireCategory(user.id, parentId)

    if (parent.parentId) {
      fail("Only one nesting level is allowed.")
    }

    if (parent.type !== type) {
      fail("Subcategory type must match parent type.")
    }
  }

  await db.insert(categories).values({
    id,
    userId: user.id,
    name,
    color,
    icon,
    parentId,
    type,
    createdAt: now,
    updatedAt: now,
  })

  return {
    id,
    name,
    color,
    icon,
    type,
    parentId,
  }
}

export async function updateCategoryData(
  categoryId: string,
  request: UpdateCategoryRequest
): Promise<UpdateCategoryResponse> {
  const user = await requireUser()
  const category = await requireCategory(user.id, categoryId)
  const name = normalizeRequiredName(request.name)
  const color = normalizeCategoryColor(request.color)
  const icon = normalizeIcon(request.icon)
  const parentId = request.parentId

  if (parentId === categoryId) {
    fail("Category cannot be its own parent.")
  }

  if (parentId) {
    const parent = await requireCategory(user.id, parentId)

    if (parent.parentId) {
      fail("Only one nesting level is allowed.")
    }

    if (parent.type !== category.type) {
      fail("Parent category type must match.")
    }
  }

  await db
    .update(categories)
    .set({
      name,
      color,
      icon,
      parentId,
      updatedAt: new Date(),
    })
    .where(and(eq(categories.userId, user.id), eq(categories.id, category.id)))

  return {
    id: category.id,
    name,
    color,
    icon,
    type: category.type,
    parentId,
  }
}

export async function deleteCategoryData(categoryId: string) {
  const user = await requireUser()
  await requireCategory(user.id, categoryId)

  const hasTransactions = await db.query.transactions.findFirst({
    where: and(
      eq(transactions.userId, user.id),
      eq(transactions.categoryId, categoryId)
    ),
    columns: { id: true },
  })
  const hasSubcategoryTransactions = await db.query.transactions.findFirst({
    where: and(
      eq(transactions.userId, user.id),
      eq(transactions.subCategoryId, categoryId)
    ),
    columns: { id: true },
  })

  if (hasTransactions || hasSubcategoryTransactions) {
    fail("Category cannot be deleted because it is used by transactions.")
  }

  await db
    .delete(categories)
    .where(and(eq(categories.userId, user.id), eq(categories.id, categoryId)))
}

export async function listTripsData(): Promise<TripListItemResponse[]> {
  const user = await requireUser()
  const baseCurrency = normalizeCurrencyOrDefault(user.baseCurrency, "USD")
  const fx = await getRatesToBase(baseCurrency)
  const tripRows = await db.query.trips.findMany({
    where: eq(trips.userId, user.id),
    orderBy: [desc(trips.startDate), asc(trips.name)],
  })
  const transactionRows = await listAllTransactions(user.id)
  const accountRows = await db.query.accounts.findMany({
    where: eq(accounts.userId, user.id),
  })
  const accountCurrencyById = new Map(
    accountRows.map((account) => [account.id, account.currency])
  )
  const totalsByTrip = new Map<string, number>()
  const transactionCountByTrip = new Map<string, number>()

  for (const transaction of transactionRows) {
    if (transaction.type !== "Expense" || !transaction.tripId) {
      continue
    }

    const currency = normalizeCurrencyOrDefault(
      transaction.currency ??
        accountCurrencyById.get(transaction.accountId) ??
        user.baseCurrency,
      baseCurrency
    )
    const converted = transaction.amount * (fx.ratesToBase[currency] ?? 1)

    totalsByTrip.set(
      transaction.tripId,
      roundMoney((totalsByTrip.get(transaction.tripId) ?? 0) + converted)
    )
    transactionCountByTrip.set(
      transaction.tripId,
      (transactionCountByTrip.get(transaction.tripId) ?? 0) + 1
    )
  }

  return tripRows
    .sort((left, right) => {
      const leftEmpty = left.startDate === null
      const rightEmpty = right.startDate === null

      if (leftEmpty !== rightEmpty) {
        return leftEmpty ? 1 : -1
      }

      const leftTime = left.startDate?.getTime() ?? 0
      const rightTime = right.startDate?.getTime() ?? 0
      if (leftTime !== rightTime) {
        return rightTime - leftTime
      }

      return left.name.localeCompare(right.name)
    })
    .map((trip) => ({
      id: trip.id,
      name: trip.name,
      country: trip.country,
      startDate: trip.startDate?.toISOString() ?? null,
      endDate: trip.endDate?.toISOString() ?? null,
      imageUrl: trip.imageUrl,
      transactionCount: transactionCountByTrip.get(trip.id) ?? 0,
      totalExpenseAmount: roundMoney(totalsByTrip.get(trip.id) ?? 0),
    }))
}

export async function createTripData(
  request: CreateTripRequest
): Promise<CreateTripResponse> {
  const user = await requireUser()
  const name = normalizeRequiredName(request.name)
  const country = normalizeCountry(request.country)
  const startDate = parseDateInput(request.startDate, "StartDate")
  const endDate = parseDateInput(request.endDate, "EndDate")
  const imageUrl = normalizeImageUrl(request.imageUrl)

  if (startDate > endDate) {
    fail("StartDate cannot be after EndDate.")
  }

  const id = crypto.randomUUID()
  const now = new Date()

  await db.insert(trips).values({
    id,
    userId: user.id,
    name,
    country,
    startDate,
    endDate,
    imageUrl,
    createdAt: now,
    updatedAt: now,
  })

  return {
    id,
    name,
    country,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    imageUrl,
  }
}

export async function updateTripData(
  tripId: string,
  request: UpdateTripRequest
): Promise<UpdateTripResponse> {
  const user = await requireUser()
  const trip = await requireTrip(user.id, tripId)
  const name = normalizeRequiredName(request.name)
  const country = normalizeCountry(request.country)
  const startDate = parseDateInput(request.startDate, "StartDate")
  const endDate = parseDateInput(request.endDate, "EndDate")
  const imageUrl = normalizeImageUrl(request.imageUrl)

  if (startDate > endDate) {
    fail("StartDate cannot be after EndDate.")
  }

  await db
    .update(trips)
    .set({
      name,
      country,
      startDate,
      endDate,
      imageUrl,
      updatedAt: new Date(),
    })
    .where(and(eq(trips.userId, user.id), eq(trips.id, trip.id)))

  return {
    id: trip.id,
    name,
    country,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    imageUrl,
  }
}

export async function listTransactionsData(
  page = 1,
  pageSize = 50
): Promise<TransactionListItemResponse[]> {
  const user = await requireUser()
  const currentPage = page <= 0 ? 1 : page
  const currentSize = pageSize <= 0 || pageSize > 200 ? 25 : pageSize
  const rows = await db.query.transactions.findMany({
    where: eq(transactions.userId, user.id),
    orderBy: [desc(transactions.date), desc(transactions.createdAt)],
    with: {
      items: true,
    },
    limit: currentSize,
    offset: (currentPage - 1) * currentSize,
  })

  return rows.map(mapTransactionListItem)
}

export async function getTransactionData(
  transactionId: string
): Promise<GetTransactionResponse> {
  const user = await requireUser()
  const transaction = await requireTransaction(user.id, transactionId)
  return mapTransactionDetail(transaction)
}

export async function searchTransactionsData(
  query?: GetApiTransactionsSearchData["query"]
): Promise<TransactionListItemResponse[]> {
  const user = await requireUser()
  const rows = await listAllTransactions(user.id)
  const searchText = query?.SearchText?.trim().toLowerCase()
  const start = query?.StartDate ? startOfDay(query.StartDate) : null
  const end = query?.EndDate ? endOfDay(query.EndDate) : null
  const accountIds = new Set(query?.AccountIds ?? [])
  const tripIds = new Set(query?.TripIds ?? [])
  const categoryIds = new Set(query?.CategoryIds ?? [])
  const types = new Set(query?.Types ?? [])
  const minAmount =
    query?.MinAmount === undefined
      ? null
      : parseAmount(query.MinAmount, "MinAmount")
  const maxAmount =
    query?.MaxAmount === undefined
      ? null
      : parseAmount(query.MaxAmount, "MaxAmount")

  return rows
    .filter((transaction) => {
      if (start && transaction.date < start) {
        return false
      }

      if (end && transaction.date > end) {
        return false
      }

      if (
        accountIds.size > 0 &&
        !accountIds.has(transaction.accountId) &&
        !(
          transaction.targetAccountId &&
          accountIds.has(transaction.targetAccountId)
        )
      ) {
        return false
      }

      if (
        tripIds.size > 0 &&
        (!transaction.tripId || !tripIds.has(transaction.tripId))
      ) {
        return false
      }

      if (
        categoryIds.size > 0 &&
        (!transaction.categoryId || !categoryIds.has(transaction.categoryId))
      ) {
        return false
      }

      if (types.size > 0 && !types.has(transaction.type)) {
        return false
      }

      if (minAmount !== null && transaction.amount < minAmount) {
        return false
      }

      if (maxAmount !== null && transaction.amount > maxAmount) {
        return false
      }

      if (searchText) {
        const haystack = [
          transaction.note,
          transaction.merchantName,
          transaction.location,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()

        if (!haystack.includes(searchText)) {
          return false
        }
      }

      return true
    })
    .map(mapTransactionListItem)
}

export async function createTransactionData(
  request: CreateTransactionRequest
): Promise<CreateTransactionResponse> {
  const user = await requireUser()
  const validated = await validateTransactionRequest(user, request)
  const id = crypto.randomUUID()
  const now = new Date()
  const itemsToInsert = await buildTransactionItems(request.items, id)

  db.transaction((tx) => {
    const sourceAccount = tx.query.accounts
      .findFirst({
        where: and(
          eq(accounts.userId, user.id),
          eq(accounts.id, validated.account.id)
        ),
      })
      .sync()

    if (!sourceAccount) {
      fail("Account was not found.")
    }

    let targetAccount: AccountRecord | null = null

    if (validated.targetAccount) {
      targetAccount =
        tx.query.accounts
          .findFirst({
            where: and(
              eq(accounts.userId, user.id),
              eq(accounts.id, validated.targetAccount.id)
            ),
          })
          .sync() ?? null

      if (!targetAccount) {
        fail("Target account was not found.")
      }
    }

    const deltas = getBalanceDeltas(
      validated.type,
      validated.amount,
      validated.amount2
    )

    tx.update(accounts)
      .set({
        currentBalance: roundMoney(
          sourceAccount.currentBalance + deltas.sourceDelta
        ),
        updatedAt: now,
      })
      .where(eq(accounts.id, sourceAccount.id))
      .run()

    if (targetAccount && deltas.targetDelta !== null) {
      tx.update(accounts)
        .set({
          currentBalance: roundMoney(
            targetAccount.currentBalance + deltas.targetDelta
          ),
          updatedAt: now,
        })
        .where(eq(accounts.id, targetAccount.id))
        .run()
    }

    tx.insert(transactions)
      .values({
        id,
        userId: user.id,
        date: validated.date,
        type: validated.type,
        amount: validated.amount,
        amount2: validated.amount2,
        currency: validated.currency,
        currency2: validated.currency2,
        accountId: validated.account.id,
        tripId: validated.tripId,
        categoryId: validated.categoryId,
        subCategoryId: validated.subCategoryId,
        targetAccountId: validated.targetAccount?.id ?? null,
        originalTransactionId: validated.originalTransactionId,
        isRefund: validated.type === "Refund",
        note: validated.note,
        merchantName: validated.merchantName,
        location: validated.location,
        createdAt: now,
        updatedAt: now,
      })
      .run()

    if (itemsToInsert.length > 0) {
      tx.insert(transactionItems).values(itemsToInsert).run()
    }
  })

  const created = await requireTransaction(user.id, id)
  return mapTransactionDetail(created)
}

export async function updateTransactionData(
  transactionId: string,
  request: UpdateTransactionRequest
): Promise<UpdateTransactionResponse> {
  const user = await requireUser()
  const existing = await requireTransaction(user.id, transactionId)
  const validated = await validateTransactionRequest(user, request)
  const now = new Date()
  const nextItems = await buildTransactionItems(request.items, transactionId)

  db.transaction((tx) => {
    const sourceAccount = tx.query.accounts
      .findFirst({
        where: and(
          eq(accounts.userId, user.id),
          eq(accounts.id, existing.accountId)
        ),
      })
      .sync()

    if (!sourceAccount) {
      fail("Account was not found.")
    }

    let oldTargetAccount: AccountRecord | null = null
    if (existing.targetAccountId) {
      oldTargetAccount =
        tx.query.accounts
          .findFirst({
            where: and(
              eq(accounts.userId, user.id),
              eq(accounts.id, existing.targetAccountId)
            ),
          })
          .sync() ?? null
    }

    const nextSourceAccount =
      existing.accountId === validated.account.id
        ? sourceAccount
        : tx.query.accounts
            .findFirst({
              where: and(
                eq(accounts.userId, user.id),
                eq(accounts.id, validated.account.id)
              ),
            })
            .sync()

    if (!nextSourceAccount) {
      fail("Account was not found.")
    }

    let nextTargetAccount: AccountRecord | null = null
    if (validated.targetAccount) {
      nextTargetAccount =
        existing.targetAccountId === validated.targetAccount.id
          ? oldTargetAccount
          : (tx.query.accounts
              .findFirst({
                where: and(
                  eq(accounts.userId, user.id),
                  eq(accounts.id, validated.targetAccount.id)
                ),
              })
              .sync() ?? null)
    }

    const oldDeltas = getBalanceDeltas(
      existing.type,
      existing.amount,
      existing.amount2
    )

    tx.update(accounts)
      .set({
        currentBalance: roundMoney(
          sourceAccount.currentBalance - oldDeltas.sourceDelta
        ),
        updatedAt: now,
      })
      .where(eq(accounts.id, sourceAccount.id))
      .run()

    if (oldTargetAccount && oldDeltas.targetDelta !== null) {
      tx.update(accounts)
        .set({
          currentBalance: roundMoney(
            oldTargetAccount.currentBalance - oldDeltas.targetDelta
          ),
          updatedAt: now,
        })
        .where(eq(accounts.id, oldTargetAccount.id))
        .run()
    }

    const refreshedSourceAccount = tx.query.accounts
      .findFirst({
        where: eq(accounts.id, nextSourceAccount.id),
      })
      .sync()

    if (!refreshedSourceAccount) {
      fail("Account was not found.")
    }

    const newDeltas = getBalanceDeltas(
      validated.type,
      validated.amount,
      validated.amount2
    )

    tx.update(accounts)
      .set({
        currentBalance: roundMoney(
          refreshedSourceAccount.currentBalance + newDeltas.sourceDelta
        ),
        updatedAt: now,
      })
      .where(eq(accounts.id, refreshedSourceAccount.id))
      .run()

    if (nextTargetAccount && newDeltas.targetDelta !== null) {
      const refreshedTargetAccount = tx.query.accounts
        .findFirst({
          where: eq(accounts.id, nextTargetAccount.id),
        })
        .sync()

      if (!refreshedTargetAccount) {
        fail("Target account was not found.")
      }

      tx.update(accounts)
        .set({
          currentBalance: roundMoney(
            refreshedTargetAccount.currentBalance + newDeltas.targetDelta
          ),
          updatedAt: now,
        })
        .where(eq(accounts.id, refreshedTargetAccount.id))
        .run()
    }

    tx.update(transactions)
      .set({
        date: validated.date,
        type: validated.type,
        amount: validated.amount,
        amount2: validated.amount2,
        currency: validated.currency,
        currency2: validated.currency2,
        accountId: validated.account.id,
        tripId: validated.tripId,
        categoryId: validated.categoryId,
        subCategoryId: validated.subCategoryId,
        targetAccountId: validated.targetAccount?.id ?? null,
        originalTransactionId: validated.originalTransactionId,
        isRefund: validated.type === "Refund",
        note: validated.note,
        merchantName: validated.merchantName,
        location: validated.location,
        updatedAt: now,
      })
      .where(eq(transactions.id, existing.id))
      .run()

    tx.delete(transactionItems)
      .where(eq(transactionItems.transactionId, existing.id))
      .run()

    if (nextItems.length > 0) {
      tx.insert(transactionItems).values(nextItems).run()
    }
  })

  const updated = await requireTransaction(user.id, existing.id)
  return mapTransactionDetail(updated)
}

export async function deleteTransactionData(transactionId: string) {
  const user = await requireUser()
  const transaction = await requireTransaction(user.id, transactionId)
  const now = new Date()

  db.transaction((tx) => {
    const sourceAccount = tx.query.accounts
      .findFirst({
        where: and(
          eq(accounts.userId, user.id),
          eq(accounts.id, transaction.accountId)
        ),
      })
      .sync()

    if (!sourceAccount) {
      fail("Account was not found.")
    }

    const deltas = getBalanceDeltas(
      transaction.type,
      transaction.amount,
      transaction.amount2
    )

    tx.update(accounts)
      .set({
        currentBalance: roundMoney(
          sourceAccount.currentBalance - deltas.sourceDelta
        ),
        updatedAt: now,
      })
      .where(eq(accounts.id, sourceAccount.id))
      .run()

    if (transaction.targetAccountId && deltas.targetDelta !== null) {
      const targetAccount = tx.query.accounts
        .findFirst({
          where: and(
            eq(accounts.userId, user.id),
            eq(accounts.id, transaction.targetAccountId)
          ),
        })
        .sync()

      if (targetAccount) {
        tx.update(accounts)
          .set({
            currentBalance: roundMoney(
              targetAccount.currentBalance - deltas.targetDelta
            ),
            updatedAt: now,
          })
          .where(eq(accounts.id, targetAccount.id))
          .run()
      }
    }

    tx.delete(transactionItems)
      .where(eq(transactionItems.transactionId, transaction.id))
      .run()
    tx.delete(transactions).where(eq(transactions.id, transaction.id)).run()
  })
}
