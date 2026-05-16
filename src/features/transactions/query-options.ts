import { keepPreviousData, queryOptions } from "@tanstack/react-query"

import {
  getTransaction,
  getTransactions,
  searchTransactions,
} from "./server/functions"

import { queryKeys } from "@/features/shared/query-keys"

import type { GetApiTransactionsSearchData } from "./types"

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

export const transactionsSearchQueryOptions = (
  query?: GetApiTransactionsSearchData["query"]
) =>
  queryOptions({
    queryKey: queryKeys.transactionsSearch(query),
    queryFn: () => searchTransactions({ data: query }),
    placeholderData: keepPreviousData,
  })
