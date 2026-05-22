import { asc, eq } from "drizzle-orm"

import { getSessionData } from "@/lib/auth/session.server"
import { normalizeCurrencyOrDefault, normalizeCurrencyOrNull } from "@/lib/currency"
import { db } from "@/lib/db/client.server"
import { roundMoney } from "@/lib/finance"
import { accounts, categories, transactions, trips, users } from "@/lib/db/schema"
import { getRatesToBase } from "@/lib/exchange-rate.server"

import type {
  CashflowSeriesReportResponse,
  CategorySeriesReportResponse,
  GetApiReportsCashflowSeriesData,
  GetApiReportsCategorySeriesData,
  GetApiReportsMonthlyYoyData,
  GetApiReportsPortfolioBalanceSeriesData,
  MonthlyYoyReportResponse,
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

const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const
const yearColors = ["blue.6", "teal.6", "grape.6", "orange.6", "red.6", "cyan.6", "violet.6", "lime.6", "pink.6", "indigo.6"] as const

function parseDate(value: string, label: string) {
  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${label} must be a valid date.`)
  }

  return parsed
}

function asDateOnly(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate())
}

function endOfDate(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 23, 59, 59, 999)
}

async function requireUser() {
  const session = await getSessionData()

  if (!session) {
    throw new Error("Unauthorized")
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  })

  if (!user) {
    throw new Error("User was not found.")
  }

  return user
}

function convertAmount(amount: number, sourceCurrency: string | null | undefined, baseCurrency: string, ratesToBase: Record<string, number>) {
  if (amount === 0) {
    return 0
  }

  const normalizedSource = normalizeCurrencyOrDefault(sourceCurrency, baseCurrency)
  return amount * (ratesToBase[normalizedSource] ?? 1)
}

function resolveReportInterval(startDate: Date, endDate: Date, requested: ReportInterval | undefined) {
  if (requested && requested !== "Auto") {
    return requested
  }

  const isSameMonth = startDate.getFullYear() === endDate.getFullYear() && startDate.getMonth() === endDate.getMonth()
  if (isSameMonth) {
    return "Day" as const
  }

  const monthSpan = (endDate.getFullYear() - startDate.getFullYear()) * 12 + endDate.getMonth() - startDate.getMonth()
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

  const isSameMonth = startDate.getFullYear() === endDate.getFullYear() && startDate.getMonth() === endDate.getMonth()
  if (isSameMonth) {
    return "Day" as const
  }

  const monthSpan = (endDate.getFullYear() - startDate.getFullYear()) * 12 + endDate.getMonth() - startDate.getMonth()
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
    const singleMonth = startDate.getFullYear() === endDate.getFullYear() && startDate.getMonth() === endDate.getMonth()

    for (let cursor = asDateOnly(startDate); cursor <= asDateOnly(endDate); cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1)) {
      const key = cursor.toISOString().slice(0, 10)
      const label = singleMonth ? String(cursor.getDate()) : cursor.toLocaleDateString("en-US", { month: "short", day: "numeric" })

      buckets.push({ key, label })
    }

    return buckets
  }

  if (interval === "Week") {
    for (let cursor = asDateOnly(startDate); cursor <= asDateOnly(endDate); cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 7)) {
      buckets.push({
        key: cursor.toISOString().slice(0, 10),
        label: cursor.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
      })
    }

    return buckets
  }

  let cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
  const lastMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1)
  const showYear = cursor.getFullYear() !== lastMonth.getFullYear()

  while (cursor <= lastMonth) {
    buckets.push({
      key: `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`,
      label: cursor.toLocaleDateString("en-US", {
        month: "short",
        year: showYear ? "2-digit" : undefined,
      }),
    })

    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
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
    for (let cursor = asDateOnly(startDate); cursor <= asDateOnly(endDate); cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1)) {
      buckets.push({
        key: cursor.toISOString().slice(0, 10),
        label: cursor.toLocaleDateString("en-US", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
        start: cursor,
        end: endOfDate(cursor),
      })
    }

    return buckets
  }

  if (interval === "Week") {
    for (let cursor = asDateOnly(startDate); cursor <= asDateOnly(endDate); cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 7)) {
      const bucketEnd = new Date(
        Math.min(endOfDate(new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 6)).getTime(), endOfDate(endDate).getTime())
      )
      buckets.push({
        key: bucketEnd.toISOString().slice(0, 10),
        label: bucketEnd.toLocaleDateString("en-US", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
        start: cursor,
        end: bucketEnd,
      })
    }

    return buckets
  }

  let cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
  const lastMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1)

  while (cursor <= lastMonth) {
    const rawMonthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)
    const monthEnd = rawMonthEnd > asDateOnly(endDate) ? asDateOnly(endDate) : rawMonthEnd

    buckets.push({
      key: `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`,
      label: cursor.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      }),
      start: cursor,
      end: endOfDate(monthEnd),
    })

    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
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
    return new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + weekOffset).toISOString().slice(0, 10)
  }

  return `${transactionDate.getFullYear()}-${String(transactionDate.getMonth() + 1).padStart(2, "0")}`
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
  const accountRows = await db.query.accounts.findMany({
    where: eq(accounts.userId, user.id),
  })
  const accountCurrencyById = new Map(accountRows.map((account) => [account.id, account.currency]))

  return { user, baseCurrency, fx, accountRows, accountCurrencyById }
}

export async function getCashflowSeriesReportData(query?: GetApiReportsCashflowSeriesData["query"]): Promise<CashflowSeriesReportResponse> {
  const { user, baseCurrency, fx, accountCurrencyById } = await loadReportContext()
  const startDateFilter = query?.StartDate ? asDateOnly(parseDate(query.StartDate, "StartDate")) : null
  const endDateFilter = query?.EndDate ? asDateOnly(parseDate(query.EndDate, "EndDate")) : null

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

    if (endDateFilter && date > endOfDate(endDateFilter)) {
      return false
    }

    return transaction.type === "Income" || transaction.type === "Expense" || transaction.type === "Refund" || transaction.isRefund
  })

  let startDate = startDateFilter
  let endDate = endDateFilter

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
    const currency = transaction.currency ?? accountCurrencyById.get(transaction.accountId) ?? baseCurrency
    const incomeAmount = getIncomeAmount(transaction.type as TransactionType, transaction.amount)
    const spendingAmount = getSpendingAmount(transaction.type as TransactionType, transaction.amount, transaction.isRefund)

    if (incomeAmount === 0 && spendingAmount === 0) {
      continue
    }

    const convertedIncome = convertAmount(incomeAmount, currency, baseCurrency, fx.ratesToBase)
    const convertedSpending = convertAmount(spendingAmount, currency, baseCurrency, fx.ratesToBase)
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
  const previousRangeEnd = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() - 1)
  const today = asDateOnly(new Date())
  const elapsedEnd = endDate < today ? endDate : today
  const elapsedDayCount = Math.max(1, Math.min(dayCount, Math.floor((elapsedEnd.getTime() - startDate.getTime()) / 86_400_000) + 1))
  const previousTotalStart = new Date(previousRangeEnd.getFullYear(), previousRangeEnd.getMonth(), previousRangeEnd.getDate() - (elapsedDayCount - 1))
  const previousFullStart = new Date(previousRangeEnd.getFullYear(), previousRangeEnd.getMonth(), previousRangeEnd.getDate() - (dayCount - 1))
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

    const currency = transaction.currency ?? accountCurrencyById.get(transaction.accountId) ?? baseCurrency
    const incomeAmount = getIncomeAmount(transaction.type as TransactionType, transaction.amount)
    const spendingAmount = getSpendingAmount(transaction.type as TransactionType, transaction.amount, transaction.isRefund)
    const convertedIncome = convertAmount(incomeAmount, currency, baseCurrency, fx.ratesToBase)
    const convertedSpending = convertAmount(spendingAmount, currency, baseCurrency, fx.ratesToBase)

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

export async function getCategorySeriesReportData(query?: GetApiReportsCategorySeriesData["query"]): Promise<CategorySeriesReportResponse> {
  const { user, baseCurrency, fx, accountCurrencyById } = await loadReportContext()
  const type = query?.Type ?? "Expense"
  const startDateFilter = query?.StartDate ? asDateOnly(parseDate(query.StartDate, "StartDate")) : null
  const endDateFilter = query?.EndDate ? asDateOnly(parseDate(query.EndDate, "EndDate")) : null
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

    if (endDateFilter && transaction.date > endOfDate(endDateFilter)) {
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
  let endDate = endDateFilter

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

    const currency = transaction.currency ?? accountCurrencyById.get(transaction.accountId) ?? baseCurrency
    const amount = convertAmount(signedAmount, currency, baseCurrency, fx.ratesToBase)
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

  const previousRangeEnd = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() - 1)
  const today = asDateOnly(new Date())
  const elapsedEnd = endDate < today ? endDate : today
  const elapsedDayCount = Math.max(1, Math.min(dayCount, Math.floor((elapsedEnd.getTime() - startDate.getTime()) / 86_400_000) + 1))
  const previousTotalStart = new Date(previousRangeEnd.getFullYear(), previousRangeEnd.getMonth(), previousRangeEnd.getDate() - (elapsedDayCount - 1))
  const previousFullStart = new Date(previousRangeEnd.getFullYear(), previousRangeEnd.getMonth(), previousRangeEnd.getDate() - (dayCount - 1))
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
      const currency = transaction.currency ?? accountCurrencyById.get(transaction.accountId) ?? baseCurrency
      const signedAmount = getSignedAmount(type, transaction.type as TransactionType, transaction.amount, transaction.isRefund)
      return sum + convertAmount(signedAmount, currency, baseCurrency, fx.ratesToBase)
    }, 0)
  )

  const previousTotal = roundMoney(
    previousTransactions.reduce((sum, transaction) => {
      if (transaction.date < previousTotalStart) {
        return sum
      }

      const currency = transaction.currency ?? accountCurrencyById.get(transaction.accountId) ?? baseCurrency
      const signedAmount = getSignedAmount(type, transaction.type as TransactionType, transaction.amount, transaction.isRefund)
      return sum + convertAmount(signedAmount, currency, baseCurrency, fx.ratesToBase)
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

export async function getMonthlyYoyReportData(query?: GetApiReportsMonthlyYoyData["query"]): Promise<MonthlyYoyReportResponse> {
  const { user, baseCurrency, fx, accountCurrencyById } = await loadReportContext()
  const currentYear = new Date().getFullYear()
  const endYear = query?.EndYear ? Number(query.EndYear) : currentYear
  const startYear = query?.StartYear ? Number(query.StartYear) : Math.max(2000, endYear - 2)
  const type = query?.Type ?? "Expense"
  const tripId = query?.TripId ?? null

  if (startYear > endYear) {
    throw new Error("StartYear cannot be greater than EndYear.")
  }

  const yearCount = endYear - startYear + 1
  if (yearCount > 10) {
    throw new Error("Year range cannot be greater than 10 years.")
  }

  const rangeStart = new Date(startYear, 0, 1)
  const rangeEnd = endOfDate(new Date(endYear, 11, 31))
  const allTransactions = await db.query.transactions.findMany({
    where: eq(transactions.userId, user.id),
    orderBy: [asc(transactions.date)],
  })

  const totalsByYearMonth = new Map<number, number[]>()
  for (let year = startYear; year <= endYear; year += 1) {
    totalsByYearMonth.set(
      year,
      Array.from({ length: 12 }, () => 0)
    )
  }

  for (const transaction of allTransactions) {
    if (transaction.date < rangeStart || transaction.date > rangeEnd) {
      continue
    }

    if (tripId && transaction.tripId !== tripId) {
      continue
    }

    if (type === "Income" && transaction.type !== "Income") {
      continue
    }

    if (type === "Expense" && !(transaction.type === "Expense" || transaction.type === "Refund" || transaction.isRefund)) {
      continue
    }

    const signedAmount = getSignedAmount(type, transaction.type as TransactionType, transaction.amount, transaction.isRefund)
    if (signedAmount === 0) {
      continue
    }

    const currency = transaction.currency ?? accountCurrencyById.get(transaction.accountId) ?? baseCurrency
    const amount = convertAmount(signedAmount, currency, baseCurrency, fx.ratesToBase)
    const year = transaction.date.getFullYear()

    if (year < startYear || year > endYear) {
      continue
    }

    const monthIndex = transaction.date.getMonth()
    const totals = totalsByYearMonth.get(year)
    if (!totals) {
      continue
    }

    totals[monthIndex] += amount
  }

  const orderedYears = Array.from({ length: yearCount }, (_, index) => startYear + index)
  const series = orderedYears.map((year, index) => ({
    key: String(year),
    label: String(year),
    year,
    color: yearColors[index % yearColors.length]!,
    total: roundMoney((totalsByYearMonth.get(year) ?? []).reduce((sum, value) => sum + value, 0)),
  }))

  const data = Array.from({ length: 12 }, (_, monthIndex) => {
    const values: Record<string, number> = {}
    let total = 0

    for (const year of orderedYears) {
      const value = roundMoney(totalsByYearMonth.get(year)?.[monthIndex] ?? 0)
      values[String(year)] = value
      total += value
    }

    return {
      month: monthIndex + 1,
      monthLabel: monthLabels[monthIndex]!,
      values,
      total: roundMoney(total),
    }
  })

  const yearTotals = orderedYears.map((year) => ({
    year,
    total: roundMoney((totalsByYearMonth.get(year) ?? []).reduce((sum, value) => sum + value, 0)),
  }))
  const reportTotal = roundMoney(yearTotals.reduce((sum, item) => sum + item.total, 0))
  const latestYearTotal = yearTotals[yearTotals.length - 1]?.total ?? 0
  const previousYearTotal = yearTotals.length > 1 ? yearTotals[yearTotals.length - 2]!.total : 0

  return {
    type,
    baseCurrency,
    startYear,
    endYear,
    months: [...monthLabels],
    series,
    data,
    yearTotals,
    summary: {
      total: reportTotal,
      previousYearTotal,
      averagePerMonth: roundMoney(latestYearTotal / 12),
      yearCount: yearTotals.length,
    },
  }
}

function rollbackBalanceDelta(accountBalances: Map<string, number>, transaction: ReportTransaction) {
  if (transaction.type === "Expense") {
    accountBalances.set(transaction.accountId, (accountBalances.get(transaction.accountId) ?? 0) + transaction.amount)
    return
  }

  if (transaction.type === "Income" || transaction.type === "Refund") {
    accountBalances.set(transaction.accountId, (accountBalances.get(transaction.accountId) ?? 0) - transaction.amount)
    return
  }

  if (transaction.type === "Transfer") {
    accountBalances.set(transaction.accountId, (accountBalances.get(transaction.accountId) ?? 0) + transaction.amount)

    if (transaction.targetAccountId) {
      accountBalances.set(transaction.targetAccountId, (accountBalances.get(transaction.targetAccountId) ?? 0) - (transaction.amount2 ?? transaction.amount))
    }
  }
}

export async function getPortfolioBalanceSeriesReportData(query?: GetApiReportsPortfolioBalanceSeriesData["query"]): Promise<PortfolioBalanceSeriesResponse> {
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

  const endDateFilter = query?.EndDate ? asDateOnly(parseDate(query.EndDate, "EndDate")) : asDateOnly(new Date())
  const startDateFilter = query?.StartDate
    ? asDateOnly(parseDate(query.StartDate, "StartDate"))
    : relevantTransactions[0]
      ? asDateOnly(relevantTransactions[0].date)
      : endDateFilter

  if (startDateFilter > endDateFilter) {
    throw new Error("StartDate cannot be after EndDate.")
  }

  const interval = resolvePortfolioInterval(startDateFilter, endDateFilter, query?.Interval)
  const buckets = buildPortfolioBuckets(startDateFilter, endDateFilter, interval)
  const transactionsAfterEnd = relevantTransactions
    .filter((transaction) => transaction.date > endOfDate(endDateFilter))
    .sort((left, right) => right.date.getTime() - left.date.getTime())
  const transactionsInRange = relevantTransactions
    .filter((transaction) => transaction.date >= startDateFilter && transaction.date <= endOfDate(endDateFilter))
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
