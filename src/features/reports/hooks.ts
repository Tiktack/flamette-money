import { useQuery } from "@tanstack/react-query"

import { cashflowSeriesQueryOptions, categorySeriesQueryOptions, portfolioBalanceSeriesQueryOptions } from "./query-options"

import type { GetApiReportsCashflowSeriesData, GetApiReportsCategorySeriesData, GetApiReportsPortfolioBalanceSeriesData } from "./types"

export function useCashflowSeriesReport(query?: GetApiReportsCashflowSeriesData["query"]) {
  return useQuery(cashflowSeriesQueryOptions(query))
}

export function useCategorySeriesReport(query?: GetApiReportsCategorySeriesData["query"]) {
  return useQuery(categorySeriesQueryOptions(query))
}

export function usePortfolioBalanceSeriesReport(query?: GetApiReportsPortfolioBalanceSeriesData["query"]) {
  return useQuery(portfolioBalanceSeriesQueryOptions(query))
}
