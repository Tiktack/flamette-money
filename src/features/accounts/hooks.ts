import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { accountsQueryOptions } from "./query-options"
import { createAccount, deleteAccount, updateAccount } from "./server/functions"

import { accountMutationInvalidations, invalidateQueries } from "@/features/shared/cache-invalidations"

import type { AccountCreateRequest, AccountUpdateRequest } from "./types"

export function useAccounts() {
  return useQuery(accountsQueryOptions())
}

export function useCreateAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: AccountCreateRequest) => createAccount({ data: request }),
    onSuccess: async () => invalidateQueries(queryClient, accountMutationInvalidations),
  })
}

export function useUpdateAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: AccountUpdateRequest }) => updateAccount({ data: { id, request } }),
    onSuccess: async () => invalidateQueries(queryClient, accountMutationInvalidations),
  })
}

export function useDeleteAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteAccount({ data: { id } }),
    onSuccess: async () => invalidateQueries(queryClient, accountMutationInvalidations),
  })
}
