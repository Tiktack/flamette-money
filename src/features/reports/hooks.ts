import { useQuery } from "@tanstack/react-query"

import {
  cashflowSeriesQueryOptions,
  categorySeriesQueryOptions,
  monthlyYoyQueryOptions,
  portfolioBalanceSeriesQueryOptions,
} from "./query-options"

import type {
  GetApiReportsCashflowSeriesData,
  GetApiReportsCategorySeriesData,
  GetApiReportsMonthlyYoyData,
  GetApiReportsPortfolioBalanceSeriesData,
} from "./types"

export function useCashflowSeriesReport(
  query?: GetApiReportsCashflowSeriesData["query"]
) {
  return useQuery(cashflowSeriesQueryOptions(query))
}

export function useCategorySeriesReport(
  query?: GetApiReportsCategorySeriesData["query"]
) {
  return useQuery(categorySeriesQueryOptions(query))
}

export function useMonthlyYoyReport(
  query?: GetApiReportsMonthlyYoyData["query"]
) {
  return useQuery(monthlyYoyQueryOptions(query))
}

export function usePortfolioBalanceSeriesReport(
  query?: GetApiReportsPortfolioBalanceSeriesData["query"]
) {
  return useQuery(portfolioBalanceSeriesQueryOptions(query))
}
