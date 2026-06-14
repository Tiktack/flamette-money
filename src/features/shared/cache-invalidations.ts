import type { QueryClient } from "@tanstack/react-query"

import { queryKeys } from "./query-keys"

type QueryInvalidation = NonNullable<Parameters<QueryClient["invalidateQueries"]>[0]>

const reportInvalidations = [
  { queryKey: ["reports-cashflow-series"] },
  { queryKey: ["reports-category-series"] },
  { queryKey: ["reports-portfolio-balance-series"] },
] as const satisfies readonly QueryInvalidation[]

export const settingsMutationInvalidations = [
  { queryKey: queryKeys.settings() },
  { queryKey: queryKeys.authMe() },
  { queryKey: queryKeys.trips() },
  { queryKey: ["transactions-summary"] },
  ...reportInvalidations,
] as const satisfies readonly QueryInvalidation[]

export const accountMutationInvalidations = [
  { queryKey: queryKeys.accounts() },
  { queryKey: ["transactions-summary"] },
  { queryKey: ["reports-cashflow-series"] },
  { queryKey: ["reports-portfolio-balance-series"] },
] as const satisfies readonly QueryInvalidation[]

export const tripMutationInvalidations = [
  { queryKey: queryKeys.trips() },
  { queryKey: ["transactions"] },
  { queryKey: ["transactions-search"] },
  { queryKey: ["transactions-facets"] },
  { queryKey: ["reports-cashflow-series"] },
  { queryKey: ["reports-category-series"] },
] as const satisfies readonly QueryInvalidation[]

export const transactionMutationInvalidations = [
  { queryKey: ["transactions-search"] },
  { queryKey: ["transactions-summary"] },
  { queryKey: ["transactions-facets"] },
  { queryKey: ["transactions"] },
  { queryKey: queryKeys.trips() },
  ...reportInvalidations,
  { queryKey: ["accounts"] },
] as const satisfies readonly QueryInvalidation[]

export const fullDataRefreshInvalidations = [
  { queryKey: queryKeys.accounts() },
  { queryKey: queryKeys.categories() },
  { queryKey: queryKeys.settings() },
  { queryKey: queryKeys.trips() },
  { queryKey: ["transactions"] },
  { queryKey: ["transactions-search"] },
  { queryKey: ["transactions-summary"] },
  { queryKey: ["transactions-facets"] },
  ...reportInvalidations,
] as const satisfies readonly QueryInvalidation[]

export async function invalidateQueries(queryClient: QueryClient, invalidations: readonly QueryInvalidation[]) {
  await Promise.all(invalidations.map((invalidation) => queryClient.invalidateQueries(invalidation)))
}
