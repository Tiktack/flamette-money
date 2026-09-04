import { keepPreviousData, queryOptions } from "@tanstack/react-query"

import { queryKeys } from "@/features/shared/query-keys"

import { getEmailImportItem, listEmailConnections, listEmailImportItems, listEmailImportRules } from "./server/functions"
import type { EmailImportItemsQuery } from "./types"

// Background syncs create data without any client mutation, so the always-visible
// queries refetch on a timer to keep counts and statuses feeling live.
const BACKGROUND_REFRESH_INTERVAL_MS = 60_000

export const emailConnectionsQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.emailConnections(),
    queryFn: () => listEmailConnections(),
    refetchInterval: BACKGROUND_REFRESH_INTERVAL_MS,
  })

export const emailImportRulesQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.emailImportRules(),
    queryFn: () => listEmailImportRules(),
  })

export const emailImportItemsQueryOptions = (query?: EmailImportItemsQuery) =>
  queryOptions({
    queryKey: queryKeys.emailImportItems(query),
    queryFn: () => listEmailImportItems({ data: query }),
    placeholderData: keepPreviousData,
    refetchInterval: BACKGROUND_REFRESH_INTERVAL_MS,
  })

export const emailImportItemQueryOptions = (id: string) =>
  queryOptions({
    queryKey: [...queryKeys.emailImportItemsAll(), "detail", id] as const,
    queryFn: () => getEmailImportItem({ data: { id } }),
  })
