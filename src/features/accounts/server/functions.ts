import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"

import { accountRequestSchema, accountUpdateSchema } from "@/features/shared/server/validators"

import { createAccountData, deleteAccountData, listAccountsData, updateAccountData } from "./service.server"

export const getAccounts = createServerFn({ method: "GET" }).handler(() => listAccountsData())

export const createAccount = createServerFn({ method: "POST" })
  .validator((data: unknown) => accountRequestSchema.parse(data))
  .handler(({ data }) => createAccountData(data))

export const updateAccount = createServerFn({ method: "POST" })
  .validator((data: unknown) => accountUpdateSchema.parse(data))
  .handler(({ data }) => updateAccountData(data.id, data.request))

export const deleteAccount = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({ id: z.string() }).parse(data))
  .handler(({ data }) => deleteAccountData(data.id))
