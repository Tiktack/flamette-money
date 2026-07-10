import { queryOptions } from "@tanstack/react-query"

import { getAccounts } from "./server/functions"

import { queryKeys } from "@/features/shared/query-keys"

export const accountsQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.accounts(),
    queryFn: () => getAccounts(),
    staleTime: 60_000,
  })
