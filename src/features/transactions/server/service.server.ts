import { and, desc, eq, gte, inArray, lte, or, sql, type SQL } from "drizzle-orm"

import { normalizeCurrencyOrDefault, normalizeCurrencyOrNull } from "@/lib/currency"
import { db, runDbTransaction, type AppTransaction } from "@/lib/db/client.server"
import { accounts, transactions, transactionTypes } from "@/lib/db/schema"
import { getRatesToBase } from "@/lib/exchange-rate.server"
import { roundMoney } from "@/lib/finance"
import { endOfDay, parseAmount, parseDateInput, parsePositiveAmount, startOfDay } from "@/lib/server/parsing.server"

import { convertAmountToBase, loadAccountCurrencyMap, resolveTransactionCurrency } from "@/features/shared/server/fx.server"
import { requireAccount, requireCategory, requireTransaction, requireTrip, requireUser } from "@/features/shared/server/lookups.server"
import {
  normalizeLocation,
  normalizeMerchantName,
  normalizeNote,
  normalizeOptionalSupportedCurrency,
  normalizeTransactionType,
} from "@/features/shared/server/normalizers.server"

import type { TransactionResponse, TransactionSearchQuery, TransactionWriteRequest } from "@/features/shared/types"
import type { TransactionSearchFacets, TransactionSearchSummary } from "@/features/transactions/types"

type TransactionType = (typeof transactionTypes)[number]

type UserRecord = Awaited<ReturnType<typeof requireUser>>
type AccountRecord = typeof accounts.$inferSelect
type TransactionRecord = typeof transactions.$inferSelect

type TransactionListRow = Pick<
  TransactionRecord,
  | "id"
  | "date"
  | "type"
  | "amount"
  | "amount2"
  | "currency"
  | "currency2"
  | "accountId"
  | "tripId"
  | "categoryId"
  | "subCategoryId"
  | "targetAccountId"
  | "originalTransactionId"
  | "isRefund"
  | "note"
  | "merchantName"
  | "location"
>

type TransactionSummaryRow = Pick<TransactionRecord, "accountId" | "amount" | "currency" | "type">

type TransactionFacetRow = Pick<TransactionRecord, "accountId" | "targetAccountId" | "categoryId" | "tripId" | "type" | "amount">

type NormalizedTransactionSearch = {
  start: Date | null
  end: Date | null
  accountIds: string[]
  tripIds: string[]
  categoryIds: string[]
  types: TransactionType[]
  searchText: string | null
  minAmount: number | null
  maxAmount: number | null
  page: number | null
  pageSize: number | null
}

function typeMatches(categoryType: "Income" | "Expense", transactionType: TransactionType) {
  if (categoryType === "Income") {
    return transactionType === "Income"
  }

  return transactionType === "Expense" || transactionType === "Refund"
}

function getBalanceDeltas(type: TransactionType, amount: number, amount2: number | null) {
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

// SQL-side arithmetic keeps concurrent mutations from losing deltas and removes the need to
// re-read balances mid-operation.
function applyBalanceDelta(tx: AppTransaction, accountId: string, delta: number, now: Date) {
  if (delta === 0) {
    return
  }

  tx.update(accounts)
    .set({
      currentBalance: sql`round(${accounts.currentBalance} + ${delta}, 2)`,
      updatedAt: now,
    })
    .where(eq(accounts.id, accountId))
    .run()
}

async function findDependentRefund(userId: string, transactionId: string) {
  return db.query.transactions.findFirst({
    where: and(eq(transactions.userId, userId), eq(transactions.originalTransactionId, transactionId)),
    columns: { id: true },
  })
}

function normalizeAmount2(type: TransactionType, amount: number, amount2: number | null | undefined) {
  if (type === "Transfer") {
    return amount2 && amount2 > 0 ? amount2 : amount
  }

  return amount2 ?? null
}

function mapTransaction(transaction: TransactionListRow): TransactionResponse {
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
  }
}

