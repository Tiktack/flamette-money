import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"

import {
  getSettingsData,
  resetUserData,
  updateSettingsData,
} from "./service.server"

export const getSettings = createServerFn({ method: "GET" }).handler(async () =>
  getSettingsData()
)

export const updateSettings = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ baseCurrency: z.string() }).parse(data)
  )
  .handler(async ({ data }) => updateSettingsData(data))

export const postResetUserData = createServerFn({ method: "POST" }).handler(
  async () => resetUserData()
)
