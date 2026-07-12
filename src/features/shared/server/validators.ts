import { z } from "zod"

import { parserKeys } from "@/features/email-import/server/parsers/registry"
import { accountTypes, categoryTypes, emailImportItemStatuses, emailRuleMatchModes, transactionTypes } from "@/lib/db/schema"

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

export const emailRuleConditionSchema = z.discriminatedUnion("field", [
  z.object({
    field: z.enum(["description", "merchant", "accountHint"]),
    operator: z.enum(["contains", "equals"]),
    value: z.string().trim().min(1),
  }),
  z.object({ field: z.literal("currency"), operator: z.literal("equals"), value: z.string().trim().min(1) }),
  z.object({ field: z.literal("direction"), operator: z.literal("equals"), value: z.enum(["income", "expense"]) }),
  z.object({ field: z.literal("connectionId"), operator: z.literal("equals"), value: z.string().min(1) }),
  z.object({
    field: z.literal("amount"),
    operator: z.enum(["gte", "lte", "between"]),
    value: z.coerce.number().min(0),
    value2: z.coerce.number().min(0).nullable().optional(),
  }),
])

export const emailRuleActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ignore") }),
  z.object({
    type: z.literal("assign"),
    accountId: z.string().nullable(),
    categoryId: z.string().nullable(),
    subCategoryId: z.string().nullable(),
    note: z.string().nullable(),
  }),
])

// Stored parsed_json payloads are re-validated on every read.
export const parsedEmailTransactionSchema = z.object({
  direction: z.enum(["income", "expense"]),
  amount: z.number(),
  currency: z.string(),
  bookedAt: z.string().nullable(),
  description: z.string().nullable(),
  merchant: z.string().nullable(),
  // Defaulted so payloads stored before the field existed still validate.
  location: z.string().nullable().default(null),
  accountHint: z.string().nullable(),
  balanceAfter: z.number().nullable(),
})

export const emailRuleConditionsSchema = z.array(emailRuleConditionSchema).superRefine((conditions, ctx) => {
  conditions.forEach((condition, index) => {
    if (condition.field === "amount" && condition.operator === "between") {
      if (condition.value2 === null || condition.value2 === undefined || condition.value2 < condition.value) {
        ctx.addIssue({
          code: "custom",
          message: "The upper bound of an amount range must be greater than or equal to the lower bound.",
          path: [index, "value2"],
        })
      }
    }
  })
})

export const emailImportRuleRequestSchema = z.object({
  name: z.string().trim().min(1),
  enabled: z.boolean(),
  matchMode: z.enum(emailRuleMatchModes),
  conditions: emailRuleConditionsSchema,
  action: emailRuleActionSchema,
})

export const emailImportRuleUpdateSchema = z.object({
  id: z.string(),
  request: emailImportRuleRequestSchema,
})

export const emailImportRulesReorderSchema = z.object({
  orderedIds: z.array(z.string()).min(1),
})

export const emailRulePreviewSchema = z.object({
  matchMode: z.enum(emailRuleMatchModes),
  conditions: emailRuleConditionsSchema,
})

export const emailConnectionRequestSchema = z.object({
  name: z.string().trim().min(1),
  username: z.email(),
  password: z.string().min(1),
  folder: z.string().trim().min(1),
  parserKey: z.enum(parserKeys),
  host: z.string().trim().min(1).optional(),
  port: z.coerce.number().int().min(1).max(65535).optional(),
  defaultAccountId: z.string().nullable().optional(),
  pollIntervalMinutes: z.coerce.number().int().min(5).max(1440).optional(),
  enabled: z.boolean().optional(),
})

export const emailConnectionUpdateSchema = z.object({
  id: z.string(),
  request: emailConnectionRequestSchema.omit({ password: true }).extend({
    // Absent/empty password keeps the stored one.
    password: z.string().nullable().optional(),
  }),
})

export const emailConnectionTestSchema = z.object({
  connectionId: z.string().nullable().optional(),
  host: z.string().trim().min(1).optional(),
  port: z.coerce.number().int().min(1).max(65535).optional(),
  username: z.string().trim().optional(),
  password: z.string().optional(),
  folder: z.string().trim().optional(),
})

export const emailImportItemsQuerySchema = z
  .object({
    statuses: z.array(z.enum(emailImportItemStatuses)).optional(),
    connectionId: z.string().optional(),
    limit: z.number().int().min(1).max(200).optional(),
    offset: z.number().int().min(0).optional(),
  })
  .optional()

export const emailImportItemLinkSchema = z.object({
  id: z.string(),
  transactionId: z.string(),
})

export const emailImportReparseSchema = z.object({
  ids: z.array(z.string()).optional(),
  connectionId: z.string().optional(),
})
