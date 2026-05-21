import { createServerFn } from "@tanstack/react-start"

import { cashflowReportSchema, categoryReportSchema, monthlyYoySchema, portfolioReportSchema } from "@/features/shared/server/validators"

import { getCashflowSeriesReportData, getCategorySeriesReportData, getMonthlyYoyReportData, getPortfolioBalanceSeriesReportData } from "./service.server"

export const getCashflowSeriesReport = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => cashflowReportSchema.parse(data))
  .handler(async ({ data }) => getCashflowSeriesReportData(data))

export const getCategorySeriesReport = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => categoryReportSchema.parse(data))
  .handler(async ({ data }) => getCategorySeriesReportData(data))

export const getMonthlyYoyReport = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => monthlyYoySchema.parse(data))
  .handler(async ({ data }) => getMonthlyYoyReportData(data))

export const getPortfolioBalanceSeriesReport = createServerFn({
  method: "GET",
})
  .inputValidator((data: unknown) => portfolioReportSchema.parse(data))
  .handler(async ({ data }) => getPortfolioBalanceSeriesReportData(data))
