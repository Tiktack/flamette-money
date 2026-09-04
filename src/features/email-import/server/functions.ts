import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"

import {
  emailConnectionRequestSchema,
  emailConnectionTestSchema,
  emailConnectionUpdateSchema,
  emailImportItemApproveSchema,
  emailImportItemsQuerySchema,
  emailImportReparseSchema,
  emailImportRuleRequestSchema,
  emailImportRulesReorderSchema,
  emailImportRuleUpdateSchema,
  emailRulePreviewSchema,
} from "@/features/shared/server/validators"

import {
  approveEmailImportItemData,
  createEmailConnectionData,
  createEmailImportRuleData,
  deleteEmailConnectionData,
  deleteEmailImportRuleData,
  dismissEmailImportItemData,
  getEmailImportItemData,
  listEmailConnectionsData,
  listEmailImportItemsData,
  listEmailImportRulesData,
  previewEmailImportRuleData,
  reorderEmailImportRulesData,
  reparseEmailImportItemsData,
  resetEmailConnectionData,
  restoreEmailImportItemData,
  syncEmailConnectionNowData,
  testEmailConnectionData,
  updateEmailConnectionData,
  updateEmailImportRuleData,
} from "./service.server"

const idSchema = z.object({ id: z.string() })

export const listEmailConnections = createServerFn({ method: "GET" }).handler(() => listEmailConnectionsData())

export const createEmailConnection = createServerFn({ method: "POST" })
  .validator((data: unknown) => emailConnectionRequestSchema.parse(data))
  .handler(({ data }) => createEmailConnectionData(data))

export const updateEmailConnection = createServerFn({ method: "POST" })
  .validator((data: unknown) => emailConnectionUpdateSchema.parse(data))
  .handler(({ data }) => updateEmailConnectionData(data.id, data.request))

export const deleteEmailConnection = createServerFn({ method: "POST" })
  .validator((data: unknown) => idSchema.parse(data))
  .handler(({ data }) => deleteEmailConnectionData(data.id))

export const testEmailConnection = createServerFn({ method: "POST" })
  .validator((data: unknown) => emailConnectionTestSchema.parse(data))
  .handler(({ data }) => testEmailConnectionData(data))

export const syncEmailConnectionNow = createServerFn({ method: "POST" })
  .validator((data: unknown) => idSchema.parse(data))
  .handler(({ data }) => syncEmailConnectionNowData(data.id))

export const resetEmailConnection = createServerFn({ method: "POST" })
  .validator((data: unknown) => idSchema.parse(data))
  .handler(({ data }) => resetEmailConnectionData(data.id))

export const listEmailImportRules = createServerFn({ method: "GET" }).handler(() => listEmailImportRulesData())

export const createEmailImportRule = createServerFn({ method: "POST" })
  .validator((data: unknown) => emailImportRuleRequestSchema.parse(data))
  .handler(({ data }) => createEmailImportRuleData(data))

export const updateEmailImportRule = createServerFn({ method: "POST" })
  .validator((data: unknown) => emailImportRuleUpdateSchema.parse(data))
  .handler(({ data }) => updateEmailImportRuleData(data.id, data.request))

export const deleteEmailImportRule = createServerFn({ method: "POST" })
  .validator((data: unknown) => idSchema.parse(data))
  .handler(({ data }) => deleteEmailImportRuleData(data.id))

export const reorderEmailImportRules = createServerFn({ method: "POST" })
  .validator((data: unknown) => emailImportRulesReorderSchema.parse(data))
  .handler(({ data }) => reorderEmailImportRulesData(data.orderedIds))

export const previewEmailImportRule = createServerFn({ method: "POST" })
  .validator((data: unknown) => emailRulePreviewSchema.parse(data))
  .handler(({ data }) => previewEmailImportRuleData(data))

export const listEmailImportItems = createServerFn({ method: "GET" })
  .validator((data: unknown) => emailImportItemsQuerySchema.parse(data))
  .handler(({ data }) => listEmailImportItemsData(data))

export const getEmailImportItem = createServerFn({ method: "GET" })
  .validator((data: unknown) => idSchema.parse(data))
  .handler(({ data }) => getEmailImportItemData(data.id))

export const approveEmailImportItem = createServerFn({ method: "POST" })
  .validator((data: unknown) => emailImportItemApproveSchema.parse(data))
  .handler(({ data }) => approveEmailImportItemData(data.id, data.request))

export const dismissEmailImportItem = createServerFn({ method: "POST" })
  .validator((data: unknown) => idSchema.parse(data))
  .handler(({ data }) => dismissEmailImportItemData(data.id))

export const restoreEmailImportItem = createServerFn({ method: "POST" })
  .validator((data: unknown) => idSchema.parse(data))
  .handler(({ data }) => restoreEmailImportItemData(data.id))

export const reparseEmailImportItems = createServerFn({ method: "POST" })
  .validator((data: unknown) => emailImportReparseSchema.parse(data))
  .handler(({ data }) => reparseEmailImportItemsData(data))
