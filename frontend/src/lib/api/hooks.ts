import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  accountsQueryOptions,
  categoriesQueryOptions,
  categorySeriesQueryOptions,
  currentUserQueryOptions,
  queryKeys,
  transactionQueryOptions,
  transactionsQueryOptions,
  transactionsSearchQueryOptions,
  tripsQueryOptions,
} from './queryOptions'
import {
  deleteApiAccountsById,
  deleteApiCategoriesById,
  deleteApiTransactionsById,
  postApiAccounts,
  postApiAuthLogout,
  postApiCategories,
  postApiProfileImportBackup,
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

export type BackupImportType = 'one-money'

export function useAccounts() {
  return useQuery(accountsQueryOptions())
}

export function useCurrentUser() {
  return useQuery(currentUserQueryOptions())
}

export function useLogout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => postApiAuthLogout({ throwOnError: true }).then(() => undefined),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.authMe() })
      await queryClient.invalidateQueries({ queryKey: queryKeys.accounts() })
      await queryClient.invalidateQueries({ queryKey: queryKeys.categories() })
      await queryClient.invalidateQueries({ queryKey: queryKeys.trips() })
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.accounts() }),
  })
}

export function useUpdateAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: AccountUpdateRequest }) =>
      putApiAccountsById({ path: { id }, body: request, throwOnError: true }).then(
        (result) => result.data,
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.accounts() }),
  })
}

export function useDeleteAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      deleteApiAccountsById({ path: { id }, throwOnError: true }).then(() => undefined),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.accounts() }),
  })
}

export function useCategories() {
  return useQuery(categoriesQueryOptions())
}

export function useCreateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: CategoryCreateRequest) =>
      postApiCategories({ body: request, throwOnError: true }).then((result) => result.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.categories() }),
  })
}

export function useUpdateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: CategoryUpdateRequest }) =>
      putApiCategoriesById({ path: { id }, body: request, throwOnError: true }).then(
        (result) => result.data,
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.categories() }),
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      deleteApiCategoriesById({ path: { id }, throwOnError: true }).then(() => undefined),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.categories() }),
  })
}

export function useTransactions(page = 1, pageSize = 50) {
  return useQuery(transactionsQueryOptions(page, pageSize))
}

export function useTransactionsSearch(query?: GetApiTransactionsSearchData['query']) {
  return useQuery(transactionsSearchQueryOptions(query))
}

export function useCategorySeriesReport(query?: GetApiReportsCategorySeriesData['query']) {
  return useQuery(categorySeriesQueryOptions(query))
}

export function useTrips() {
  return useQuery(tripsQueryOptions())
}

export function useCreateTrip() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: TripCreateRequest) =>
      postApiTrips({ body: request, throwOnError: true }).then((result) => result.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.trips() })
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
      queryClient.invalidateQueries({ queryKey: queryKeys.trips() })
      queryClient.invalidateQueries({ queryKey: ['reports-category-series'] })
      queryClient.invalidateQueries({ queryKey: ['transactions-search'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
}

export function useTransaction(id?: string) {
  return useQuery({
    ...transactionQueryOptions(id ?? ''),
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
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts() })
    },
  })
}

export function useSeedDemo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (years: number) =>
      postApiSeedDemo({ query: { Years: years }, throwOnError: true }).then((result) => result.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts() })
      queryClient.invalidateQueries({ queryKey: queryKeys.categories() })
      queryClient.invalidateQueries({ queryKey: queryKeys.trips() })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['transactions-search'] })
      queryClient.invalidateQueries({ queryKey: ['reports-category-series'] })
    },
  })
}

export function useImportBackup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ file, type }: { file: File; type: BackupImportType }) =>
      postApiProfileImportBackup({ body: { file, type }, throwOnError: true }).then(
        (result) => result.data,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts() })
      queryClient.invalidateQueries({ queryKey: queryKeys.categories() })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['transactions-search'] })
      queryClient.invalidateQueries({ queryKey: ['reports-category-series'] })
    },
  })
}
