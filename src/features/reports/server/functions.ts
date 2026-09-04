import { createServerFn } from "@tanstack/react-start"

import { cashflowReportSchema, categoryReportSchema, comparisonReportSchema, portfolioReportSchema } from "@/features/shared/server/validators"

import { getCashflowSeriesReportData, getCategorySeriesReportData, getComparisonReportData, getPortfolioBalanceSeriesReportData } from "./service.server"

export const getCashflowSeriesReport = createServerFn({ method: "GET" })
  .validator((data: unknown) => cashflowReportSchema.parse(data))
  .handler(({ data }) => getCashflowSeriesReportData(data))

export const getCategorySeriesReport = createServerFn({ method: "GET" })
  .validator((data: unknown) => categoryReportSchema.parse(data))
  .handler(({ data }) => getCategorySeriesReportData(data))

export const getPortfolioBalanceSeriesReport = createServerFn({
  method: "GET",
})
  .validator((data: unknown) => portfolioReportSchema.parse(data))
  .handler(({ data }) => getPortfolioBalanceSeriesReportData(data))

export const getComparisonReport = createServerFn({ method: "GET" })
  .validator((data: unknown) => comparisonReportSchema.parse(data))
  .handler(({ data }) => getComparisonReportData(data))
