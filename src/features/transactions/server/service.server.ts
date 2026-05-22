import { and, asc, desc, eq } from "drizzle-orm"

import { normalizeCurrencyOrDefault, normalizeCurrencyOrNull } from "@/lib/currency"
import { db, runWithDb } from "@/lib/db/client.server"
import { forEachChunk, SQLITE_INSERT_BATCH_SIZE } from "@/lib/db/sqlite-batch.server"
import { accounts, transactionItems, transactions, transactionTypes } from "@/lib/db/schema"
import { getRatesToBase } from "@/lib/exchange-rate.server"
import { roundMoney } from "@/lib/finance"
import { endOfDay, parseAmount, parseDateInput, parsePositiveAmount, startOfDay } from "@/lib/server/parsing.server"

import { requireAccount, requireCategory, requireTransaction, requireTrip, requireUser } from "@/features/shared/server/lookups.server"
import {
  normalizeLocation,
  normalizeMerchantName,
  normalizeNote,
  normalizeOptionalSupportedCurrency,
  normalizeRequiredName,
  normalizeTransactionType,
  normalizeTrimmed,
} from "@/features/shared/server/normalizers.server"

import type {
  CreateTransactionRequest,
  CreateTransactionResponse,
  GetApiTransactionsSearchData,
  GetTransactionResponse,
  TransactionItemResponse,
  TransactionListItemResponse,
  UpdateTransactionRequest,
  UpdateTransactionResponse,
} from "@/features/shared/types"

type TransactionType = (typeof transactionTypes)[number]

type UserRecord = Awaited<ReturnType<typeof requireUser>>
type AccountRecord = typeof accounts.$inferSelect
type TransactionRecord = typeof transactions.$inferSelect
type TransactionItemRecord = typeof transactionItems.$inferSelect

type LoadedTransaction = TransactionRecord & {
  items: TransactionItemRecord[]
}

type TransactionSearchSummary = {
  baseCurrency: string
  transactionCount: number
  incomeCount: number
  incomeTotal: number
  expenseCount: number
  expenseTotal: number
}