function normalizeTransactionSearchQuery(query?: TransactionSearchQuery): NormalizedTransactionSearch {
  const page = query?.Page && query.Page > 0 ? query.Page : null
  const pageSize = query?.PageSize && query.PageSize > 0 ? Math.min(query.PageSize, 200) : null

  return {
    start: query?.StartDate ? startOfDay(query.StartDate) : null,
    end: query?.EndDate ? endOfDay(query.EndDate) : null,
    accountIds: query?.AccountIds ?? [],
    tripIds: query?.TripIds ?? [],
    categoryIds: query?.CategoryIds ?? [],
    types: query?.Types ?? [],
    searchText: query?.SearchText?.trim().toLowerCase() || null,
    minAmount: query?.MinAmount === undefined ? null : parseAmount(query.MinAmount, "MinAmount"),
    maxAmount: query?.MaxAmount === undefined ? null : parseAmount(query.MaxAmount, "MaxAmount"),
    page,
    pageSize,
  }
}

function buildTransactionWhere(userId: string, query: NormalizedTransactionSearch) {
  const conditions: SQL<unknown>[] = [eq(transactions.userId, userId)]

  if (query.start) {
    conditions.push(gte(transactions.date, query.start))
  }

  if (query.end) {
    conditions.push(lte(transactions.date, query.end))
  }

  if (query.accountIds.length > 0) {
    conditions.push(or(inArray(transactions.accountId, query.accountIds), inArray(transactions.targetAccountId, query.accountIds))!)
  }

  if (query.tripIds.length > 0) {
    conditions.push(inArray(transactions.tripId, query.tripIds))
  }

  if (query.categoryIds.length > 0) {
    conditions.push(inArray(transactions.categoryId, query.categoryIds))
  }

  if (query.types.length > 0) {
    conditions.push(inArray(transactions.type, query.types))
  }

  if (query.minAmount !== null) {
    conditions.push(gte(transactions.amount, query.minAmount))
  }

  if (query.maxAmount !== null) {
    conditions.push(lte(transactions.amount, query.maxAmount))
  }

  if (query.searchText) {
    // Escape LIKE wildcards so searching "100%" matches literally instead of "100 anything".
    const escaped = query.searchText.replace(/[\\%_]/g, (match) => `\\${match}`)
    const pattern = `%${escaped}%`
    conditions.push(
      sql`lower(coalesce(${transactions.note}, '') || ' ' || coalesce(${transactions.merchantName}, '') || ' ' || coalesce(${transactions.location}, '')) like ${pattern} escape '\\'`
    )
  }

  return and(...conditions)!
}

async function listTransactionRows(userId: string, query?: TransactionSearchQuery): Promise<TransactionListRow[]> {
  const normalizedQuery = normalizeTransactionSearchQuery(query)
  const whereClause = buildTransactionWhere(userId, normalizedQuery)
  const select = {
    id: transactions.id,
    date: transactions.date,
    type: transactions.type,
    amount: transactions.amount,
    amount2: transactions.amount2,
    currency: transactions.currency,
    currency2: transactions.currency2,
    accountId: transactions.accountId,
    tripId: transactions.tripId,
    categoryId: transactions.categoryId,
    subCategoryId: transactions.subCategoryId,
    targetAccountId: transactions.targetAccountId,
    originalTransactionId: transactions.originalTransactionId,
    isRefund: transactions.isRefund,
    note: transactions.note,
    merchantName: transactions.merchantName,
    location: transactions.location,
  }

  if (normalizedQuery.page && normalizedQuery.pageSize) {
    const offset = (normalizedQuery.page - 1) * normalizedQuery.pageSize

    return db
      .select(select)
      .from(transactions)
      .where(whereClause)
      .orderBy(desc(transactions.date), desc(transactions.createdAt))
      .limit(normalizedQuery.pageSize)
      .offset(offset)
  }

  return db.select(select).from(transactions).where(whereClause).orderBy(desc(transactions.date), desc(transactions.createdAt))
}

async function listTransactionSummaryRows(userId: string, query?: TransactionSearchQuery): Promise<TransactionSummaryRow[]> {
  return db
    .select({
      accountId: transactions.accountId,
      amount: transactions.amount,
      currency: transactions.currency,
      type: transactions.type,
    })
    .from(transactions)
    .where(buildTransactionWhere(userId, normalizeTransactionSearchQuery(query)))
}

async function listTransactionFacetRows(userId: string, query?: TransactionSearchQuery): Promise<TransactionFacetRow[]> {
  return db
    .select({
      accountId: transactions.accountId,
      targetAccountId: transactions.targetAccountId,
      categoryId: transactions.categoryId,
      tripId: transactions.tripId,
      type: transactions.type,
      amount: transactions.amount,
    })
    .from(transactions)
    .where(buildTransactionWhere(userId, normalizeTransactionSearchQuery(query)))
}

