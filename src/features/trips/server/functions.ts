import { createServerFn } from "@tanstack/react-start"

import {
  tripRequestSchema,
  tripUpdateSchema,
} from "@/features/shared/server/validators"

import { createTripData, listTripsData, updateTripData } from "./service.server"

export const getTrips = createServerFn({ method: "GET" }).handler(async () =>
  listTripsData()
)

export const createTrip = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => tripRequestSchema.parse(data))
  .handler(async ({ data }) => createTripData(data))

export const updateTrip = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => tripUpdateSchema.parse(data))
  .handler(async ({ data }) => updateTripData(data.id, data.request))
