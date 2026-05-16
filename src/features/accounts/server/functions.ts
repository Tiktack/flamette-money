import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"

import {
  accountRequestSchema,
  accountUpdateSchema,
} from "@/features/shared/server/validators"

import {
  createAccountData,
  deleteAccountData,
  getAccountData,
  listAccountsData,
  updateAccountData,
} from "./service.server"

export const getAccounts = createServerFn({ method: "GET" }).handler(async () =>
  listAccountsData()
)

export const getAccount = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ data }) => getAccountData(data.id))

export const createAccount = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => accountRequestSchema.parse(data))
  .handler(async ({ data }) => createAccountData(data))

export const updateAccount = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => accountUpdateSchema.parse(data))
  .handler(async ({ data }) => updateAccountData(data.id, data.request))

export const deleteAccount = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ data }) => {
    await deleteAccountData(data.id)
  })
