import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { tripsQueryOptions } from "./query-options"
import { createTrip, updateTrip } from "./server/functions"

import {
  invalidateQueries,
  tripMutationInvalidations,
} from "@/features/shared/cache-invalidations"

import type { TripCreateRequest, TripUpdateRequest } from "./types"

export function useTrips() {
  return useQuery(tripsQueryOptions())
}

export function useCreateTrip() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: TripCreateRequest) => createTrip({ data: request }),
    onSuccess: async () =>
      invalidateQueries(queryClient, tripMutationInvalidations),
  })
}

export function useUpdateTrip() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: TripUpdateRequest }) =>
      updateTrip({ data: { id, request } }),
    onSuccess: async () =>
      invalidateQueries(queryClient, tripMutationInvalidations),
  })
}
