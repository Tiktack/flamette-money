import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { emailImportInvalidations, invalidateQueries, transactionMutationInvalidations } from "@/features/shared/cache-invalidations"

import {
  emailConnectionsQueryOptions,
  emailImportItemQueryOptions,
  emailImportItemsQueryOptions,
  emailImportRulesQueryOptions,
  emailImportStatusQueryOptions,
} from "./query-options"
import {
  createEmailConnection,
  createEmailImportRule,
  deleteEmailConnection,
  deleteEmailImportRule,
  dismissEmailImportItem,
  linkEmailImportItem,
  previewEmailImportRule,
  reorderEmailImportRules,
  reparseEmailImportItems,
  restoreEmailImportItem,
  syncEmailConnectionNow,
  testEmailConnection,
  updateEmailConnection,
  updateEmailImportRule,
} from "./server/functions"
import type {
  EmailConnectionCreateRequest,
  EmailConnectionTestRequest,
  EmailConnectionUpdateRequest,
  EmailImportItemsQuery,
  EmailImportRuleRequest,
  EmailRuleMatchMode,
} from "./types"
import type { EmailRuleCondition } from "./rules"

export function useEmailConnections() {
  return useQuery(emailConnectionsQueryOptions())
}

export function useEmailImportRules() {
  return useQuery(emailImportRulesQueryOptions())
}

export function useEmailImportItems(query?: EmailImportItemsQuery) {
  return useQuery(emailImportItemsQueryOptions(query))
}

export function useEmailImportItem(id?: string) {
  return useQuery({
    ...emailImportItemQueryOptions(id ?? ""),
    enabled: Boolean(id),
  })
}

export function useEmailImportStatus() {
  return useQuery(emailImportStatusQueryOptions())
}

export function useCreateEmailConnection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: EmailConnectionCreateRequest) => createEmailConnection({ data: request }),
    onSuccess: async () => invalidateQueries(queryClient, emailImportInvalidations),
  })
}

export function useUpdateEmailConnection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: EmailConnectionUpdateRequest }) => updateEmailConnection({ data: { id, request } }),
    onSuccess: async () => invalidateQueries(queryClient, emailImportInvalidations),
  })
}

export function useDeleteEmailConnection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteEmailConnection({ data: { id } }).then(() => undefined),
    onSuccess: async () => invalidateQueries(queryClient, emailImportInvalidations),
  })
}

export function useTestEmailConnection() {
  return useMutation({
    mutationFn: (request: EmailConnectionTestRequest) => testEmailConnection({ data: request }),
  })
}

// Sync can auto-create transactions, so transaction-derived caches refresh too.
export function useSyncEmailConnectionNow() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => syncEmailConnectionNow({ data: { id } }),
    onSuccess: async () => {
      await invalidateQueries(queryClient, emailImportInvalidations)
      await invalidateQueries(queryClient, transactionMutationInvalidations)
    },
  })
}

export function useCreateEmailImportRule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: EmailImportRuleRequest) => createEmailImportRule({ data: request }),
    onSuccess: async () => invalidateQueries(queryClient, emailImportInvalidations),
  })
}

export function useUpdateEmailImportRule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: EmailImportRuleRequest }) => updateEmailImportRule({ data: { id, request } }),
    onSuccess: async () => invalidateQueries(queryClient, emailImportInvalidations),
  })
}

export function useDeleteEmailImportRule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteEmailImportRule({ data: { id } }).then(() => undefined),
    onSuccess: async () => invalidateQueries(queryClient, emailImportInvalidations),
  })
}

export function useReorderEmailImportRules() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (orderedIds: string[]) => reorderEmailImportRules({ data: { orderedIds } }).then(() => undefined),
    onSuccess: async () => invalidateQueries(queryClient, emailImportInvalidations),
  })
}

export function usePreviewEmailImportRule() {
  return useMutation({
    mutationFn: (request: { matchMode: EmailRuleMatchMode; conditions: EmailRuleCondition[] }) => previewEmailImportRule({ data: request }),
  })
}

export function useLinkEmailImportItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, transactionId }: { id: string; transactionId: string }) => linkEmailImportItem({ data: { id, transactionId } }).then(() => undefined),
    onSuccess: async () => invalidateQueries(queryClient, emailImportInvalidations),
  })
}

export function useDismissEmailImportItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => dismissEmailImportItem({ data: { id } }).then(() => undefined),
    onSuccess: async () => invalidateQueries(queryClient, emailImportInvalidations),
  })
}

export function useRestoreEmailImportItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => restoreEmailImportItem({ data: { id } }).then(() => undefined),
    onSuccess: async () => invalidateQueries(queryClient, emailImportInvalidations),
  })
}

// Re-parse can auto-create transactions just like sync.
export function useReparseEmailImportItems() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: { ids?: string[]; connectionId?: string }) => reparseEmailImportItems({ data: request }),
    onSuccess: async () => {
      await invalidateQueries(queryClient, emailImportInvalidations)
      await invalidateQueries(queryClient, transactionMutationInvalidations)
    },
  })
}
