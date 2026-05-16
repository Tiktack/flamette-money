import { queryOptions } from "@tanstack/react-query"

import { getAppInfo, getCurrentUser } from "./server/functions"

import { queryKeys } from "@/features/shared/query-keys"

import type { AppInfo, CurrentUser } from "./types"

export const currentUserQueryOptions = () =>
  queryOptions<CurrentUser | null>({
    queryKey: queryKeys.authMe(),
    queryFn: () => getCurrentUser(),
    staleTime: 60_000,
  })

export const appInfoQueryOptions = () =>
  queryOptions<AppInfo | null>({
    queryKey: queryKeys.appInfo(),
    queryFn: () => getAppInfo(),
    staleTime: 60_000,
  })
