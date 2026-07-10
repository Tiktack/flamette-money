import { z } from "zod"

import { accountTypes, categoryTypes, transactionTypes } from "@/lib/db/schema"

// Coerce so string inputs (query params, form payloads) parse into the numeric request types.
const numberLike = z.coerce.number().nullable().optional()

export const accountRequestSchema = z.object({
  name: z.string(),
  description: z.string().nullable(),
  currency: z.string(),
  color: z.string(),
  icon: z.string(),
  type: z.enum(accountTypes),
  currentBalance: z.coerce.number(),
})

export const accountUpdateSchema = z.object({
  id: z.string(),
  request: z.object({
    name: z.string(),
    description: z.string().nullable(),
    color: z.string(),
    icon: z.string(),
    type: z.enum(accountTypes),
    currentBalance: z.coerce.number(),
  }),
})

export const categoryCreateSchema = z.object({
  name: z.string(),
  color: z.string(),
  icon: z.string(),
  parentId: z.string().nullable(),
  type: z.enum(categoryTypes),
})

export const categoryUpdateSchema = z.object({
  id: z.string(),
  request: z.object({
    name: z.string(),
    color: z.string(),
    icon: z.string(),
    parentId: z.string().nullable(),
  }),
})

export const tripRequestSchema = z.object({
  name: z.string(),
  country: z.string().nullable(),
  startDate: z.string(),
  endDate: z.string(),
  imageUrl: z.string().nullable(),
})

export const tripUpdateSchema = z.object({
  id: z.string(),
  request: tripRequestSchema,
})

export const transactionItemSchema = z.object({
  name: z.string(),
  quantity: z.coerce.number(),
  unit: z.string().nullable(),
  unitPrice: z.coerce.number(),
  promotionAmount: z.coerce.number(),
  categoryId: z.string().nullable(),
  subCategoryId: z.string().nullable(),
})

export const transactionRequestSchema = z.object({
  date: z.string(),
  type: z.enum(transactionTypes),
  amount: z.coerce.number(),
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

export const transactionUpdateSchema = z.object({
  id: z.string(),
  request: transactionRequestSchema,
})

export const searchTransactionsSchema = z
  .object({
    StartDate: z.string().optional(),
    EndDate: z.string().optional(),
    AccountIds: z.array(z.string()).optional(),
    TripIds: z.array(z.string()).optional(),
    CategoryIds: z.array(z.string()).optional(),
    Types: z.array(z.enum(transactionTypes)).optional(),
    SearchText: z.string().optional(),
    MinAmount: z.coerce.number().optional(),
    MaxAmount: z.coerce.number().optional(),
    Page: z.number().optional(),
    PageSize: z.number().optional(),
  })
  .optional()

const reportIntervalSchema = z.enum(["Auto", "None", "Day", "Week", "Month"])

export const cashflowReportSchema = z
  .object({
    StartDate: z.string().optional(),
    EndDate: z.string().optional(),
    Interval: reportIntervalSchema.optional(),
  })
  .optional()

export const categoryReportSchema = z
  .object({
    StartDate: z.string().optional(),
    EndDate: z.string().optional(),
    Type: z.enum(categoryTypes).optional(),
    Interval: reportIntervalSchema.optional(),
    TripId: z.string().optional(),
    GroupTripsAsCategory: z.boolean().optional(),
  })
  .optional()

export const portfolioReportSchema = z
  .object({
    StartDate: z.string().optional(),
    EndDate: z.string().optional(),
    Interval: reportIntervalSchema.optional(),
    BaseCurrency: z.string().optional(),
    AccountIds: z.array(z.string()).optional(),
  })
  .optional()

export const comparisonReportSchema = z
  .object({
    PeriodAStart: z.string().optional(),
    PeriodAEnd: z.string().optional(),
    PeriodBStart: z.string().optional(),
    PeriodBEnd: z.string().optional(),
    Type: z.enum(categoryTypes).optional(),
    Interval: reportIntervalSchema.optional(),
  })
  .optional()
