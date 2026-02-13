import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import {
  getApiAccounts,
  getApiAuthMe,
  getApiCategories,
  getApiReportsCategorySeries,
  getApiTransactions,
  getApiTransactionsById,
  getApiTransactionsSearch,
  getApiTrips,
} from './generated/sdk.gen'
import type {
  CurrentUserResponse,
  GetApiReportsCategorySeriesData,
  GetApiTransactionsSearchData,
} from './generated/types.gen'

export const queryKeys = {
  authMe: () => ['auth', 'me'] as const,
  accounts: () => ['accounts'] as const,
  categories: () => ['categories'] as const,
  trips: () => ['trips'] as const,
  transactions: (page: number, pageSize: number) => ['transactions', page, pageSize] as const,
  transactionById: (id: string) => ['transactions', id] as const,
  transactionsSearch: (query?: GetApiTransactionsSearchData['query']) =>
    ['transactions-search', query ?? {}] as const,
  reportsCategorySeries: (query?: GetApiReportsCategorySeriesData['query']) =>
    ['reports-category-series', query ?? {}] as const,
}

export const accountsQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.accounts(),
    queryFn: () => getApiAccounts({ throwOnError: true }),
    select: (result: Awaited<ReturnType<typeof getApiAccounts>>) => result.data ?? [],
  })

export const currentUserQueryOptions = () =>
  queryOptions<CurrentUserResponse | null>({
    queryKey: queryKeys.authMe(),
    queryFn: async () => {
      const result = await getApiAuthMe({ throwOnError: false })
      return result.data ?? null
    },
    staleTime: 60_000,
  })

export const categoriesQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.categories(),
    queryFn: () => getApiCategories({ throwOnError: true }),
    select: (result: Awaited<ReturnType<typeof getApiCategories>>) => result.data ?? [],
  })

export const tripsQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.trips(),
    queryFn: () => getApiTrips({ throwOnError: true }),
    select: (result: Awaited<ReturnType<typeof getApiTrips>>) => result.data ?? [],
  })

export const transactionsQueryOptions = (page = 1, pageSize = 50) =>
  queryOptions({
    queryKey: queryKeys.transactions(page, pageSize),
    queryFn: () =>
      getApiTransactions({
        query: { page, pageSize },
        throwOnError: true,
      }),
    select: (result: Awaited<ReturnType<typeof getApiTransactions>>) => result.data ?? [],
  })

export const transactionQueryOptions = (id: string) =>
  queryOptions({
    queryKey: queryKeys.transactionById(id),
    queryFn: () => getApiTransactionsById({ path: { id }, throwOnError: true }),
    select: (result: Awaited<ReturnType<typeof getApiTransactionsById>>) => result.data,
  })

export const transactionsSearchQueryOptions = (query?: GetApiTransactionsSearchData['query']) =>
  queryOptions({
    queryKey: queryKeys.transactionsSearch(query),
    queryFn: () =>
      getApiTransactionsSearch(
        query ? { query, throwOnError: true } : { throwOnError: true },
      ),
    select: (result: Awaited<ReturnType<typeof getApiTransactionsSearch>>) => result.data ?? [],
  })

export const categorySeriesQueryOptions = (query?: GetApiReportsCategorySeriesData['query']) =>
  queryOptions({
    queryKey: queryKeys.reportsCategorySeries(query),
    queryFn: () =>
      getApiReportsCategorySeries(
        query ? { query, throwOnError: true } : { throwOnError: true },
      ),
    placeholderData: keepPreviousData,
    select: (result: Awaited<ReturnType<typeof getApiReportsCategorySeries>>) => result.data,
  })
