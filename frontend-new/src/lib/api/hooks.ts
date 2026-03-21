import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  accountsQueryOptions,
  appInfoQueryOptions,
  cashflowSeriesQueryOptions,
  categoriesQueryOptions,
  categorySeriesQueryOptions,
  currentUserQueryOptions,
  monthlyYoyQueryOptions,
  portfolioBalanceSeriesQueryOptions,
  queryKeys,
  settingsQueryOptions,
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
  postApiSettingsResetData,
  postApiTransactions,
  postApiTrips,
  putApiSettings,
  putApiAccountsById,
  putApiCategoriesById,
  putApiTransactionsById,
  putApiTripsById,
} from './generated/sdk.gen'
import type {
  GetApiReportsCashflowSeriesData,
  GetApiReportsCategorySeriesData,
  GetApiReportsMonthlyYoyData,
  GetApiReportsPortfolioBalanceSeriesData,
  UpdateUserSettingsRequest,
  GetApiTransactionsSearchData,
} from './generated/types.gen'
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

export type BackupImportType = 'one-money' | 'flamette'
export type BackupExportType = 'flamette'

export function useAccounts() {
  return useQuery(accountsQueryOptions())
}

export function useAppInfo() {
  return useQuery(appInfoQueryOptions())
}

export function useCurrentUser() {
  return useQuery(currentUserQueryOptions())
}

export function useSettings() {
  return useQuery(settingsQueryOptions())
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
      await queryClient.invalidateQueries({ queryKey: ['reports-cashflow-series'] })
      await queryClient.invalidateQueries({ queryKey: ['reports-category-series'] })
      await queryClient.invalidateQueries({ queryKey: ['reports-monthly-yoy'] })
      await queryClient.invalidateQueries({ queryKey: ['reports-portfolio-balance-series'] })
      await queryClient.invalidateQueries({ queryKey: queryKeys.settings() })
    },
  })
}

export function useUpdateSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: UpdateUserSettingsRequest) =>
      putApiSettings({ body: request, throwOnError: true }).then((result) => result.data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.settings() })
      await queryClient.invalidateQueries({ queryKey: queryKeys.authMe() })
      await queryClient.invalidateQueries({ queryKey: queryKeys.trips() })
      await queryClient.invalidateQueries({ queryKey: ['reports-cashflow-series'] })
      await queryClient.invalidateQueries({ queryKey: ['reports-category-series'] })
      await queryClient.invalidateQueries({ queryKey: ['reports-monthly-yoy'] })
      await queryClient.invalidateQueries({ queryKey: ['reports-portfolio-balance-series'] })
    },
  })
}

export function useCreateAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: AccountCreateRequest) =>
      postApiAccounts({ body: request, throwOnError: true }).then((result) => result.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts() })
      queryClient.invalidateQueries({ queryKey: ['reports-cashflow-series'] })
      queryClient.invalidateQueries({ queryKey: ['reports-portfolio-balance-series'] })
    },
  })
}

export function useUpdateAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: AccountUpdateRequest }) =>
      putApiAccountsById({ path: { id }, body: request, throwOnError: true }).then(
        (result) => result.data,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts() })
      queryClient.invalidateQueries({ queryKey: ['reports-cashflow-series'] })
      queryClient.invalidateQueries({ queryKey: ['reports-portfolio-balance-series'] })
    },
  })
}

export function useDeleteAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      deleteApiAccountsById({ path: { id }, throwOnError: true }).then(() => undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts() })
      queryClient.invalidateQueries({ queryKey: ['reports-cashflow-series'] })
      queryClient.invalidateQueries({ queryKey: ['reports-portfolio-balance-series'] })
    },
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

export function useCashflowSeriesReport(query?: GetApiReportsCashflowSeriesData['query']) {
  return useQuery(cashflowSeriesQueryOptions(query))
}

export function useCategorySeriesReport(query?: GetApiReportsCategorySeriesData['query']) {
  return useQuery(categorySeriesQueryOptions(query))
}

export function useMonthlyYoyReport(query?: GetApiReportsMonthlyYoyData['query']) {
  return useQuery(monthlyYoyQueryOptions(query))
}

