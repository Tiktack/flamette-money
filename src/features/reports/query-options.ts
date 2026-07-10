import { keepPreviousData, queryOptions } from "@tanstack/react-query"

import { getCashflowSeriesReport, getCategorySeriesReport, getComparisonReport, getPortfolioBalanceSeriesReport } from "./server/functions"

import { queryKeys } from "@/features/shared/query-keys"

import type { CashflowSeriesReportQuery, CategorySeriesReportQuery, ComparisonReportQuery, PortfolioBalanceSeriesQuery } from "./types"

export const cashflowSeriesQueryOptions = (query?: CashflowSeriesReportQuery) =>
  queryOptions({
    queryKey: queryKeys.reportsCashflowSeries(query),
    queryFn: () => getCashflowSeriesReport({ data: query }),
    placeholderData: keepPreviousData,
  })

export const categorySeriesQueryOptions = (query?: CategorySeriesReportQuery) =>
  queryOptions({
    queryKey: queryKeys.reportsCategorySeries(query),
    queryFn: () => getCategorySeriesReport({ data: query }),
    placeholderData: keepPreviousData,
  })

export const portfolioBalanceSeriesQueryOptions = (query?: PortfolioBalanceSeriesQuery) =>
  queryOptions({
    queryKey: queryKeys.reportsPortfolioBalanceSeries(query),
    queryFn: () => getPortfolioBalanceSeriesReport({ data: query }),
    placeholderData: keepPreviousData,
  })

export const comparisonQueryOptions = (query?: ComparisonReportQuery) =>
  queryOptions({
    queryKey: queryKeys.reportsComparison(query),
    queryFn: () => getComparisonReport({ data: query }),
    placeholderData: keepPreviousData,
  })
