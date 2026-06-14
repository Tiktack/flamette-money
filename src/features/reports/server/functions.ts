import { createServerFn } from "@tanstack/react-start"

import { cashflowReportSchema, categoryReportSchema, portfolioReportSchema } from "@/features/shared/server/validators"

import { getCashflowSeriesReportData, getCategorySeriesReportData, getPortfolioBalanceSeriesReportData } from "./service.server"

export const getCashflowSeriesReport = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => cashflowReportSchema.parse(data))
  .handler(async ({ data }) => getCashflowSeriesReportData(data))

export const getCategorySeriesReport = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => categoryReportSchema.parse(data))
  .handler(async ({ data }) => getCategorySeriesReportData(data))

export const getPortfolioBalanceSeriesReport = createServerFn({
  method: "GET",
})
  .inputValidator((data: unknown) => portfolioReportSchema.parse(data))
  .handler(async ({ data }) => getPortfolioBalanceSeriesReportData(data))