function convertAmountToBase(amount: number, sourceCurrency: string | null | undefined, baseCurrency: string, ratesToBase: Record<string, number>) {
  if (amount === 0) {
    return 0
  }

  const normalizedSource = normalizeCurrencyOrDefault(sourceCurrency, baseCurrency)
  return amount * (ratesToBase[normalizedSource] ?? 1)
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

function normalizeAmount2(type: TransactionType, amount: number, amount2: number | null | undefined) {
  if (type === "Transfer") {
    return amount2 && amount2 > 0 ? amount2 : amount
  }

  return amount2 ?? null
}

function mapTransactionItems(items: TransactionItemRecord[]): TransactionItemResponse[] {
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

function mapTransactionListItem(transaction: LoadedTransaction): TransactionListItemResponse {
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

function mapTransactionDetail(transaction: LoadedTransaction): GetTransactionResponse & CreateTransactionResponse & UpdateTransactionResponse {
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

function filterTransactions(rows: LoadedTransaction[], query?: GetApiTransactionsSearchData["query"]) {
  const searchText = query?.SearchText?.trim().toLowerCase()
  const start = query?.StartDate ? startOfDay(query.StartDate) : null
  const end = query?.EndDate ? endOfDay(query.EndDate) : null
  const accountIds = new Set(query?.AccountIds ?? [])
  const tripIds = new Set(query?.TripIds ?? [])
  const categoryIds = new Set(query?.CategoryIds ?? [])
  const types = new Set(query?.Types ?? [])
  const minAmount = query?.MinAmount === undefined ? null : parseAmount(query.MinAmount, "MinAmount")
  const maxAmount = query?.MaxAmount === undefined ? null : parseAmount(query.MaxAmount, "MaxAmount")

  return rows.filter((transaction) => {
    if (start && transaction.date < start) {
      return false
    }

    if (end && transaction.date > end) {
      return false
    }

    if (accountIds.size > 0 && !accountIds.has(transaction.accountId) && !(transaction.targetAccountId && accountIds.has(transaction.targetAccountId))) {
      return false
    }

    if (tripIds.size > 0 && (!transaction.tripId || !tripIds.has(transaction.tripId))) {
      return false
    }

    if (categoryIds.size > 0 && (!transaction.categoryId || !categoryIds.has(transaction.categoryId))) {
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
      const haystack = [transaction.note, transaction.merchantName, transaction.location].filter(Boolean).join(" ").toLowerCase()

      if (!haystack.includes(searchText)) {
        return false
      }
    }

    return true
  })
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

async function buildTransactionItems(itemsInput: CreateTransactionRequest["items"] | UpdateTransactionRequest["items"], transactionId: string) {
  const rows: (typeof transactionItems.$inferInsert)[] = []

  for (const item of itemsInput ?? []) {
    const name = normalizeRequiredName(item.name, "Item name")
    const quantity = item.quantity ? parseAmount(item.quantity, "Quantity") : 1
    const unitPrice = parseAmount(item.unitPrice, "Unit price")
    const promotionAmount = parseAmount(item.promotionAmount, "Promotion amount")
    const finalAmount = unitPrice * (quantity > 0 ? quantity : 1) - promotionAmount

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

async function validateTransactionRequest(user: UserRecord, request: CreateTransactionRequest | UpdateTransactionRequest) {
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
    currency:
      type === "Transfer"
        ? normalizeCurrencyOrDefault(account.currency, "USD")
        : (normalizeOptionalSupportedCurrency(request.currency) ?? normalizeCurrencyOrDefault(account.currency, "USD")),
    currency2: type === "Transfer" ? normalizeCurrencyOrDefault(targetAccount?.currency, "USD") : normalizeCurrencyOrNull(request.currency2),
  }
}

export async function getTransactionData(transactionId: string): Promise<GetTransactionResponse> {
  const user = await requireUser()
  const transaction = await requireTransaction(user.id, transactionId)
  return mapTransactionDetail(transaction)
}

export async function searchTransactionsData(query?: GetApiTransactionsSearchData["query"]): Promise<TransactionListItemResponse[]> {
  const user = await requireUser()
  const rows = await listAllTransactions(user.id)
  const filtered = filterTransactions(rows, query)

  const page = query?.Page
  const pageSize = query?.PageSize

  if (page !== undefined || pageSize !== undefined) {
    const currentPage = !page || page <= 0 ? 1 : page
    const currentSize = !pageSize || pageSize <= 0 || pageSize > 200 ? 25 : pageSize
    const offset = (currentPage - 1) * currentSize
    return filtered.slice(offset, offset + currentSize).map(mapTransactionListItem)
  }

  return filtered.map(mapTransactionListItem)
}

export async function searchTransactionsSummaryData(query?: GetApiTransactionsSearchData["query"]): Promise<TransactionSearchSummary> {
  const user = await requireUser()
  const rows = filterTransactions(await listAllTransactions(user.id), query)
  const baseCurrency = normalizeCurrencyOrDefault(user.baseCurrency, "USD")
  const fx = await getRatesToBase(baseCurrency)
  const accountRows = await db.query.accounts.findMany({
    where: eq(accounts.userId, user.id),
  })
  const accountCurrencyById = new Map(accountRows.map((account) => [account.id, account.currency]))

  let incomeCount = 0
  let incomeTotal = 0
  let expenseCount = 0
  let expenseTotal = 0

  for (const transaction of rows) {
    const currency = normalizeCurrencyOrDefault(transaction.currency ?? accountCurrencyById.get(transaction.accountId) ?? user.baseCurrency, baseCurrency)
    const converted = convertAmountToBase(transaction.amount, currency, baseCurrency, fx.ratesToBase)

    if (transaction.type === "Income") {
      incomeCount += 1
      incomeTotal += converted
    }

    if (transaction.type === "Expense") {
      expenseCount += 1
      expenseTotal += converted
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

export async function createTransactionData(request: CreateTransactionRequest): Promise<CreateTransactionResponse> {
  const user = await requireUser()
  const validated = await validateTransactionRequest(user, request)
  const id = crypto.randomUUID()
  const now = new Date()
  const itemsToInsert = await buildTransactionItems(request.items, id)

  await runWithDb(async (database) => {
    const sourceAccount = await database.query.accounts
      .findFirst({
        where: and(eq(accounts.userId, user.id), eq(accounts.id, validated.account.id)),
      })

    if (!sourceAccount) {
      throw new Error("Account was not found.")
    }

    let targetAccount: AccountRecord | null = null

    if (validated.targetAccount) {
      targetAccount =
        (await database.query.accounts
          .findFirst({
            where: and(eq(accounts.userId, user.id), eq(accounts.id, validated.targetAccount.id)),
          })) ?? null

      if (!targetAccount) {
        throw new Error("Target account was not found.")
      }
    }

    const deltas = getBalanceDeltas(validated.type, validated.amount, validated.amount2)

    await database.update(accounts)
      .set({
        currentBalance: roundMoney(sourceAccount.currentBalance + deltas.sourceDelta),
        updatedAt: now,
      })
      .where(eq(accounts.id, sourceAccount.id))

    if (targetAccount && deltas.targetDelta !== null) {
      await database.update(accounts)
        .set({
          currentBalance: roundMoney(targetAccount.currentBalance + deltas.targetDelta),
          updatedAt: now,
        })
        .where(eq(accounts.id, targetAccount.id))
    }

    await database.insert(transactions)
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

    if (itemsToInsert.length > 0) {
      await forEachChunk(itemsToInsert, SQLITE_INSERT_BATCH_SIZE, async (chunk) => {
        await database.insert(transactionItems).values(chunk)
      })
    }
  })

  const created = await requireTransaction(user.id, id)
  return mapTransactionDetail(created)
}

export async function updateTransactionData(transactionId: string, request: UpdateTransactionRequest): Promise<UpdateTransactionResponse> {
  const user = await requireUser()
  const existing = await requireTransaction(user.id, transactionId)
  const validated = await validateTransactionRequest(user, request)
  const now = new Date()
  const nextItems = await buildTransactionItems(request.items, transactionId)

  await runWithDb(async (database) => {
    const sourceAccount = await database.query.accounts
      .findFirst({
        where: and(eq(accounts.userId, user.id), eq(accounts.id, existing.accountId)),
      })

    if (!sourceAccount) {
      throw new Error("Account was not found.")
    }

    let oldTargetAccount: AccountRecord | null = null
    if (existing.targetAccountId) {
      oldTargetAccount =
        (await database.query.accounts
          .findFirst({
            where: and(eq(accounts.userId, user.id), eq(accounts.id, existing.targetAccountId)),
          })) ?? null
    }

    const nextSourceAccount =
      existing.accountId === validated.account.id
        ? sourceAccount
        : await database.query.accounts
            .findFirst({
              where: and(eq(accounts.userId, user.id), eq(accounts.id, validated.account.id)),
            })

    if (!nextSourceAccount) {
      throw new Error("Account was not found.")
    }

    let nextTargetAccount: AccountRecord | null = null
    if (validated.targetAccount) {
      nextTargetAccount =
        existing.targetAccountId === validated.targetAccount.id
          ? oldTargetAccount
          : ((await database.query.accounts
              .findFirst({
                where: and(eq(accounts.userId, user.id), eq(accounts.id, validated.targetAccount.id)),
              })
              ) ?? null)
    }

    const oldDeltas = getBalanceDeltas(existing.type, existing.amount, existing.amount2)

    await database.update(accounts)
      .set({
        currentBalance: roundMoney(sourceAccount.currentBalance - oldDeltas.sourceDelta),
        updatedAt: now,
      })
      .where(eq(accounts.id, sourceAccount.id))

    if (oldTargetAccount && oldDeltas.targetDelta !== null) {
      await database.update(accounts)
        .set({
          currentBalance: roundMoney(oldTargetAccount.currentBalance - oldDeltas.targetDelta),
          updatedAt: now,
        })
        .where(eq(accounts.id, oldTargetAccount.id))
    }

    const refreshedSourceAccount = await database.query.accounts
      .findFirst({
        where: eq(accounts.id, nextSourceAccount.id),
      })

    if (!refreshedSourceAccount) {
      throw new Error("Account was not found.")
    }

    const newDeltas = getBalanceDeltas(validated.type, validated.amount, validated.amount2)

    await database.update(accounts)
      .set({
        currentBalance: roundMoney(refreshedSourceAccount.currentBalance + newDeltas.sourceDelta),
        updatedAt: now,
      })
      .where(eq(accounts.id, refreshedSourceAccount.id))

    if (nextTargetAccount && newDeltas.targetDelta !== null) {
      const refreshedTargetAccount = await database.query.accounts
        .findFirst({
          where: eq(accounts.id, nextTargetAccount.id),
        })

      if (!refreshedTargetAccount) {
        throw new Error("Target account was not found.")
      }

      await database.update(accounts)
        .set({
          currentBalance: roundMoney(refreshedTargetAccount.currentBalance + newDeltas.targetDelta),
          updatedAt: now,
        })
        .where(eq(accounts.id, refreshedTargetAccount.id))
    }

    await database.update(transactions)
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

    await database.delete(transactionItems).where(eq(transactionItems.transactionId, existing.id))

    if (nextItems.length > 0) {
      await forEachChunk(nextItems, SQLITE_INSERT_BATCH_SIZE, async (chunk) => {
        await database.insert(transactionItems).values(chunk)
      })
    }
  })

  const updated = await requireTransaction(user.id, existing.id)
  return mapTransactionDetail(updated)
}

export async function deleteTransactionData(transactionId: string) {
  const user = await requireUser()
  const transaction = await requireTransaction(user.id, transactionId)
  const now = new Date()

  await runWithDb(async (database) => {
    const sourceAccount = await database.query.accounts
      .findFirst({
        where: and(eq(accounts.userId, user.id), eq(accounts.id, transaction.accountId)),
      })

    if (!sourceAccount) {
      throw new Error("Account was not found.")
    }

    const deltas = getBalanceDeltas(transaction.type, transaction.amount, transaction.amount2)

    await database.update(accounts)
      .set({
        currentBalance: roundMoney(sourceAccount.currentBalance - deltas.sourceDelta),
        updatedAt: now,
      })
      .where(eq(accounts.id, sourceAccount.id))

    if (transaction.targetAccountId && deltas.targetDelta !== null) {
      const targetAccount = await database.query.accounts
        .findFirst({
          where: and(eq(accounts.userId, user.id), eq(accounts.id, transaction.targetAccountId)),
        })

      if (targetAccount) {
        await database.update(accounts)
          .set({
            currentBalance: roundMoney(targetAccount.currentBalance - deltas.targetDelta),
            updatedAt: now,
          })
          .where(eq(accounts.id, targetAccount.id))
        }
    }

    await database.delete(transactionItems).where(eq(transactionItems.transactionId, transaction.id))
    await database.delete(transactions).where(eq(transactions.id, transaction.id))
  })
}
