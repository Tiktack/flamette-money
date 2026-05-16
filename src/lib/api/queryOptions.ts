import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import {
  getAccounts,
  getAppInfo,
  getCashflowSeriesReport,
  getCategorySeriesReport,
  getMonthlyYoyReport,
  getCurrentUser,
  getSettings,
  getTransaction,
  getTransactions,
  getTrips,
  getPortfolioBalanceSeriesReport,
  searchTransactions,
  getCategories,
} from './finance.functions'
import type {
  AppInfoResponse,
  CurrentUserResponse,
  GetApiReportsCashflowSeriesData,
  GetApiReportsCategorySeriesData,
  GetApiReportsMonthlyYoyData,
  GetApiReportsPortfolioBalanceSeriesData,
  UserSettingsResponse,
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
  reportsCashflowSeries: (query?: GetApiReportsCashflowSeriesData['query']) =>
    ['reports-cashflow-series', query ?? {}] as const,
  reportsCategorySeries: (query?: GetApiReportsCategorySeriesData['query']) =>
    ['reports-category-series', query ?? {}] as const,
  reportsMonthlyYoy: (query?: GetApiReportsMonthlyYoyData['query']) =>
    ['reports-monthly-yoy', query ?? {}] as const,
  reportsPortfolioBalanceSeries: (query?: GetApiReportsPortfolioBalanceSeriesData['query']) =>
    ['reports-portfolio-balance-series', query ?? {}] as const,
  appInfo: () => ['app-info'] as const,
  settings: () => ['settings'] as const,
}

export const accountsQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.accounts(),
    queryFn: () => getAccounts(),
  })

export const currentUserQueryOptions = () =>
  queryOptions<CurrentUserResponse | null>({
    queryKey: queryKeys.authMe(),
    queryFn: () => getCurrentUser(),
    staleTime: 60_000,
  })

export const categoriesQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.categories(),
    queryFn: () => getCategories(),
  })

export const tripsQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.trips(),
    queryFn: () => getTrips(),
  })

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

export const transactionsSearchQueryOptions = (query?: GetApiTransactionsSearchData['query']) =>
  queryOptions({
    queryKey: queryKeys.transactionsSearch(query),
    queryFn: () => searchTransactions({ data: query }),
    placeholderData: keepPreviousData,
  })

export const cashflowSeriesQueryOptions = (query?: GetApiReportsCashflowSeriesData['query']) =>
  queryOptions({
    queryKey: queryKeys.reportsCashflowSeries(query),
    queryFn: () => getCashflowSeriesReport({ data: query }),
    placeholderData: keepPreviousData,
  })

export const categorySeriesQueryOptions = (query?: GetApiReportsCategorySeriesData['query']) =>
  queryOptions({
    queryKey: queryKeys.reportsCategorySeries(query),
    queryFn: () => getCategorySeriesReport({ data: query }),
    placeholderData: keepPreviousData,
  })

export const monthlyYoyQueryOptions = (query?: GetApiReportsMonthlyYoyData['query']) =>
  queryOptions({
    queryKey: queryKeys.reportsMonthlyYoy(query),
    queryFn: () => getMonthlyYoyReport({ data: query }),
    placeholderData: keepPreviousData,
  })

export const portfolioBalanceSeriesQueryOptions = (query?: GetApiReportsPortfolioBalanceSeriesData['query']) =>
  queryOptions({
    queryKey: queryKeys.reportsPortfolioBalanceSeries(query),
    queryFn: () => getPortfolioBalanceSeriesReport({ data: query }),
    placeholderData: keepPreviousData,
  })

export const appInfoQueryOptions = () =>
  queryOptions<AppInfoResponse | null>({
    queryKey: queryKeys.appInfo(),
    queryFn: () => getAppInfo(),
    staleTime: 60_000,
  })

export const settingsQueryOptions = () =>
  queryOptions<UserSettingsResponse | null>({
    queryKey: queryKeys.settings(),
    queryFn: () => getSettings(),
    staleTime: 60_000,
  })
