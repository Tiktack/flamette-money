import { keepPreviousData, queryOptions } from "@tanstack/react-query"

import { getCashflowSeriesReport, getCategorySeriesReport, getMonthlyYoyReport, getPortfolioBalanceSeriesReport } from "./server/functions"

import { queryKeys } from "@/features/shared/query-keys"

import type {
  GetApiReportsCashflowSeriesData,
  GetApiReportsCategorySeriesData,
  GetApiReportsMonthlyYoyData,
  GetApiReportsPortfolioBalanceSeriesData,
} from "./types"

export const cashflowSeriesQueryOptions = (query?: GetApiReportsCashflowSeriesData["query"]) =>
  queryOptions({
    queryKey: queryKeys.reportsCashflowSeries(query),
    queryFn: () => getCashflowSeriesReport({ data: query }),
    placeholderData: keepPreviousData,
  })

export const categorySeriesQueryOptions = (query?: GetApiReportsCategorySeriesData["query"]) =>
  queryOptions({
    queryKey: queryKeys.reportsCategorySeries(query),
    queryFn: () => getCategorySeriesReport({ data: query }),
    placeholderData: keepPreviousData,
  })

export const monthlyYoyQueryOptions = (query?: GetApiReportsMonthlyYoyData["query"]) =>
  queryOptions({
    queryKey: queryKeys.reportsMonthlyYoy(query),
    queryFn: () => getMonthlyYoyReport({ data: query }),
    placeholderData: keepPreviousData,
  })

export const portfolioBalanceSeriesQueryOptions = (query?: GetApiReportsPortfolioBalanceSeriesData["query"]) =>
  queryOptions({
    queryKey: queryKeys.reportsPortfolioBalanceSeries(query),
    queryFn: () => getPortfolioBalanceSeriesReport({ data: query }),
    placeholderData: keepPreviousData,
  })
