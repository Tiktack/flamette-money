import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"

import {
  emailConnectionRequestSchema,
  emailConnectionTestSchema,
  emailConnectionUpdateSchema,
  emailImportItemLinkSchema,
  emailImportItemsQuerySchema,
  emailImportReparseSchema,
  emailImportRuleRequestSchema,
  emailImportRulesReorderSchema,
  emailImportRuleUpdateSchema,
  emailRulePreviewSchema,
} from "@/features/shared/server/validators"

import {
  createEmailConnectionData,
  createEmailImportRuleData,
  deleteEmailConnectionData,
  deleteEmailImportRuleData,
  dismissEmailImportItemData,
  getEmailImportItemData,
  getEmailImportStatusData,
  linkEmailImportItemData,
  listEmailConnectionsData,
  listEmailImportItemsData,
  listEmailImportRulesData,
  previewEmailImportRuleData,
  reorderEmailImportRulesData,
  reparseEmailImportItemsData,
  restoreEmailImportItemData,
  syncEmailConnectionNowData,
  testEmailConnectionData,
  updateEmailConnectionData,
  updateEmailImportRuleData,
} from "./service.server"

const idSchema = z.object({ id: z.string() })

export const listEmailConnections = createServerFn({ method: "GET" }).handler(async () => listEmailConnectionsData())

export const createEmailConnection = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => emailConnectionRequestSchema.parse(data))
  .handler(async ({ data }) => createEmailConnectionData(data))

export const updateEmailConnection = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => emailConnectionUpdateSchema.parse(data))
  .handler(async ({ data }) => updateEmailConnectionData(data.id, data.request))

export const deleteEmailConnection = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => idSchema.parse(data))
  .handler(async ({ data }) => {
    await deleteEmailConnectionData(data.id)
  })

export const testEmailConnection = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => emailConnectionTestSchema.parse(data))
  .handler(async ({ data }) => testEmailConnectionData(data))

export const syncEmailConnectionNow = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => idSchema.parse(data))
  .handler(async ({ data }) => syncEmailConnectionNowData(data.id))

export const listEmailImportRules = createServerFn({ method: "GET" }).handler(async () => listEmailImportRulesData())

export const createEmailImportRule = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => emailImportRuleRequestSchema.parse(data))
  .handler(async ({ data }) => createEmailImportRuleData(data))

export const updateEmailImportRule = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => emailImportRuleUpdateSchema.parse(data))
  .handler(async ({ data }) => updateEmailImportRuleData(data.id, data.request))

export const deleteEmailImportRule = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => idSchema.parse(data))
  .handler(async ({ data }) => {
    await deleteEmailImportRuleData(data.id)
  })

export const reorderEmailImportRules = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => emailImportRulesReorderSchema.parse(data))
  .handler(async ({ data }) => {
    await reorderEmailImportRulesData(data.orderedIds)
  })

export const previewEmailImportRule = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => emailRulePreviewSchema.parse(data))
  .handler(async ({ data }) => previewEmailImportRuleData(data))

export const listEmailImportItems = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => emailImportItemsQuerySchema.parse(data))
  .handler(async ({ data }) => listEmailImportItemsData(data))

export const getEmailImportItem = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => idSchema.parse(data))
  .handler(async ({ data }) => getEmailImportItemData(data.id))

export const linkEmailImportItem = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => emailImportItemLinkSchema.parse(data))
  .handler(async ({ data }) => {
    await linkEmailImportItemData(data.id, data.transactionId)
  })

export const dismissEmailImportItem = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => idSchema.parse(data))
  .handler(async ({ data }) => {
    await dismissEmailImportItemData(data.id)
  })

export const restoreEmailImportItem = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => idSchema.parse(data))
  .handler(async ({ data }) => {
    await restoreEmailImportItemData(data.id)
  })

export const reparseEmailImportItems = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => emailImportReparseSchema.parse(data))
  .handler(async ({ data }) => reparseEmailImportItemsData(data))

export const getEmailImportStatus = createServerFn({ method: "GET" }).handler(async () => getEmailImportStatusData())