async function validateTransactionRequest(user: UserRecord, request: TransactionWriteRequest, currentTransactionId?: string) {
  const type = normalizeTransactionType(request.type)
  const amount = parsePositiveAmount(request.amount, "Amount")
  const amount2 = request.amount2 === null || request.amount2 === undefined ? null : parsePositiveAmount(request.amount2, "Amount2")
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
  let refundSourceCurrency: string | null = null

  if (type === "Transfer") {
    if (!request.targetAccountId) {
      throw new Error("Target account is required for transfers.")
    }

    if (request.targetAccountId === request.accountId) {
      throw new Error("Target account must be different from source account.")
    }

    if (request.categoryId) {
      throw new Error("Category is not applicable for transfers.")
    }

    if (request.tripId) {
      throw new Error("Trip is only applicable for expense transactions.")
    }

    if (request.originalTransactionId) {
      throw new Error("Original transaction is only valid for refunds.")
    }

    targetAccount = await requireAccount(user.id, request.targetAccountId)
    categoryId = null
    subCategoryId = null
    tripId = null

    const sourceCurrency = normalizeCurrencyOrNull(request.currency)
    if (sourceCurrency && sourceCurrency !== normalizeCurrencyOrDefault(account.currency, "USD")) {
      throw new Error("Transfer source currency must match source account currency.")
    }

    const targetCurrency = normalizeCurrencyOrNull(request.currency2)
    if (targetCurrency && targetCurrency !== normalizeCurrencyOrDefault(targetAccount.currency, "USD")) {
      throw new Error("Transfer target currency must match target account currency.")
    }
  } else if (type === "Refund") {
    if (request.targetAccountId) {
      throw new Error("Target account is only valid for transfers.")
    }

    if (!request.originalTransactionId) {
      throw new Error("Original transaction is required for refunds.")
    }

    if (request.tripId) {
      throw new Error("Trip is inherited from the original expense for refunds.")
    }

    if (currentTransactionId && request.originalTransactionId === currentTransactionId) {
      throw new Error("A transaction cannot refund itself.")
    }

    const originalTransaction = await requireTransaction(user.id, request.originalTransactionId)

    if (originalTransaction.type !== "Expense") {
      throw new Error("Refunds can only reference expense transactions.")
    }

    if (originalTransaction.accountId !== request.accountId) {
      throw new Error("Refunds must use the same account as the original transaction.")
    }

    if (request.categoryId && request.categoryId !== originalTransaction.categoryId) {
      throw new Error("Refund category must match the original transaction.")
    }

    if (request.subCategoryId && request.subCategoryId !== originalTransaction.subCategoryId) {
      throw new Error("Refund subcategory must match the original transaction.")
    }

    categoryId = originalTransaction.categoryId
    subCategoryId = originalTransaction.subCategoryId
    tripId = originalTransaction.tripId
    originalTransactionId = originalTransaction.id
    refundSourceCurrency = normalizeCurrencyOrNull(originalTransaction.currency)

    if (!categoryId) {
      throw new Error("Refunds require a category.")
    }

    const refundCategory = await requireCategory(user.id, categoryId)
    if (refundCategory.type !== "Expense") {
      throw new Error("Refunds must use an expense category.")
    }
  } else {
    if (request.targetAccountId) {
      throw new Error("Target account is only valid for transfers.")
    }

    if (request.originalTransactionId) {
      throw new Error("Original transaction is only valid for refunds.")
    }

    if (type !== "Expense" && request.tripId) {
      throw new Error("Trip is only applicable for expense transactions.")
    }

    if (type === "Expense" && request.tripId) {
      await requireTrip(user.id, request.tripId)
    }

    if (type !== "Expense") {
      tripId = null
    }

    if (!request.categoryId) {
      throw new Error("Category is required.")
    }

    const category = await requireCategory(user.id, request.categoryId)
    if (!typeMatches(category.type, type)) {
      throw new Error("Transaction type must match category type.")
    }

    if (request.subCategoryId) {
      const subCategory = await requireCategory(user.id, request.subCategoryId)

      if (subCategory.parentId !== request.categoryId) {
        throw new Error("Subcategory must be a child of the category.")
      }

      if (subCategory.type !== category.type) {
        throw new Error("Subcategory type must match category type.")
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
    // Refunds inherit the original expense's currency by default so reports subtract them at
    // the same rate they were added.
    currency:
      type === "Transfer"
        ? normalizeCurrencyOrDefault(account.currency, "USD")
        : (normalizeOptionalSupportedCurrency(request.currency) ?? refundSourceCurrency ?? normalizeCurrencyOrDefault(account.currency, "USD")),
    currency2: type === "Transfer" ? normalizeCurrencyOrDefault(targetAccount?.currency, "USD") : normalizeCurrencyOrNull(request.currency2),
  }
}

export async function getTransactionData(transactionId: string): Promise<TransactionResponse> {
  const user = await requireUser()
  const transaction = await requireTransaction(user.id, transactionId)
  return mapTransaction(transaction)
}

export async function searchTransactionsData(query?: TransactionSearchQuery): Promise<TransactionResponse[]> {
  const user = await requireUser()
  const rows = await listTransactionRows(user.id, query)
  return rows.map(mapTransaction)
}

export async function searchTransactionsSummaryData(query?: TransactionSearchQuery): Promise<TransactionSearchSummary> {
  const user = await requireUser()
  const rows = await listTransactionSummaryRows(user.id, query)
  const baseCurrency = normalizeCurrencyOrDefault(user.baseCurrency, "USD")
  const fx = await getRatesToBase(baseCurrency)
  const accountCurrencyById = await loadAccountCurrencyMap(user.id)

  let incomeCount = 0
  let incomeTotal = 0
  let expenseCount = 0
  let expenseTotal = 0

  for (const transaction of rows) {
    const currency = resolveTransactionCurrency(transaction, accountCurrencyById, baseCurrency)
    const converted = convertAmountToBase(transaction.amount, currency, baseCurrency, fx.ratesToBase)

    if (transaction.type === "Income") {
      incomeCount += 1
      incomeTotal += converted
    }

    if (transaction.type === "Expense") {
      expenseCount += 1
      expenseTotal += converted
    }

    // Refunds reduce spending, matching how every report treats them.
    if (transaction.type === "Refund") {
      expenseTotal -= converted
    }
  }

  return {
    baseCurrency,
    transactionCount: rows.length,
    incomeCount,
    incomeTotal: roundMoney(incomeTotal),
    expenseCount,
    expenseTotal: roundMoney(expenseTotal),
  }
}

export async function searchTransactionsFacetsData(query?: TransactionSearchQuery): Promise<TransactionSearchFacets> {
  const user = await requireUser()
  const rows = await listTransactionFacetRows(user.id, query)
  const accountCounts: Record<string, number> = {}
  const categoryCounts: Record<string, number> = {}
  const tripCounts: Record<string, number> = {}
  const transactionTypeCounts: Record<string, number> = {}
  let maxAvailableAmount = 0

  for (const transaction of rows) {
    accountCounts[transaction.accountId] = (accountCounts[transaction.accountId] ?? 0) + 1

    if (transaction.targetAccountId) {
      accountCounts[transaction.targetAccountId] = (accountCounts[transaction.targetAccountId] ?? 0) + 1
    }

    if (transaction.categoryId) {
      categoryCounts[transaction.categoryId] = (categoryCounts[transaction.categoryId] ?? 0) + 1
    }

    if (transaction.tripId) {
      tripCounts[transaction.tripId] = (tripCounts[transaction.tripId] ?? 0) + 1
    }

    transactionTypeCounts[transaction.type] = (transactionTypeCounts[transaction.type] ?? 0) + 1
    maxAvailableAmount = Math.max(maxAvailableAmount, Number(transaction.amount))
  }

  return {
    accountCounts,
    categoryCounts,
    tripCounts,
    transactionTypeCounts,
    maxAvailableAmount,
  }
}

// Thrown when the transaction was durably committed but the follow-up read to build the
// response failed. Callers that only need the id (e.g. email auto-import) can recover from
// this without re-creating and duplicating the transaction.
export class TransactionCommittedButNotReadError extends Error {
  transactionId: string

  constructor(transactionId: string, options?: { cause?: unknown }) {
    super("The transaction was created but could not be read back.", options)
    this.name = "TransactionCommittedButNotReadError"
    this.transactionId = transactionId
  }
}

export type CreateTransactionForUserOptions = {
  // Runs inside the same DB transaction as the insert, so linking the new transaction to
  // another row (e.g. an email import item) commits or rolls back atomically with it.
  // Throwing here rolls back the whole creation.
  withinTransaction?: (tx: AppTransaction, transactionId: string) => void
}

export async function createTransactionData(request: TransactionWriteRequest): Promise<TransactionResponse> {
  const user = await requireUser()
  return createTransactionForUser(user, request)
}

// Session-independent creation path shared with background jobs (email import). Enforces
// the same validation and balance bookkeeping as interactive creation.
export async function createTransactionForUser(
  user: UserRecord,
  request: TransactionWriteRequest,
  options?: CreateTransactionForUserOptions
): Promise<TransactionResponse> {
  const validated = await validateTransactionRequest(user, request)
  const id = crypto.randomUUID()
  const now = new Date()

  runDbTransaction((tx) => {
    const deltas = getBalanceDeltas(validated.type, validated.amount, validated.amount2)

    applyBalanceDelta(tx, validated.account.id, deltas.sourceDelta, now)

    if (validated.targetAccount && deltas.targetDelta !== null) {
      applyBalanceDelta(tx, validated.targetAccount.id, deltas.targetDelta, now)
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

    options?.withinTransaction?.(tx, id)
  })

  // The transaction is committed at this point. A failure reading it back must not discard
  // the successful write — otherwise the email-import path would mark the item "error" and
  // re-create a duplicate on the next sync/re-parse.
  try {
    const created = await requireTransaction(user.id, id)
    return mapTransaction(created)
  } catch (error) {
    throw new TransactionCommittedButNotReadError(id, { cause: error })
  }
}

export async function updateTransactionData(transactionId: string, request: TransactionWriteRequest): Promise<TransactionResponse> {
  const user = await requireUser()
  const existing = await requireTransaction(user.id, transactionId)
  const validated = await validateTransactionRequest(user, request, transactionId)
  const now = new Date()

  // Refunds inherit account/category from their original expense — don't let an edit pull
  // that expense out from under them.
  const dependentRefund = await findDependentRefund(user.id, existing.id)

  if (
    dependentRefund &&
    (validated.type !== "Expense" ||
      validated.account.id !== existing.accountId ||
      validated.categoryId !== existing.categoryId ||
      validated.subCategoryId !== existing.subCategoryId)
  ) {
    throw new Error("This transaction has refunds linked to it. Update or delete the refunds first.")
  }

  runDbTransaction((tx) => {
    const oldDeltas = getBalanceDeltas(existing.type, existing.amount, existing.amount2)

    applyBalanceDelta(tx, existing.accountId, -oldDeltas.sourceDelta, now)

    if (existing.targetAccountId && oldDeltas.targetDelta !== null) {
      applyBalanceDelta(tx, existing.targetAccountId, -oldDeltas.targetDelta, now)
    }

    const newDeltas = getBalanceDeltas(validated.type, validated.amount, validated.amount2)

    applyBalanceDelta(tx, validated.account.id, newDeltas.sourceDelta, now)

    if (validated.targetAccount && newDeltas.targetDelta !== null) {
      applyBalanceDelta(tx, validated.targetAccount.id, newDeltas.targetDelta, now)
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
      .where(and(eq(transactions.id, existing.id), eq(transactions.userId, user.id)))
      .run()
  })

  const updated = await requireTransaction(user.id, existing.id)
  return mapTransaction(updated)
}

export async function deleteTransactionData(transactionId: string) {
  const user = await requireUser()
  const transaction = await requireTransaction(user.id, transactionId)
  const now = new Date()

  const dependentRefund = await findDependentRefund(user.id, transaction.id)

  if (dependentRefund) {
    throw new Error("This transaction has refunds linked to it. Delete the refunds first.")
  }

  runDbTransaction((tx) => {
    const deltas = getBalanceDeltas(transaction.type, transaction.amount, transaction.amount2)

    applyBalanceDelta(tx, transaction.accountId, -deltas.sourceDelta, now)

    if (transaction.targetAccountId && deltas.targetDelta !== null) {
      applyBalanceDelta(tx, transaction.targetAccountId, -deltas.targetDelta, now)
    }

    tx.delete(transactions)
      .where(and(eq(transactions.id, transaction.id), eq(transactions.userId, user.id)))
      .run()
  })
}
