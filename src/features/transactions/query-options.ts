import { keepPreviousData, queryOptions } from "@tanstack/react-query"

import { getTransaction, searchTransactions, searchTransactionsFacets, searchTransactionsSummary } from "./server/functions"

import { queryKeys } from "@/features/shared/query-keys"

import type { TransactionSearchFacets, TransactionSearchQuery, TransactionSearchSummary } from "./types"

export const transactionQueryOptions = (id: string) =>
  queryOptions({
    queryKey: queryKeys.transactionById(id),
    queryFn: () => getTransaction({ data: { id } }),
  })

export const transactionsSearchQueryOptions = (query?: TransactionSearchQuery) =>
  queryOptions({
    queryKey: queryKeys.transactionsSearch(query),
    queryFn: () => searchTransactions({ data: query }),
    placeholderData: keepPreviousData,
  })

export const transactionsSummaryQueryOptions = (query?: TransactionSearchQuery) =>
  queryOptions<TransactionSearchSummary>({
    queryKey: queryKeys.transactionsSummary(query),
    queryFn: () => searchTransactionsSummary({ data: query }),
    placeholderData: keepPreviousData,
  })

export const transactionsFacetsQueryOptions = (query?: TransactionSearchQuery) =>
  queryOptions<TransactionSearchFacets>({
    queryKey: queryKeys.transactionsFacets(query),
    queryFn: () => searchTransactionsFacets({ data: query }),
    placeholderData: keepPreviousData,
  })
