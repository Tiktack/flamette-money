import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"

import {
  createAccountData,
  createCategoryData,
  createTransactionData,
  createTripData,
  deleteAccountData,
  deleteCategoryData,
  deleteTransactionData,
  getAccountData,
  getAppInfoData,
  getCurrentUserData,
  getSettingsData,
  getTransactionData,
  listAccountsData,
  listCategoriesData,
  listTransactionsData,
  listTripsData,
  resetUserData,
  searchTransactionsData,
  updateAccountData,
  updateCategoryData,
  updateSettingsData,
  updateTransactionData,
  updateTripData,
} from "@/lib/api/finance.server"
import {
  getCashflowSeriesReportData,
  getCategorySeriesReportData,
  getMonthlyYoyReportData,
  getPortfolioBalanceSeriesReportData,
} from "@/lib/api/reports.server"
import { accountTypes, categoryTypes, transactionTypes } from "@/lib/db/schema"

const numberLike = z.union([z.number(), z.string()]).nullable().optional()

const accountRequestSchema = z.object({
  name: z.string(),
  description: z.string().nullable(),
  currency: z.string(),
  color: z.string(),
  icon: z.string(),
  type: z.enum(accountTypes),
  currentBalance: z.union([z.number(), z.string()]),
})

const accountUpdateSchema = z.object({
  id: z.string(),
  request: z.object({
    name: z.string(),
    description: z.string().nullable(),
    color: z.string(),
    icon: z.string(),
    type: z.enum(accountTypes),
    currentBalance: z.union([z.number(), z.string()]),
  }),
})

const categoryCreateSchema = z.object({
  name: z.string(),
  color: z.string(),
  icon: z.string(),
  parentId: z.string().nullable(),
  type: z.enum(categoryTypes),
})

const categoryUpdateSchema = z.object({
  id: z.string(),
  request: z.object({
    name: z.string(),
    color: z.string(),
    icon: z.string(),
    parentId: z.string().nullable(),
  }),
})

const tripRequestSchema = z.object({
  name: z.string(),
  country: z.string().nullable(),
  startDate: z.string(),
  endDate: z.string(),
  imageUrl: z.string().nullable(),
})

const tripUpdateSchema = z.object({
  id: z.string(),
  request: tripRequestSchema,
})

const transactionItemSchema = z.object({
  name: z.string(),
  quantity: z.union([z.number(), z.string()]),
  unit: z.string().nullable(),
  unitPrice: z.union([z.number(), z.string()]),
  promotionAmount: z.union([z.number(), z.string()]),
  categoryId: z.string().nullable(),
  subCategoryId: z.string().nullable(),
})

const transactionRequestSchema = z.object({
  date: z.string(),
  type: z.enum(transactionTypes),
  amount: z.union([z.number(), z.string()]),
  accountId: z.string(),
  tripId: z.string().nullable(),
  categoryId: z.string().nullable(),
  subCategoryId: z.string().nullable(),
  targetAccountId: z.string().nullable(),
  originalTransactionId: z.string().nullable(),
  note: z.string().nullable(),
  merchantName: z.string().nullable(),
  location: z.string().nullable(),
  amount2: numberLike,
  currency: z.string().nullable().optional(),
  currency2: z.string().nullable().optional(),
  items: z.array(transactionItemSchema).nullable().optional(),
})

const transactionUpdateSchema = z.object({
  id: z.string(),
  request: transactionRequestSchema,
})

const searchTransactionsSchema = z
  .object({
    StartDate: z.string().optional(),
    EndDate: z.string().optional(),
    AccountIds: z.array(z.string()).optional(),
    TripIds: z.array(z.string()).optional(),
    CategoryIds: z.array(z.string()).optional(),
    Types: z.array(z.enum(transactionTypes)).optional(),
    SearchText: z.string().optional(),
    MinAmount: z.union([z.number(), z.string()]).optional(),
    MaxAmount: z.union([z.number(), z.string()]).optional(),
  })
  .optional()

const reportIntervalSchema = z.enum(["Auto", "None", "Day", "Week", "Month"])

const cashflowReportSchema = z
  .object({
    StartDate: z.string().optional(),
    EndDate: z.string().optional(),
    Interval: reportIntervalSchema.optional(),
  })
  .optional()

