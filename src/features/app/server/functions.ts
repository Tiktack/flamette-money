import { createServerFn } from "@tanstack/react-start"

import { getAppInfoData, getCurrentUserData } from "./service.server"

export const getCurrentUser = createServerFn({ method: "GET" }).handler(() => getCurrentUserData())

export const getAppInfo = createServerFn({ method: "GET" }).handler(() => getAppInfoData())
