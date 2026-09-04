import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"

import { searchTransactionsSchema, transactionRequestSchema, transactionUpdateSchema } from "@/features/shared/server/validators"

import {
  createTransactionData,
  deleteTransactionData,
  getTransactionData,
  searchTransactionsFacetsData,
  searchTransactionsData,
  searchTransactionsSummaryData,
  updateTransactionData,
} from "./service.server"

export const getTransaction = createServerFn({ method: "GET" })
  .validator((data: unknown) => z.object({ id: z.string() }).parse(data))
  .handler(({ data }) => getTransactionData(data.id))

export const searchTransactions = createServerFn({ method: "GET" })
  .validator((data: unknown) => searchTransactionsSchema.parse(data))
  .handler(({ data }) => searchTransactionsData(data))

export const searchTransactionsSummary = createServerFn({ method: "GET" })
  .validator((data: unknown) => searchTransactionsSchema.parse(data))
  .handler(({ data }) => searchTransactionsSummaryData(data))

export const searchTransactionsFacets = createServerFn({ method: "GET" })
  .validator((data: unknown) => searchTransactionsSchema.parse(data))
  .handler(({ data }) => searchTransactionsFacetsData(data))

export const createTransaction = createServerFn({ method: "POST" })
  .validator((data: unknown) => transactionRequestSchema.parse(data))
  .handler(({ data }) => createTransactionData(data))

export const updateTransaction = createServerFn({ method: "POST" })
  .validator((data: unknown) => transactionUpdateSchema.parse(data))
  .handler(({ data }) => updateTransactionData(data.id, data.request))

export const deleteTransaction = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({ id: z.string() }).parse(data))
  .handler(({ data }) => deleteTransactionData(data.id))