const categoryReportSchema = z
  .object({
    StartDate: z.string().optional(),
    EndDate: z.string().optional(),
    Type: z.enum(categoryTypes).optional(),
    Interval: reportIntervalSchema.optional(),
    TripId: z.string().optional(),
    GroupTripsAsCategory: z.boolean().optional(),
  })
  .optional()

const monthlyYoySchema = z
  .object({
    StartYear: z.union([z.number(), z.string()]).optional(),
    EndYear: z.union([z.number(), z.string()]).optional(),
    Type: z.enum(categoryTypes).optional(),
    TripId: z.string().optional(),
  })
  .optional()

const portfolioReportSchema = z
  .object({
    StartDate: z.string().optional(),
    EndDate: z.string().optional(),
    Interval: reportIntervalSchema.optional(),
    BaseCurrency: z.string().optional(),
    AccountIds: z.array(z.string()).optional(),
  })
  .optional()

export const getCurrentUser = createServerFn({ method: "GET" }).handler(async () => getCurrentUserData())

export const getAppInfo = createServerFn({ method: "GET" }).handler(async () => getAppInfoData())

export const getSettings = createServerFn({ method: "GET" }).handler(async () => getSettingsData())

export const updateSettings = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ baseCurrency: z.string() }).parse(data))
  .handler(async ({ data }) => updateSettingsData(data))

export const postResetUserData = createServerFn({ method: "POST" }).handler(async () => resetUserData())

export const getAccounts = createServerFn({ method: "GET" }).handler(async () => listAccountsData())

export const getAccount = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ data }) => getAccountData(data.id))

export const createAccount = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => accountRequestSchema.parse(data))
  .handler(async ({ data }) => createAccountData(data))

export const updateAccount = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => accountUpdateSchema.parse(data))
  .handler(async ({ data }) => updateAccountData(data.id, data.request))

export const deleteAccount = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ data }) => {
    await deleteAccountData(data.id)
  })

export const getCategories = createServerFn({ method: "GET" }).handler(async () => listCategoriesData())

export const createCategory = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => categoryCreateSchema.parse(data))
  .handler(async ({ data }) => createCategoryData(data))

export const updateCategory = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => categoryUpdateSchema.parse(data))
  .handler(async ({ data }) => updateCategoryData(data.id, data.request))

export const deleteCategory = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ data }) => {
    await deleteCategoryData(data.id)
  })

export const getTrips = createServerFn({ method: "GET" }).handler(async () => listTripsData())

export const createTrip = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => tripRequestSchema.parse(data))
  .handler(async ({ data }) => createTripData(data))

export const updateTrip = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => tripUpdateSchema.parse(data))
  .handler(async ({ data }) => updateTripData(data.id, data.request))

export const getTransactions = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) =>
    z
      .object({
        page: z.number().optional(),
        pageSize: z.number().optional(),
      })
      .optional()
      .parse(data),
  )
  .handler(async ({ data }) => listTransactionsData(data?.page, data?.pageSize))

export const getTransaction = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ data }) => getTransactionData(data.id))

export const searchTransactions = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => searchTransactionsSchema.parse(data))
  .handler(async ({ data }) => searchTransactionsData(data))

export const getCashflowSeriesReport = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => cashflowReportSchema.parse(data))
  .handler(async ({ data }) => getCashflowSeriesReportData(data))

export const getCategorySeriesReport = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => categoryReportSchema.parse(data))
  .handler(async ({ data }) => getCategorySeriesReportData(data))

export const getMonthlyYoyReport = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => monthlyYoySchema.parse(data))
  .handler(async ({ data }) => getMonthlyYoyReportData(data))

export const getPortfolioBalanceSeriesReport = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => portfolioReportSchema.parse(data))
  .handler(async ({ data }) => getPortfolioBalanceSeriesReportData(data))

export const createTransaction = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => transactionRequestSchema.parse(data))
  .handler(async ({ data }) => createTransactionData(data))

export const updateTransaction = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => transactionUpdateSchema.parse(data))
  .handler(async ({ data }) => updateTransactionData(data.id, data.request))

export const deleteTransaction = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ data }) => {
    await deleteTransactionData(data.id)
  })
