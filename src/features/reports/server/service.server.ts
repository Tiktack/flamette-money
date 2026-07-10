import { asc, eq } from "drizzle-orm"

import { convertAmountToBase, loadAccountCurrencyMap, resolveTransactionCurrency } from "@/features/shared/server/fx.server"
import { requireUser } from "@/features/shared/server/lookups.server"
import { normalizeCurrencyOrDefault, normalizeCurrencyOrNull } from "@/lib/currency"
import { db } from "@/lib/db/client.server"
import { roundMoney } from "@/lib/finance"
import { accounts, categories, transactions, trips } from "@/lib/db/schema"
import { getRatesToBase } from "@/lib/exchange-rate.server"
import { endOfDay, parseDateInput, startOfDay } from "@/lib/server/parsing.server"

import type {
  CashflowSeriesReportQuery,
  CashflowSeriesReportResponse,
  CategorySeriesReportQuery,
  CategorySeriesReportResponse,
  ComparisonReportQuery,
  ComparisonReportResponse,
  PortfolioBalanceSeriesQuery,
  PortfolioBalanceSeriesResponse,
  ReportBucketResponse,
  ReportInterval,
} from "@/features/shared/types"

type CategoryType = "Income" | "Expense"
type TransactionType = "Income" | "Expense" | "Transfer" | "Refund"

type ReportTransaction = typeof transactions.$inferSelect
type ReportCategory = typeof categories.$inferSelect

type Bucket = {
  key: string
  label: string
  start: Date
  end: Date
}

// Transaction dates are stored as UTC midnights, so every piece of bucket/date math below
// must use UTC — mixing in local-time Date methods shifts amounts into the wrong bucket on
// any non-UTC server.
function asDateOnly(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()))
}

function endOfDate(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), 23, 59, 59, 999))
}

function addUtcDays(value: Date, days: number) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate() + days))
}

function utcMonthStart(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1))
}

