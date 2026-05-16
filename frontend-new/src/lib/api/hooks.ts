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
  createAccount,
  createCategory,
  createTransaction,
  createTrip,
  deleteAccount,
  deleteCategory,
  deleteTransaction,
  postResetUserData,
  updateAccount,
  updateCategory,
  updateSettings,
  updateTransaction,
  updateTrip,
} from './finance.functions'
import type {
  GetApiReportsCashflowSeriesData,
  GetApiReportsCategorySeriesData,
  GetApiReportsMonthlyYoyData,
  GetApiReportsPortfolioBalanceSeriesData,
  ImportBackupResponse,
  ScanReceiptResponse,
  SeedDemoResponse,
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
import { authClient } from '@/lib/auth-client'

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
    mutationFn: async () => {
      const { error } = await authClient.signOut()

      if (error) {
        throw new Error(error.message || 'Unable to sign out.')
      }
    },
    onSuccess: async () => {
      queryClient.clear()
    },
  })
}

export function useUpdateSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: UpdateUserSettingsRequest) => updateSettings({ data: request }),
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
    mutationFn: (request: AccountCreateRequest) => createAccount({ data: request }),
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
      updateAccount({ data: { id, request } }),
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
    mutationFn: (id: string) => deleteAccount({ data: { id } }).then(() => undefined),
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
    mutationFn: (request: CategoryCreateRequest) => createCategory({ data: request }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.categories() }),
  })
}

export function useUpdateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: CategoryUpdateRequest }) =>
      updateCategory({ data: { id, request } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.categories() }),
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteCategory({ data: { id } }).then(() => undefined),
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
    mutationFn: (request: TripCreateRequest) => createTrip({ data: request }),
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
      updateTrip({ data: { id, request } }),
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
    mutationFn: (request: TransactionCreateRequest) => createTransaction({ data: request }),
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
      updateTransaction({ data: { id, request } }),
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
    mutationFn: (id: string) => deleteTransaction({ data: { id } }).then(() => undefined),
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
    mutationFn: async ({ file, accountId }: { file: File; accountId: string }) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('accountId', accountId)

      const response = await fetch('/api/receipts/scan', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })

      if (!response.ok) {
        const message = await response.text()
        throw new Error(message || 'Failed to scan receipt.')
      }

      return (await response.json()) as ScanReceiptResponse
    },
  })
}

export function useSeedDemo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ years, seed }: { years: number; seed?: number }) => {
      const searchParams = new URLSearchParams()
      searchParams.set('Years', String(years))
      if (typeof seed === 'number' && Number.isFinite(seed)) {
        searchParams.set('Seed', String(seed))
      }

      const response = await fetch(`/api/seed/demo?${searchParams.toString()}`, {
        method: 'POST',
        credentials: 'include',
      })

      if (!response.ok) {
        const message = await response.text()
        throw new Error(message || 'Unable to seed demo data.')
      }

      return (await response.json()) as SeedDemoResponse
    },
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
    mutationFn: async ({ file, type }: { file: File; type: BackupImportType }) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', type)

      const response = await fetch('/api/profile/import-backup', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })

      if (!response.ok) {
        const message = await response.text()
        throw new Error(message || 'Unable to import backup.')
      }

      return (await response.json()) as ImportBackupResponse
    },
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
    mutationFn: () => postResetUserData(),
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
      const requestUrl = `/api/profile/export-backup?type=${encodeURIComponent(type)}`
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
