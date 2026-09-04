import type { QueryClient } from "@tanstack/react-query"

import { queryKeys } from "./query-keys"

type QueryInvalidation = NonNullable<Parameters<QueryClient["invalidateQueries"]>[0]>

const reportInvalidations = [
  { queryKey: queryKeys.reportsCashflowSeriesAll() },
  { queryKey: queryKeys.reportsCategorySeriesAll() },
  { queryKey: queryKeys.reportsPortfolioBalanceSeriesAll() },
  { queryKey: queryKeys.reportsComparisonAll() },
] as const satisfies readonly QueryInvalidation[]

const transactionDerivedInvalidations = [
  { queryKey: queryKeys.transactionsAll() },
  { queryKey: queryKeys.transactionsSearchAll() },
  { queryKey: queryKeys.transactionsSummaryAll() },
  { queryKey: queryKeys.transactionsFacetsAll() },
  ...reportInvalidations,
] as const satisfies readonly QueryInvalidation[]

export const settingsMutationInvalidations = [
  { queryKey: queryKeys.settings() },
  { queryKey: queryKeys.authMe() },
  { queryKey: queryKeys.trips() },
  { queryKey: queryKeys.transactionsSummaryAll() },
  ...reportInvalidations,
] as const satisfies readonly QueryInvalidation[]

export const accountMutationInvalidations = [
  { queryKey: queryKeys.accounts() },
  { queryKey: queryKeys.transactionsSummaryAll() },
  ...reportInvalidations,
] as const satisfies readonly QueryInvalidation[]

export const categoryMutationInvalidations = [{ queryKey: queryKeys.categories() }, ...reportInvalidations] as const satisfies readonly QueryInvalidation[]

export const tripMutationInvalidations = [{ queryKey: queryKeys.trips() }, ...transactionDerivedInvalidations] as const satisfies readonly QueryInvalidation[]

export const transactionMutationInvalidations = [
  { queryKey: queryKeys.accounts() },
  { queryKey: queryKeys.trips() },
  ...transactionDerivedInvalidations,
] as const satisfies readonly QueryInvalidation[]

export const emailImportInvalidations = [
  { queryKey: queryKeys.emailConnections() },
  { queryKey: queryKeys.emailImportRules() },
  { queryKey: queryKeys.emailImportItemsAll() },
] as const satisfies readonly QueryInvalidation[]

export const fullDataRefreshInvalidations = [
  { queryKey: queryKeys.authMe() },
  { queryKey: queryKeys.accounts() },
  { queryKey: queryKeys.categories() },
  { queryKey: queryKeys.settings() },
  { queryKey: queryKeys.trips() },
  ...transactionDerivedInvalidations,
] as const satisfies readonly QueryInvalidation[]

export async function invalidateQueries(queryClient: QueryClient, invalidations: readonly QueryInvalidation[]) {
  await Promise.all(invalidations.map((invalidation) => queryClient.invalidateQueries(invalidation)))
}
