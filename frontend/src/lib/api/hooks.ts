import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  deleteApiAccountsById,
  deleteApiCategoriesById,
  getApiAccounts,
  getApiAuthMe,
  getApiCategories,
  getApiReportsCategorySeries,
  getApiTransactions,
  getApiTransactionsById,
  getApiTransactionsSearch,
  getApiTrips,
  deleteApiTransactionsById,
  postApiAccounts,
  postApiAuthLogout,
  postApiCategories,
  postApiReceiptsScan,
  postApiSeedDemo,
  postApiTransactions,
  postApiTrips,
  putApiAccountsById,
  putApiCategoriesById,
  putApiTransactionsById,
  putApiTripsById,
} from './generated/sdk.gen'
import type { GetApiReportsCategorySeriesData, GetApiTransactionsSearchData } from './generated/types.gen'
import type { CurrentUserResponse } from './generated/types.gen'
import type {
  AccountCreateRequest,
  AccountUpdateRequest,
  CategoryCreateRequest,
  CategoryUpdateRequest,
  TripCreateRequest,
  TripUpdateRequest,
  TransactionCreateRequest,
  TransactionUpdateRequest,
} from './types'

export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: () => getApiAccounts({ throwOnError: true }),
    select: (result) => result.data ?? [],
  })
}

export function useCurrentUser() {
  return useQuery<CurrentUserResponse | null>({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const result = await getApiAuthMe({ throwOnError: false })
      return result.data ?? null
    },
    staleTime: 60_000,
  })
}

export function useLogout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => postApiAuthLogout({ throwOnError: true }).then(() => undefined),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
      await queryClient.invalidateQueries({ queryKey: ['accounts'] })
      await queryClient.invalidateQueries({ queryKey: ['categories'] })
      await queryClient.invalidateQueries({ queryKey: ['trips'] })
      await queryClient.invalidateQueries({ queryKey: ['transactions'] })
      await queryClient.invalidateQueries({ queryKey: ['transactions-search'] })
      await queryClient.invalidateQueries({ queryKey: ['reports-category-series'] })
    },
  })
}

export function useCreateAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: AccountCreateRequest) =>
      postApiAccounts({ body: request, throwOnError: true }).then((result) => result.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts'] }),
  })
}

export function useUpdateAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: AccountUpdateRequest }) =>
      putApiAccountsById({ path: { id }, body: request, throwOnError: true }).then(
        (result) => result.data,
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts'] }),
  })
}

export function useDeleteAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      deleteApiAccountsById({ path: { id }, throwOnError: true }).then(() => undefined),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts'] }),
  })
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => getApiCategories({ throwOnError: true }),
    select: (result) => result.data ?? [],
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: CategoryCreateRequest) =>
      postApiCategories({ body: request, throwOnError: true }).then((result) => result.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  })
}

export function useUpdateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: CategoryUpdateRequest }) =>
      putApiCategoriesById({ path: { id }, body: request, throwOnError: true }).then(
        (result) => result.data,
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      deleteApiCategoriesById({ path: { id }, throwOnError: true }).then(() => undefined),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  })
}

export function useTransactions(page = 1, pageSize = 50) {
  return useQuery({
    queryKey: ['transactions', page, pageSize],
    queryFn: () =>
      getApiTransactions({
        query: { page, pageSize },
        throwOnError: true,
      }),
    select: (result) => result.data ?? [],
  })
}

export function useTransactionsSearch(query?: GetApiTransactionsSearchData['query']) {
  return useQuery({
    queryKey: ['transactions-search', query ?? {}],
    queryFn: () =>
      getApiTransactionsSearch(
        query ? { query, throwOnError: true } : { throwOnError: true },
      ),
    select: (result) => result.data ?? [],
  })
}

export function useCategorySeriesReport(query?: GetApiReportsCategorySeriesData['query']) {
  return useQuery({
    queryKey: ['reports-category-series', query ?? {}],
    queryFn: () =>
      getApiReportsCategorySeries(
        query ? { query, throwOnError: true } : { throwOnError: true },
      ),
    placeholderData: keepPreviousData,
    select: (result) => result.data,
  })
}

export function useTrips() {
  return useQuery({
    queryKey: ['trips'],
    queryFn: () => getApiTrips({ throwOnError: true }),
    select: (result) => result.data ?? [],
  })
}

export function useCreateTrip() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: TripCreateRequest) =>
      postApiTrips({ body: request, throwOnError: true }).then((result) => result.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] })
      queryClient.invalidateQueries({ queryKey: ['reports-category-series'] })
    },
  })
}

export function useUpdateTrip() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: TripUpdateRequest }) =>
      putApiTripsById({ path: { id }, body: request, throwOnError: true }).then((result) => result.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] })
      queryClient.invalidateQueries({ queryKey: ['reports-category-series'] })
      queryClient.invalidateQueries({ queryKey: ['transactions-search'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
}

export function useTransaction(id?: string) {
  return useQuery({
    queryKey: ['transactions', id],
    queryFn: () => getApiTransactionsById({ path: { id: id ?? '' }, throwOnError: true }),
    select: (result) => result.data,
    enabled: Boolean(id),
  })
}

export function useCreateTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: TransactionCreateRequest) =>
      postApiTransactions({ body: request, throwOnError: true }).then((result) => result.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions-search'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['reports-category-series'] })
    },
  })
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: TransactionUpdateRequest }) =>
      putApiTransactionsById({ path: { id }, body: request, throwOnError: true }).then(
        (result) => result.data,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions-search'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['reports-category-series'] })
    },
  })
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      deleteApiTransactionsById({ path: { id }, throwOnError: true }).then(() => undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions-search'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['reports-category-series'] })
    },
  })
}

export function useScanReceipt() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ file, accountId }: { file: File; accountId: string }) =>
      postApiReceiptsScan({ body: { file, accountId }, throwOnError: true }).then(
        (result) => result.data,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions-search'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
    },
  })
}

export function useSeedDemo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (years: number) =>
      postApiSeedDemo({ query: { Years: years }, throwOnError: true }).then((result) => result.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      queryClient.invalidateQueries({ queryKey: ['trips'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['transactions-search'] })
      queryClient.invalidateQueries({ queryKey: ['reports-category-series'] })
    },
  })
}
