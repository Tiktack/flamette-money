import { createServerFn } from "@tanstack/react-start"

import { getAppInfoData, getCurrentUserData } from "./service.server"

export const getCurrentUser = createServerFn({ method: "GET" }).handler(
  async () => getCurrentUserData()
)

export const getAppInfo = createServerFn({ method: "GET" }).handler(async () =>
  getAppInfoData()
)
