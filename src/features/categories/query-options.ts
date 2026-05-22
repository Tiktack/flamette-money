import { queryOptions } from "@tanstack/react-query"

import { getCategories } from "./server/functions"

import { queryKeys } from "@/features/shared/query-keys"

export const categoriesQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.categories(),
    queryFn: () => getCategories(),
    staleTime: 60_000,
  })
