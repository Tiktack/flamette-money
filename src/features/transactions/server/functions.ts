import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"

import {
  searchTransactionsSchema,
  transactionRequestSchema,
  transactionUpdateSchema,
} from "@/features/shared/server/validators"

import {
  createTransactionData,
  deleteTransactionData,
  getTransactionData,
  searchTransactionsData,
  searchTransactionsSummaryData,
  updateTransactionData,
} from "./service.server"

export const getTransactions = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) =>
    z
      .object({
        page: z.number().optional(),
        pageSize: z.number().optional(),
      })
      .optional()
      .parse(data)
  )
  .handler(async ({ data }) =>
    searchTransactionsData({ Page: data?.page, PageSize: data?.pageSize })
  )

export const getTransaction = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ data }) => getTransactionData(data.id))

export const searchTransactions = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => searchTransactionsSchema.parse(data))
  .handler(async ({ data }) => searchTransactionsData(data))

export const searchTransactionsSummary = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => searchTransactionsSchema.parse(data))
  .handler(async ({ data }) => searchTransactionsSummaryData(data))

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
