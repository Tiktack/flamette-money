import { useQuery } from "@tanstack/react-query"

import { cashflowSeriesQueryOptions, categorySeriesQueryOptions, comparisonQueryOptions, portfolioBalanceSeriesQueryOptions } from "./query-options"

import type { CashflowSeriesReportQuery, CategorySeriesReportQuery, ComparisonReportQuery, PortfolioBalanceSeriesQuery } from "./types"

export function useCashflowSeriesReport(query?: CashflowSeriesReportQuery) {
  return useQuery(cashflowSeriesQueryOptions(query))
}

export function useCategorySeriesReport(query?: CategorySeriesReportQuery) {
  return useQuery(categorySeriesQueryOptions(query))
}

export function usePortfolioBalanceSeriesReport(query?: PortfolioBalanceSeriesQuery, options?: { enabled?: boolean }) {
  return useQuery({
    ...portfolioBalanceSeriesQueryOptions(query),
    enabled: options?.enabled,
  })
}

export function useComparisonReport(query?: ComparisonReportQuery) {
  return useQuery(comparisonQueryOptions(query))
}