export function usePortfolioBalanceSeriesReport(query?: GetApiReportsPortfolioBalanceSeriesData['query']) {
  return useQuery(portfolioBalanceSeriesQueryOptions(query))
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
      queryClient.invalidateQueries({ queryKey: ['reports-cashflow-series'] })
      queryClient.invalidateQueries({ queryKey: ['reports-category-series'] })
      queryClient.invalidateQueries({ queryKey: ['reports-monthly-yoy'] })
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
      queryClient.invalidateQueries({ queryKey: ['reports-cashflow-series'] })
      queryClient.invalidateQueries({ queryKey: ['reports-category-series'] })
      queryClient.invalidateQueries({ queryKey: ['reports-monthly-yoy'] })
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
      queryClient.invalidateQueries({ queryKey: queryKeys.trips() })
      queryClient.invalidateQueries({ queryKey: ['reports-cashflow-series'] })
      queryClient.invalidateQueries({ queryKey: ['reports-category-series'] })
      queryClient.invalidateQueries({ queryKey: ['reports-monthly-yoy'] })
      queryClient.invalidateQueries({ queryKey: ['reports-portfolio-balance-series'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
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
      queryClient.invalidateQueries({ queryKey: queryKeys.trips() })
      queryClient.invalidateQueries({ queryKey: ['reports-cashflow-series'] })
      queryClient.invalidateQueries({ queryKey: ['reports-category-series'] })
      queryClient.invalidateQueries({ queryKey: ['reports-monthly-yoy'] })
      queryClient.invalidateQueries({ queryKey: ['reports-portfolio-balance-series'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
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
      queryClient.invalidateQueries({ queryKey: queryKeys.trips() })
      queryClient.invalidateQueries({ queryKey: ['reports-cashflow-series'] })
      queryClient.invalidateQueries({ queryKey: ['reports-category-series'] })
      queryClient.invalidateQueries({ queryKey: ['reports-monthly-yoy'] })
      queryClient.invalidateQueries({ queryKey: ['reports-portfolio-balance-series'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
    },
  })
}

export function useScanReceipt() {
  return useMutation({
    mutationFn: ({ file, accountId }: { file: File; accountId: string }) =>
      postApiReceiptsScan({ body: { file, accountId }, throwOnError: true }).then(
        (result) => result.data,
      ),
  })
}

export function useSeedDemo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ years, seed }: { years: number; seed?: number }) =>
      postApiSeedDemo({ query: { Years: years, Seed: seed }, throwOnError: true }).then(
        (result) => result.data,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts() })
      queryClient.invalidateQueries({ queryKey: queryKeys.categories() })
      queryClient.invalidateQueries({ queryKey: queryKeys.trips() })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['transactions-search'] })
      queryClient.invalidateQueries({ queryKey: ['reports-cashflow-series'] })
      queryClient.invalidateQueries({ queryKey: ['reports-category-series'] })
      queryClient.invalidateQueries({ queryKey: ['reports-monthly-yoy'] })
      queryClient.invalidateQueries({ queryKey: ['reports-portfolio-balance-series'] })
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
      queryClient.invalidateQueries({ queryKey: queryKeys.settings() })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['transactions-search'] })
      queryClient.invalidateQueries({ queryKey: ['reports-cashflow-series'] })
      queryClient.invalidateQueries({ queryKey: ['reports-category-series'] })
      queryClient.invalidateQueries({ queryKey: ['reports-monthly-yoy'] })
      queryClient.invalidateQueries({ queryKey: ['reports-portfolio-balance-series'] })
      queryClient.invalidateQueries({ queryKey: queryKeys.trips() })
    },
  })
}

export function useResetData() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () =>
      postApiSettingsResetData({ throwOnError: true }).then((result) => result.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts() })
      queryClient.invalidateQueries({ queryKey: queryKeys.categories() })
      queryClient.invalidateQueries({ queryKey: queryKeys.trips() })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['transactions-search'] })
      queryClient.invalidateQueries({ queryKey: ['reports-cashflow-series'] })
      queryClient.invalidateQueries({ queryKey: ['reports-category-series'] })
      queryClient.invalidateQueries({ queryKey: ['reports-monthly-yoy'] })
      queryClient.invalidateQueries({ queryKey: ['reports-portfolio-balance-series'] })
    },
  })
}

export function useExportBackup() {
  return useMutation({
    mutationFn: async ({ type }: { type: BackupExportType }) => {
      const baseUrl = import.meta.env.VITE_API_BASE_URL ?? ''
      const requestUrl = `${baseUrl}/api/profile/export-backup?type=${encodeURIComponent(type)}`
      const response = await fetch(requestUrl, {
        method: 'GET',
        credentials: 'include',
      })

      if (!response.ok) {
        const message = await response.text()
        throw new Error(message || 'Unable to export backup.')
      }

      const blob = await response.blob()
      const disposition = response.headers.get('content-disposition') ?? ''
      const match = /filename="?([^";]+)"?/i.exec(disposition)
      const fileName = match?.[1] ?? `flamette-backup-${new Date().toISOString()}.xlsx`

      const downloadUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = downloadUrl
      anchor.download = fileName
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(downloadUrl)
    },
  })
}
