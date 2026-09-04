import { createServerFn } from "@tanstack/react-start"

import { tripRequestSchema, tripUpdateSchema } from "@/features/shared/server/validators"

import { createTripData, listTripsData, updateTripData } from "./service.server"

export const getTrips = createServerFn({ method: "GET" }).handler(() => listTripsData())

export const createTrip = createServerFn({ method: "POST" })
  .validator((data: unknown) => tripRequestSchema.parse(data))
  .handler(({ data }) => createTripData(data))

export const updateTrip = createServerFn({ method: "POST" })
  .validator((data: unknown) => tripUpdateSchema.parse(data))
  .handler(({ data }) => updateTripData(data.id, data.request))
