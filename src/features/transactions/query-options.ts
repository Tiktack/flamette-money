import { keepPreviousData, queryOptions } from "@tanstack/react-query"

import { getTransaction, getTransactions, searchTransactions, searchTransactionsFacets, searchTransactionsSummary } from "./server/functions"

import { queryKeys } from "@/features/shared/query-keys"

import type { GetApiTransactionsSearchData, TransactionSearchFacets, TransactionSearchSummary } from "./types"

export const transactionsQueryOptions = (page = 1, pageSize = 50) =>
  queryOptions({
    queryKey: queryKeys.transactions(page, pageSize),
    queryFn: () => getTransactions({ data: { page, pageSize } }),
  })

export const transactionQueryOptions = (id: string) =>
  queryOptions({
    queryKey: queryKeys.transactionById(id),
    queryFn: () => getTransaction({ data: { id } }),
  })

export const transactionsSearchQueryOptions = (query?: GetApiTransactionsSearchData["query"]) =>
  queryOptions({
    queryKey: queryKeys.transactionsSearch(query),
    queryFn: () => searchTransactions({ data: query }),
    placeholderData: keepPreviousData,
  })

export const transactionsSummaryQueryOptions = (query?: GetApiTransactionsSearchData["query"]) =>
  queryOptions<TransactionSearchSummary>({
    queryKey: queryKeys.transactionsSummary(query),
    queryFn: () => searchTransactionsSummary({ data: query }),
    placeholderData: keepPreviousData,
  })

export const transactionsFacetsQueryOptions = (query?: GetApiTransactionsSearchData["query"]) =>
  queryOptions<TransactionSearchFacets>({
    queryKey: queryKeys.transactionsFacets(query),
    queryFn: () => searchTransactionsFacets({ data: query }),
    placeholderData: keepPreviousData,
  })
