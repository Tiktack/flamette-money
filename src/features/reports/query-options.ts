import { keepPreviousData, queryOptions } from "@tanstack/react-query"

import { getCashflowSeriesReport, getCategorySeriesReport, getComparisonReport, getPortfolioBalanceSeriesReport } from "./server/functions"

import { queryKeys } from "@/features/shared/query-keys"

import type {
  GetApiReportsCashflowSeriesData,
  GetApiReportsCategorySeriesData,
  GetApiReportsComparisonData,
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

export const portfolioBalanceSeriesQueryOptions = (query?: GetApiReportsPortfolioBalanceSeriesData["query"]) =>
  queryOptions({
    queryKey: queryKeys.reportsPortfolioBalanceSeries(query),
    queryFn: () => getPortfolioBalanceSeriesReport({ data: query }),
    placeholderData: keepPreviousData,
  })

export const comparisonQueryOptions = (query?: GetApiReportsComparisonData["query"]) =>
  queryOptions({
    queryKey: queryKeys.reportsComparison(query),
    queryFn: () => getComparisonReport({ data: query }),
    placeholderData: keepPreviousData,
  })