function monthKey(value: Date) {
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}`
}

function resolveReportInterval(startDate: Date, endDate: Date, requested: ReportInterval | undefined) {
  if (requested && requested !== "Auto") {
    return requested
  }

  const isSameMonth = startDate.getUTCFullYear() === endDate.getUTCFullYear() && startDate.getUTCMonth() === endDate.getUTCMonth()
  if (isSameMonth) {
    return "Day" as const
  }

  const monthSpan = (endDate.getUTCFullYear() - startDate.getUTCFullYear()) * 12 + endDate.getUTCMonth() - startDate.getUTCMonth()
  if (monthSpan > 3) {
    return "Month" as const
  }

  const daySpan = Math.floor((asDateOnly(endDate).getTime() - asDateOnly(startDate).getTime()) / 86_400_000) + 1
  if (daySpan > 31) {
    return "Week" as const
  }

  return "Day" as const
}

function resolvePortfolioInterval(startDate: Date, endDate: Date, requested: ReportInterval | undefined) {
  if (requested && requested !== "Auto") {
    return requested
  }

  const isSameMonth = startDate.getUTCFullYear() === endDate.getUTCFullYear() && startDate.getUTCMonth() === endDate.getUTCMonth()
  if (isSameMonth) {
    return "Day" as const
  }

  const monthSpan = (endDate.getUTCFullYear() - startDate.getUTCFullYear()) * 12 + endDate.getUTCMonth() - startDate.getUTCMonth()
  if (monthSpan > 6) {
    return "Month" as const
  }

  const daySpan = Math.floor((asDateOnly(endDate).getTime() - asDateOnly(startDate).getTime()) / 86_400_000) + 1
  if (daySpan > 45) {
    return "Week" as const
  }

  return "Day" as const
}

function buildBuckets(startDate: Date, endDate: Date, interval: ReportInterval): ReportBucketResponse[] {
  if (interval === "None") {
    return [{ key: "all", label: "All" }]
  }

  const buckets: ReportBucketResponse[] = []

  if (interval === "Day") {
    const singleMonth = startDate.getUTCFullYear() === endDate.getUTCFullYear() && startDate.getUTCMonth() === endDate.getUTCMonth()

    for (let cursor = asDateOnly(startDate); cursor <= asDateOnly(endDate); cursor = addUtcDays(cursor, 1)) {
      const key = cursor.toISOString().slice(0, 10)
      const label = singleMonth ? String(cursor.getUTCDate()) : cursor.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })

      buckets.push({ key, label })
    }

    return buckets
  }

  if (interval === "Week") {
    for (let cursor = asDateOnly(startDate); cursor <= asDateOnly(endDate); cursor = addUtcDays(cursor, 7)) {
      buckets.push({
        key: cursor.toISOString().slice(0, 10),
        label: cursor.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        }),
      })
    }

    return buckets
  }

  let cursor = utcMonthStart(startDate)
  const lastMonth = utcMonthStart(endDate)
  const showYear = cursor.getUTCFullYear() !== lastMonth.getUTCFullYear()

  while (cursor <= lastMonth) {
    buckets.push({
      key: monthKey(cursor),
      label: cursor.toLocaleDateString("en-US", {
        month: "short",
        year: showYear ? "2-digit" : undefined,
        timeZone: "UTC",
      }),
    })

    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1))
  }

  return buckets
}

function buildPortfolioBuckets(startDate: Date, endDate: Date, interval: ReportInterval): Bucket[] {
  if (interval === "None") {
    return [
      {
        key: "all",
        label: "All",
        start: asDateOnly(startDate),
        end: endOfDate(endDate),
      },
    ]
  }

  const buckets: Bucket[] = []

  if (interval === "Day") {
    for (let cursor = asDateOnly(startDate); cursor <= asDateOnly(endDate); cursor = addUtcDays(cursor, 1)) {
      buckets.push({
        key: cursor.toISOString().slice(0, 10),
        label: cursor.toLocaleDateString("en-US", {
          day: "numeric",
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        }),
        start: cursor,
        end: endOfDate(cursor),
      })
    }

    return buckets
  }

  if (interval === "Week") {
    for (let cursor = asDateOnly(startDate); cursor <= asDateOnly(endDate); cursor = addUtcDays(cursor, 7)) {
      const bucketEnd = new Date(Math.min(endOfDate(addUtcDays(cursor, 6)).getTime(), endOfDate(endDate).getTime()))
      buckets.push({
        key: bucketEnd.toISOString().slice(0, 10),
        label: bucketEnd.toLocaleDateString("en-US", {
          day: "numeric",
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        }),
        start: cursor,
        end: bucketEnd,
      })
    }

    return buckets
  }

  let cursor = utcMonthStart(startDate)
  const lastMonth = utcMonthStart(endDate)

  while (cursor <= lastMonth) {
    const rawMonthEnd = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0))
    const monthEnd = rawMonthEnd > asDateOnly(endDate) ? asDateOnly(endDate) : rawMonthEnd

    buckets.push({
      key: monthKey(cursor),
      label: cursor.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }),
      start: cursor,
      end: endOfDate(monthEnd),
    })

    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1))
  }

  return buckets
}

function resolveBucketKey(startDate: Date, transactionDate: Date, interval: ReportInterval) {
  if (interval === "None") {
    return "all"
  }

  if (interval === "Day") {
    return transactionDate.toISOString().slice(0, 10)
  }

  if (interval === "Week") {
    const dayOffset = Math.floor((asDateOnly(transactionDate).getTime() - asDateOnly(startDate).getTime()) / 86_400_000)
    const weekOffset = Math.floor(dayOffset / 7) * 7
    return addUtcDays(startDate, weekOffset).toISOString().slice(0, 10)
  }

  return monthKey(transactionDate)
}

function getIncomeAmount(type: TransactionType, amount: number) {
  return type === "Income" ? amount : 0
}

function getSpendingAmount(type: TransactionType, amount: number, isRefund: boolean) {
  if (type === "Expense") {
    return amount
  }

  if (type === "Refund" || isRefund) {
    return -amount
  }

  return 0
}

function calculateSavingsRate(income: number, net: number) {
  if (income <= 0) {
    return 0
  }

  return roundMoney((net / income) * 100)
}

function getSignedAmount(type: CategoryType, transactionType: TransactionType, amount: number, isRefund: boolean) {
  if (type === "Income") {
    return transactionType === "Income" ? amount : 0
  }

  if (transactionType === "Expense") {
    return amount
  }

  if (transactionType === "Refund" || isRefund) {
    return -amount
  }

  return 0
}

function resolveTopLevelCategoryId(categoryId: string | null, subCategoryId: string | null, categoryById: Map<string, ReportCategory>) {
  if (subCategoryId) {
    const subCategory = categoryById.get(subCategoryId)

    if (subCategory?.parentId) {
      return subCategory.parentId
    }

    return subCategoryId
  }

  if (categoryId) {
    return categoryId
  }

  return "uncategorized"
}

async function loadReportContext() {
  const user = await requireUser()
  const baseCurrency = normalizeCurrencyOrDefault(user.baseCurrency, "USD")
  const fx = await getRatesToBase(baseCurrency)
  const accountCurrencyById = await loadAccountCurrencyMap(user.id)

  return { user, baseCurrency, fx, accountCurrencyById }
}

export async function getCashflowSeriesReportData(query?: CashflowSeriesReportQuery): Promise<CashflowSeriesReportResponse> {
  const { user, baseCurrency, fx, accountCurrencyById } = await loadReportContext()
  const startDateFilter = query?.StartDate ? startOfDay(query.StartDate) : null
  const endDateFilter = query?.EndDate ? endOfDay(query.EndDate) : null

  if (startDateFilter && endDateFilter && startDateFilter > endDateFilter) {
    throw new Error("StartDate cannot be after EndDate.")
  }

  const allTransactions = await db.query.transactions.findMany({
    where: eq(transactions.userId, user.id),
    orderBy: [asc(transactions.date)],
  })

  const currentTransactions = allTransactions.filter((transaction) => {
    const date = transaction.date

    if (startDateFilter && date < startDateFilter) {
      return false
    }

    if (endDateFilter && date > endDateFilter) {
      return false
    }

    return transaction.type === "Income" || transaction.type === "Expense" || transaction.type === "Refund" || transaction.isRefund
  })

  let startDate = startDateFilter
  let endDate = endDateFilter ? asDateOnly(endDateFilter) : null

  if (!startDate && currentTransactions.length > 0) {
    startDate = asDateOnly(currentTransactions[0]!.date)
  }

  if (!endDate && currentTransactions.length > 0) {
    endDate = asDateOnly(currentTransactions[currentTransactions.length - 1]!.date)
  }

  startDate ??= asDateOnly(new Date())
  endDate ??= startDate

  const interval = resolveReportInterval(startDate, endDate, query?.Interval)
  const buckets = buildBuckets(startDate, endDate, interval)
  const bucketTotals = new Map<string, { income: number; spending: number }>()
  let totalIncome = 0
  let totalSpending = 0

  for (const transaction of currentTransactions) {
    const currency = resolveTransactionCurrency(transaction, accountCurrencyById, baseCurrency)
    const incomeAmount = getIncomeAmount(transaction.type as TransactionType, transaction.amount)
    const spendingAmount = getSpendingAmount(transaction.type as TransactionType, transaction.amount, transaction.isRefund)

    if (incomeAmount === 0 && spendingAmount === 0) {
      continue
    }

    const convertedIncome = convertAmountToBase(incomeAmount, currency, baseCurrency, fx.ratesToBase)
    const convertedSpending = convertAmountToBase(spendingAmount, currency, baseCurrency, fx.ratesToBase)
    const bucketKey = resolveBucketKey(startDate, transaction.date, interval)
    const bucket = bucketTotals.get(bucketKey) ?? { income: 0, spending: 0 }

    bucket.income += convertedIncome
    bucket.spending += convertedSpending
    totalIncome += convertedIncome
    totalSpending += convertedSpending
    bucketTotals.set(bucketKey, bucket)
  }

  const data = buckets.map((bucket) => {
    const totals = bucketTotals.get(bucket.key)
    const income = roundMoney(totals?.income ?? 0)
    const spending = roundMoney(totals?.spending ?? 0)

    return {
      bucketKey: bucket.key,
      bucketLabel: bucket.label,
      income,
      spending,
      net: roundMoney(income - spending),
    }
  })

  const dayCount = Math.max(1, Math.floor((asDateOnly(endDate).getTime() - asDateOnly(startDate).getTime()) / 86_400_000) + 1)
  const previousRangeEnd = addUtcDays(startDate, -1)
  const today = asDateOnly(new Date())
  const elapsedEnd = endDate < today ? endDate : today
  const elapsedDayCount = Math.max(1, Math.min(dayCount, Math.floor((elapsedEnd.getTime() - startDate.getTime()) / 86_400_000) + 1))
  const previousTotalStart = addUtcDays(previousRangeEnd, -(elapsedDayCount - 1))
  const previousFullStart = addUtcDays(previousRangeEnd, -(dayCount - 1))
  const previousEndOfDay = endOfDate(previousRangeEnd)

  let previousFullIncome = 0
  let previousFullSpending = 0
  let previousTotalIncome = 0
  let previousTotalSpending = 0

  for (const transaction of allTransactions) {
    if (transaction.date < previousFullStart || transaction.date > previousEndOfDay) {
      continue
    }

    if (!(transaction.type === "Income" || transaction.type === "Expense" || transaction.type === "Refund" || transaction.isRefund)) {
      continue
    }

    const currency = resolveTransactionCurrency(transaction, accountCurrencyById, baseCurrency)
    const incomeAmount = getIncomeAmount(transaction.type as TransactionType, transaction.amount)
    const spendingAmount = getSpendingAmount(transaction.type as TransactionType, transaction.amount, transaction.isRefund)
    const convertedIncome = convertAmountToBase(incomeAmount, currency, baseCurrency, fx.ratesToBase)
    const convertedSpending = convertAmountToBase(spendingAmount, currency, baseCurrency, fx.ratesToBase)

    previousFullIncome += convertedIncome
    previousFullSpending += convertedSpending

    if (transaction.date >= previousTotalStart) {
      previousTotalIncome += convertedIncome
      previousTotalSpending += convertedSpending
    }
  }

  const totalNet = roundMoney(totalIncome - totalSpending)
  const previousTotalNet = roundMoney(previousTotalIncome - previousTotalSpending)
  const bestBucket = [...data].sort((left, right) => right.net - left.net)[0] ?? null
  const worstBucket = [...data].sort((left, right) => left.net - right.net)[0] ?? null

  return {
    baseCurrency,
    interval,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    buckets,
    data,
    summary: {
      income: {
        total: roundMoney(totalIncome),
        previousTotal: roundMoney(previousTotalIncome),
        averagePerDay: roundMoney(totalIncome / dayCount),
        previousAveragePerDay: roundMoney(previousFullIncome / dayCount),
      },
      spending: {
        total: roundMoney(totalSpending),
        previousTotal: roundMoney(previousTotalSpending),
        averagePerDay: roundMoney(totalSpending / dayCount),
        previousAveragePerDay: roundMoney(previousFullSpending / dayCount),
      },
      net: {
        total: totalNet,
        previousTotal: previousTotalNet,
        averagePerDay: roundMoney(totalNet / dayCount),
        previousAveragePerDay: roundMoney((previousFullIncome - previousFullSpending) / dayCount),
      },
      savingsRate: calculateSavingsRate(totalIncome, totalNet),
      previousSavingsRate: calculateSavingsRate(previousTotalIncome, previousTotalNet),
      positiveBucketCount: data.filter((point) => point.net > 0).length,
      negativeBucketCount: data.filter((point) => point.net < 0).length,
      bestBucket: bestBucket
        ? {
            bucketKey: bestBucket.bucketKey,
            bucketLabel: bestBucket.bucketLabel,
            income: bestBucket.income,
            spending: bestBucket.spending,
            net: bestBucket.net,
          }
        : null,
      worstBucket: worstBucket
        ? {
            bucketKey: worstBucket.bucketKey,
            bucketLabel: worstBucket.bucketLabel,
            income: worstBucket.income,
            spending: worstBucket.spending,
            net: worstBucket.net,
          }
        : null,
      dayCount,
      bucketCount: buckets.length,
    },
  }
}

export async function getCategorySeriesReportData(query?: CategorySeriesReportQuery): Promise<CategorySeriesReportResponse> {
  const { user, baseCurrency, fx, accountCurrencyById } = await loadReportContext()
  const type = query?.Type ?? "Expense"
  const startDateFilter = query?.StartDate ? startOfDay(query.StartDate) : null
  const endDateFilter = query?.EndDate ? endOfDay(query.EndDate) : null
  const tripId = query?.TripId ?? null
  const groupTripsAsCategory = type === "Expense" && Boolean(query?.GroupTripsAsCategory)

  if (startDateFilter && endDateFilter && startDateFilter > endDateFilter) {
    throw new Error("StartDate cannot be after EndDate.")
  }

  const categoryRows = await db.query.categories.findMany({
    where: eq(categories.userId, user.id),
  })
  const tripRows = groupTripsAsCategory
    ? await db.query.trips.findMany({
        where: eq(trips.userId, user.id),
      })
    : []
  const allTransactions = await db.query.transactions.findMany({
    where: eq(transactions.userId, user.id),
    orderBy: [asc(transactions.date)],
  })

  const filteredTransactions = allTransactions.filter((transaction) => {
    if (startDateFilter && transaction.date < startDateFilter) {
      return false
    }

    if (endDateFilter && transaction.date > endDateFilter) {
      return false
    }

    if (tripId && transaction.tripId !== tripId) {
      return false
    }

    if (type === "Income") {
      return transaction.type === "Income"
    }

    return transaction.type === "Expense" || transaction.type === "Refund" || transaction.isRefund
  })

  let startDate = startDateFilter
  let endDate = endDateFilter ? asDateOnly(endDateFilter) : null

  if (!startDate && filteredTransactions.length > 0) {
    startDate = asDateOnly(filteredTransactions[0]!.date)
  }

  if (!endDate && filteredTransactions.length > 0) {
    endDate = asDateOnly(filteredTransactions[filteredTransactions.length - 1]!.date)
  }

  startDate ??= asDateOnly(new Date())
  endDate ??= startDate

  const interval = resolveReportInterval(startDate, endDate, query?.Interval)
  const buckets = buildBuckets(startDate, endDate, interval)
  const categoryById = new Map(categoryRows.map((category) => [category.id, category]))
  const tripById = new Map(tripRows.map((trip) => [trip.id, trip]))
  const bucketTotalsByCategory = new Map<string, Map<string, number>>()
  const totalsByCategory = new Map<string, number>()

  for (const transaction of filteredTransactions) {
    const signedAmount = getSignedAmount(type, transaction.type as TransactionType, transaction.amount, transaction.isRefund)

    if (signedAmount === 0) {
      continue
    }

    const currency = resolveTransactionCurrency(transaction, accountCurrencyById, baseCurrency)
    const amount = convertAmountToBase(signedAmount, currency, baseCurrency, fx.ratesToBase)
    const categoryId =
      groupTripsAsCategory && transaction.tripId
        ? `trip:${transaction.tripId}`
        : resolveTopLevelCategoryId(transaction.categoryId, transaction.subCategoryId, categoryById)
    const bucketKey = resolveBucketKey(startDate, transaction.date, interval)
    const bucketMap = bucketTotalsByCategory.get(bucketKey) ?? new Map<string, number>()

    bucketMap.set(categoryId, (bucketMap.get(categoryId) ?? 0) + amount)
    bucketTotalsByCategory.set(bucketKey, bucketMap)
    totalsByCategory.set(categoryId, (totalsByCategory.get(categoryId) ?? 0) + amount)
  }

  const orderedCategoryIds = [...totalsByCategory.entries()]
    .filter(([, value]) => value !== 0)
    .sort((left, right) => Math.abs(right[1]) - Math.abs(left[1]))
    .map(([key]) => key)
  const maxAbsAmount = orderedCategoryIds.reduce((max, categoryId) => Math.max(max, Math.abs(totalsByCategory.get(categoryId) ?? 0)), 0)

  const series = orderedCategoryIds.map((categoryId) => {
    let label = "Uncategorized"
    let color = "gray.6"

    if (categoryId.startsWith("trip:")) {
      const trip = tripById.get(categoryId.slice(5))
      if (trip) {
        label = trip.name
        color = "grape.6"
      }
    } else if (categoryId !== "uncategorized") {
      const category = categoryById.get(categoryId)
      if (category) {
        label = category.name
        color = category.color
      }
    }

    const total = roundMoney(totalsByCategory.get(categoryId) ?? 0)
    return {
      key: categoryId,
      label,
      color,
      total,
      percentageOfMax: maxAbsAmount > 0 ? roundMoney((Math.abs(total) / maxAbsAmount) * 100) : 0,
    }
  })

  const data = buckets.map((bucket) => {
    const values: Record<string, number> = {}

    for (const categoryId of orderedCategoryIds) {
      values[categoryId] = 0
    }

    const bucketMap = bucketTotalsByCategory.get(bucket.key)
    if (bucketMap) {
      for (const [key, value] of bucketMap.entries()) {
        values[key] = roundMoney(value)
      }
    }

    const total = roundMoney(Object.values(values).reduce((sum, value) => sum + value, 0))

    return {
      bucketKey: bucket.key,
      bucketLabel: bucket.label,
      values,
      total,
    }
  })

  const reportTotal = roundMoney([...totalsByCategory.values()].reduce((sum, value) => sum + value, 0))
  const dayCount = Math.max(1, Math.floor((asDateOnly(endDate).getTime() - asDateOnly(startDate).getTime()) / 86_400_000) + 1)
  const weekCount = Math.max(1, dayCount / 7)

  const previousRangeEnd = addUtcDays(startDate, -1)
  const today = asDateOnly(new Date())
  const elapsedEnd = endDate < today ? endDate : today
  const elapsedDayCount = Math.max(1, Math.min(dayCount, Math.floor((elapsedEnd.getTime() - startDate.getTime()) / 86_400_000) + 1))
  const previousTotalStart = addUtcDays(previousRangeEnd, -(elapsedDayCount - 1))
  const previousFullStart = addUtcDays(previousRangeEnd, -(dayCount - 1))
  const previousEndOfDay = endOfDate(previousRangeEnd)

  const previousTransactions = allTransactions.filter((transaction) => {
    if (transaction.date < previousFullStart || transaction.date > previousEndOfDay) {
      return false
    }

    if (tripId && transaction.tripId !== tripId) {
      return false
    }

    return true
  })

  const previousFullTotal = roundMoney(
    previousTransactions.reduce((sum, transaction) => {
      const currency = resolveTransactionCurrency(transaction, accountCurrencyById, baseCurrency)
      const signedAmount = getSignedAmount(type, transaction.type as TransactionType, transaction.amount, transaction.isRefund)
      return sum + convertAmountToBase(signedAmount, currency, baseCurrency, fx.ratesToBase)
    }, 0)
  )

  const previousTotal = roundMoney(
    previousTransactions.reduce((sum, transaction) => {
      if (transaction.date < previousTotalStart) {
        return sum
      }

      const currency = resolveTransactionCurrency(transaction, accountCurrencyById, baseCurrency)
      const signedAmount = getSignedAmount(type, transaction.type as TransactionType, transaction.amount, transaction.isRefund)
      return sum + convertAmountToBase(signedAmount, currency, baseCurrency, fx.ratesToBase)
    }, 0)
  )

  return {
    type,
    baseCurrency,
    interval,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    buckets,
    series,
    data,
    summary: {
      total: reportTotal,
      previousTotal,
      averagePerDay: roundMoney(reportTotal / dayCount),
      previousAveragePerDay: roundMoney(previousFullTotal / dayCount),
      averagePerWeek: roundMoney(reportTotal / weekCount),
      previousAveragePerWeek: roundMoney(previousFullTotal / weekCount),
      dayCount,
      bucketCount: buckets.length,
    },
  }
}

// Only adjusts accounts already present in the map (the selected accounts). Transfers can
// reference an unselected endpoint — creating an entry for it here would leak a phantom
// balance into totalBalance and the response payload.
function applyRollbackDelta(accountBalances: Map<string, number>, accountId: string, delta: number) {
  const current = accountBalances.get(accountId)

  if (current !== undefined) {
    accountBalances.set(accountId, current + delta)
  }
}

function rollbackBalanceDelta(accountBalances: Map<string, number>, transaction: ReportTransaction) {
  if (transaction.type === "Expense") {
    applyRollbackDelta(accountBalances, transaction.accountId, transaction.amount)
    return
  }

  if (transaction.type === "Income" || transaction.type === "Refund") {
    applyRollbackDelta(accountBalances, transaction.accountId, -transaction.amount)
    return
  }

  if (transaction.type === "Transfer") {
    applyRollbackDelta(accountBalances, transaction.accountId, transaction.amount)

    if (transaction.targetAccountId) {
      applyRollbackDelta(accountBalances, transaction.targetAccountId, -(transaction.amount2 ?? transaction.amount))
    }
  }
}

export async function getPortfolioBalanceSeriesReportData(query?: PortfolioBalanceSeriesQuery): Promise<PortfolioBalanceSeriesResponse> {
  const user = await requireUser()
  const baseCurrency = normalizeCurrencyOrDefault(query?.BaseCurrency, normalizeCurrencyOrDefault(user.baseCurrency, "USD"))

  if (query?.BaseCurrency && !normalizeCurrencyOrNull(query.BaseCurrency)) {
    throw new Error("BaseCurrency must be one of the supported currencies.")
  }

  const fx = await getRatesToBase(baseCurrency)
  const accountIdsFilter = new Set(query?.AccountIds ?? [])
  const accountRows = await db.query.accounts.findMany({
    where: eq(accounts.userId, user.id),
  })
  const selectedAccounts = accountRows
    .filter((account) => accountIdsFilter.size === 0 || accountIdsFilter.has(account.id))
    .sort((left, right) => left.name.localeCompare(right.name))

  if (selectedAccounts.length === 0) {
    const today = asDateOnly(new Date())
    return {
      baseCurrency,
      startDate: today.toISOString(),
      endDate: today.toISOString(),
      interval: "Day",
      accounts: [],
      points: [],
      summary: {
        startBalance: 0,
        endBalance: 0,
        delta: 0,
        deltaPercent: 0,
        pointCount: 0,
        dayCount: 1,
      },
    }
  }

  const accountIdSet = new Set(selectedAccounts.map((account) => account.id))
  const allTransactions = await db.query.transactions.findMany({
    where: eq(transactions.userId, user.id),
    orderBy: [asc(transactions.date)],
  })
  const relevantTransactions = allTransactions.filter(
    (transaction) => accountIdSet.has(transaction.accountId) || (transaction.targetAccountId ? accountIdSet.has(transaction.targetAccountId) : false)
  )

  const endBoundary = query?.EndDate ? endOfDay(query.EndDate) : endOfDate(new Date())
  const endDateFilter = asDateOnly(endBoundary)
  const startDateFilter = query?.StartDate ? startOfDay(query.StartDate) : relevantTransactions[0] ? asDateOnly(relevantTransactions[0].date) : endDateFilter

  if (startDateFilter > endDateFilter) {
    throw new Error("StartDate cannot be after EndDate.")
  }

  const interval = resolvePortfolioInterval(startDateFilter, endDateFilter, query?.Interval)
  const buckets = buildPortfolioBuckets(startDateFilter, endDateFilter, interval)
  const transactionsAfterEnd = relevantTransactions
    .filter((transaction) => transaction.date > endBoundary)
    .sort((left, right) => right.date.getTime() - left.date.getTime())
  const transactionsInRange = relevantTransactions
    .filter((transaction) => transaction.date >= startDateFilter && transaction.date <= endBoundary)
    .sort((left, right) => left.date.getTime() - right.date.getTime())

  const accountBalances = new Map(selectedAccounts.map((account) => [account.id, account.currentBalance]))
  const accountCurrency = new Map(selectedAccounts.map((account) => [account.id, account.currency]))

  for (const transaction of transactionsAfterEnd) {
    rollbackBalanceDelta(accountBalances, transaction)
  }

  const points: PortfolioBalanceSeriesResponse["points"] = []
  const descendingBuckets = [...buckets].sort((left, right) => right.end.getTime() - left.end.getTime())
  const descendingTransactions = [...transactionsInRange].sort((left, right) => right.date.getTime() - left.date.getTime())
  let transactionIndex = 0

  for (const bucket of descendingBuckets) {
    while (transactionIndex < descendingTransactions.length && descendingTransactions[transactionIndex]!.date > bucket.end) {
      rollbackBalanceDelta(accountBalances, descendingTransactions[transactionIndex]!)
      transactionIndex += 1
    }

    const totalsByCurrency: Record<string, number> = {}
    const accountBalancesInBase: Record<string, number> = {}
    let totalInBase = 0

    for (const [accountId, balance] of accountBalances.entries()) {
      const currency = normalizeCurrencyOrDefault(accountCurrency.get(accountId), baseCurrency)
      totalsByCurrency[currency] = roundMoney((totalsByCurrency[currency] ?? 0) + balance)
      const converted = roundMoney(balance * (fx.ratesToBase[currency] ?? 1))
      accountBalancesInBase[accountId] = converted
      totalInBase += converted
    }

    points.push({
      bucketKey: bucket.key,
      bucketLabel: bucket.label,
      bucketDate: bucket.end.toISOString(),
      totalBalance: roundMoney(totalInBase),
      accountBalances: accountBalancesInBase,
      totalsByCurrency,
      missingCurrencies: [],
    })
  }

  points.reverse()

  const startBalance = Number(points[0]?.totalBalance ?? 0)
  const endBalance = Number(points[points.length - 1]?.totalBalance ?? 0)
  const delta = roundMoney(endBalance - startBalance)
  const deltaPercent = startBalance === 0 ? (endBalance === 0 ? 0 : 100) : roundMoney((delta / Math.abs(startBalance)) * 100)
  const dayCount = Math.max(1, Math.floor((endDateFilter.getTime() - startDateFilter.getTime()) / 86_400_000) + 1)

  return {
    baseCurrency,
    startDate: startDateFilter.toISOString(),
    endDate: endDateFilter.toISOString(),
    interval,
    accounts: selectedAccounts.map((account) => ({
      id: account.id,
      name: account.name,
      color: account.color,
      currency: normalizeCurrencyOrDefault(account.currency, "USD"),
      currentBalance: account.currentBalance,
    })),
    points,
    summary: {
      startBalance,
      endBalance,
      delta,
      deltaPercent,
      pointCount: points.length,
      dayCount,
    },
  }
}

type ComparisonBucketPoint = {
  bucketKey: string
  label: string
  income: number
  spending: number
  net: number
}

type ComparisonAggregate = {
  income: number
  spending: number
  net: number
  points: ComparisonBucketPoint[]
}

function filterCashflowTransactions(rows: ReportTransaction[], start: Date, end: Date) {
  const endBoundary = endOfDate(end)
  return rows.filter((transaction) => {
    if (transaction.date < start || transaction.date > endBoundary) {
      return false
    }

    return transaction.type === "Income" || transaction.type === "Expense" || transaction.type === "Refund" || transaction.isRefund
  })
}

function filterCategoryTransactions(rows: ReportTransaction[], start: Date, end: Date, type: CategoryType) {
  const endBoundary = endOfDate(end)
  return rows.filter((transaction) => {
    if (transaction.date < start || transaction.date > endBoundary) {
      return false
    }

    if (type === "Income") {
      return transaction.type === "Income"
    }

    return transaction.type === "Expense" || transaction.type === "Refund" || transaction.isRefund
  })
}

function aggregateComparisonCashflow(
  rows: ReportTransaction[],
  startDate: Date,
  endDate: Date,
  interval: ReportInterval,
  baseCurrency: string,
  ratesToBase: Record<string, number>,
  accountCurrencyById: Map<string, string | null>
): ComparisonAggregate {
  const buckets = buildBuckets(startDate, endDate, interval)
  const bucketTotals = new Map<string, { income: number; spending: number }>()
  let income = 0
  let spending = 0

  for (const transaction of rows) {
    const currency = resolveTransactionCurrency(transaction, accountCurrencyById, baseCurrency)
    const incomeAmount = convertAmountToBase(getIncomeAmount(transaction.type as TransactionType, transaction.amount), currency, baseCurrency, ratesToBase)
    const spendingAmount = convertAmountToBase(
      getSpendingAmount(transaction.type as TransactionType, transaction.amount, transaction.isRefund),
      currency,
      baseCurrency,
      ratesToBase
    )

    if (incomeAmount === 0 && spendingAmount === 0) {
      continue
    }

    const bucketKey = resolveBucketKey(startDate, transaction.date, interval)
    const bucket = bucketTotals.get(bucketKey) ?? { income: 0, spending: 0 }
    bucket.income += incomeAmount
    bucket.spending += spendingAmount
    bucketTotals.set(bucketKey, bucket)
    income += incomeAmount
    spending += spendingAmount
  }

  const points = buckets.map((bucket) => {
    const totals = bucketTotals.get(bucket.key)
    const bucketIncome = roundMoney(totals?.income ?? 0)
    const bucketSpending = roundMoney(totals?.spending ?? 0)

    return {
      bucketKey: bucket.key,
      label: bucket.label,
      income: bucketIncome,
      spending: bucketSpending,
      net: roundMoney(bucketIncome - bucketSpending),
    }
  })

  return {
    income: roundMoney(income),
    spending: roundMoney(spending),
    net: roundMoney(income - spending),
    points,
  }
}

function aggregateComparisonCategoryTotals(
  rows: ReportTransaction[],
  type: CategoryType,
  baseCurrency: string,
  ratesToBase: Record<string, number>,
  accountCurrencyById: Map<string, string | null>,
  categoryById: Map<string, ReportCategory>
): Map<string, number> {
  const totals = new Map<string, number>()

  for (const transaction of rows) {
    const signedAmount = getSignedAmount(type, transaction.type as TransactionType, transaction.amount, transaction.isRefund)

    if (signedAmount === 0) {
      continue
    }

    const currency = resolveTransactionCurrency(transaction, accountCurrencyById, baseCurrency)
    const amount = convertAmountToBase(signedAmount, currency, baseCurrency, ratesToBase)
    const categoryId = resolveTopLevelCategoryId(transaction.categoryId, transaction.subCategoryId, categoryById)
    totals.set(categoryId, (totals.get(categoryId) ?? 0) + amount)
  }

  return totals
}

export async function getComparisonReportData(query?: ComparisonReportQuery): Promise<ComparisonReportResponse> {
  const { user, baseCurrency, fx, accountCurrencyById } = await loadReportContext()
  const type = query?.Type ?? "Expense"

  const today = asDateOnly(new Date())
  const defaultAStart = utcMonthStart(today)
  const defaultAEnd = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0))
  const defaultBStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1))
  const defaultBEnd = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0))

  const aStart = query?.PeriodAStart ? asDateOnly(parseDateInput(query.PeriodAStart, "PeriodAStart")) : defaultAStart
  const aEnd = query?.PeriodAEnd ? asDateOnly(parseDateInput(query.PeriodAEnd, "PeriodAEnd")) : defaultAEnd
  const bStart = query?.PeriodBStart ? asDateOnly(parseDateInput(query.PeriodBStart, "PeriodBStart")) : defaultBStart
  const bEnd = query?.PeriodBEnd ? asDateOnly(parseDateInput(query.PeriodBEnd, "PeriodBEnd")) : defaultBEnd

  if (aStart > aEnd) {
    throw new Error("PeriodAStart cannot be after PeriodAEnd.")
  }

  if (bStart > bEnd) {
    throw new Error("PeriodBStart cannot be after PeriodBEnd.")
  }

  // Both periods share one interval so the series aligns bucket-for-bucket by
  // ordinal position (day 1 vs day 1, month 1 vs month 1) regardless of the
  // calendar gap between them.
  const interval = resolveReportInterval(aStart, aEnd, query?.Interval)

  const categoryRows = await db.query.categories.findMany({
    where: eq(categories.userId, user.id),
  })
  const categoryById = new Map(categoryRows.map((category) => [category.id, category]))

  const allTransactions = await db.query.transactions.findMany({
    where: eq(transactions.userId, user.id),
    orderBy: [asc(transactions.date)],
  })

  const periodACashflow = aggregateComparisonCashflow(
    filterCashflowTransactions(allTransactions, aStart, aEnd),
    aStart,
    aEnd,
    interval,
    baseCurrency,
    fx.ratesToBase,
    accountCurrencyById
  )
  const periodBCashflow = aggregateComparisonCashflow(
    filterCashflowTransactions(allTransactions, bStart, bEnd),
    bStart,
    bEnd,
    interval,
    baseCurrency,
    fx.ratesToBase,
    accountCurrencyById
  )

  const seriesLength = Math.max(periodACashflow.points.length, periodBCashflow.points.length)
  const series = Array.from({ length: seriesLength }, (_, index) => {
    const a = periodACashflow.points[index] ?? null
    const b = periodBCashflow.points[index] ?? null

    return {
      index,
      label: a?.label ?? b?.label ?? String(index + 1),
      aBucketKey: a?.bucketKey ?? null,
      bBucketKey: b?.bucketKey ?? null,
      aLabel: a?.label ?? null,
      bLabel: b?.label ?? null,
      aIncome: a ? a.income : null,
      aSpending: a ? a.spending : null,
      aNet: a ? a.net : null,
      bIncome: b ? b.income : null,
      bSpending: b ? b.spending : null,
      bNet: b ? b.net : null,
    }
  })

  const periodATotals = aggregateComparisonCategoryTotals(
    filterCategoryTransactions(allTransactions, aStart, aEnd, type),
    type,
    baseCurrency,
    fx.ratesToBase,
    accountCurrencyById,
    categoryById
  )
  const periodBTotals = aggregateComparisonCategoryTotals(
    filterCategoryTransactions(allTransactions, bStart, bEnd, type),
    type,
    baseCurrency,
    fx.ratesToBase,
    accountCurrencyById,
    categoryById
  )

  const moverKeys = new Set<string>([...periodATotals.keys(), ...periodBTotals.keys()])
  const categoryMovers = [...moverKeys]
    .map((key) => {
      const aTotal = roundMoney(periodATotals.get(key) ?? 0)
      const bTotal = roundMoney(periodBTotals.get(key) ?? 0)
      const delta = roundMoney(aTotal - bTotal)
      const deltaPercent = bTotal !== 0 ? roundMoney((delta / Math.abs(bTotal)) * 100) : null

      let label = "Uncategorized"
      let color = "gray.6"
      if (key !== "uncategorized") {
        const category = categoryById.get(key)
        if (category) {
          label = category.name
          color = category.color
        }
      }

      return { key, label, color, aTotal, bTotal, delta, deltaPercent }
    })
    .filter((mover) => mover.aTotal !== 0 || mover.bTotal !== 0)
    .sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta))

  const aDayCount = Math.max(1, Math.floor((aEnd.getTime() - aStart.getTime()) / 86_400_000) + 1)
  const bDayCount = Math.max(1, Math.floor((bEnd.getTime() - bStart.getTime()) / 86_400_000) + 1)

  return {
    type,
    baseCurrency,
    interval,
    periodA: {
      startDate: aStart.toISOString(),
      endDate: aEnd.toISOString(),
      income: periodACashflow.income,
      spending: periodACashflow.spending,
      net: periodACashflow.net,
      savingsRate: calculateSavingsRate(periodACashflow.income, periodACashflow.net),
      dayCount: aDayCount,
    },
    periodB: {
      startDate: bStart.toISOString(),
      endDate: bEnd.toISOString(),
      income: periodBCashflow.income,
      spending: periodBCashflow.spending,
      net: periodBCashflow.net,
      savingsRate: calculateSavingsRate(periodBCashflow.income, periodBCashflow.net),
      dayCount: bDayCount,
    },
    series,
    categoryMovers,
  }
}
