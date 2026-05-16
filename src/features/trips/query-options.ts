import { queryOptions } from "@tanstack/react-query"

import { getTrips } from "./server/functions"

import { queryKeys } from "@/features/shared/query-keys"

export const tripsQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.trips(),
    queryFn: () => getTrips(),
  })
