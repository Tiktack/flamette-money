import { queryOptions } from "@tanstack/react-query"

import { getSettings } from "./server/functions"

import { queryKeys } from "@/features/shared/query-keys"

import type { UserSettings } from "./types"

export const settingsQueryOptions = () =>
  queryOptions<UserSettings>({
    queryKey: queryKeys.settings(),
    queryFn: () => getSettings(),
    staleTime: 60_000,
  })
