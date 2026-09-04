import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { transactionQueryOptions, transactionsFacetsQueryOptions, transactionsSearchQueryOptions, transactionsSummaryQueryOptions } from "./query-options"
import { createTransaction, deleteTransaction, updateTransaction } from "./server/functions"

import { invalidateQueries, transactionMutationInvalidations } from "@/features/shared/cache-invalidations"

import type { TransactionCreateRequest, TransactionSearchQuery, TransactionUpdateRequest } from "./types"

export function useTransactionsSearch(query?: TransactionSearchQuery, options?: { enabled?: boolean }) {
  return useQuery({
    ...transactionsSearchQueryOptions(query),
    enabled: options?.enabled,
  })
}

export function useTransactionsSummary(query?: TransactionSearchQuery) {
  return useQuery(transactionsSummaryQueryOptions(query))
}

export function useTransactionsFacets(query?: TransactionSearchQuery) {
  return useQuery(transactionsFacetsQueryOptions(query))
}

export function useTransaction(id?: string) {
  return useQuery({
    ...transactionQueryOptions(id ?? ""),
    enabled: Boolean(id),
  })
}

export function useCreateTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: TransactionCreateRequest) => createTransaction({ data: request }),
    onSuccess: async () => invalidateQueries(queryClient, transactionMutationInvalidations),
  })
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: TransactionUpdateRequest }) => updateTransaction({ data: { id, request } }),
    onSuccess: async () => invalidateQueries(queryClient, transactionMutationInvalidations),
  })
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteTransaction({ data: { id } }),
    onSuccess: async () => invalidateQueries(queryClient, transactionMutationInvalidations),
  })
}
