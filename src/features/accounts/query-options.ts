import { queryOptions } from "@tanstack/react-query"

import { getAccount, getAccounts } from "./server/functions"

import { queryKeys } from "@/features/shared/query-keys"

export const accountsQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.accounts(),
    queryFn: () => getAccounts(),
    staleTime: 60_000,
  })

export const accountQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["accounts", id] as const,
    queryFn: () => getAccount({ data: { id } }),
    staleTime: 60_000,
  })
