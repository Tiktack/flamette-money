import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiDelete, apiGet, apiPost, apiPut } from './client'
import type {
  AccountCreateRequest,
  AccountListItem,
  AccountUpdateRequest,
  CategoryHierarchy,
  TransactionListItem,
} from './types'

export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: () => apiGet<AccountListItem[]>('/api/accounts'),
  })
}

export function useCreateAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: AccountCreateRequest) =>
      apiPost<AccountListItem, AccountCreateRequest>('/api/accounts', request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts'] }),
  })
}

export function useUpdateAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: AccountUpdateRequest }) =>
      apiPut<AccountListItem, AccountUpdateRequest>(`/api/accounts/${id}`, request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts'] }),
  })
}

export function useDeleteAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => apiDelete(`/api/accounts/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts'] }),
  })
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => apiGet<CategoryHierarchy[]>('/api/categories'),
  })
}

export function useTransactions(page = 1, pageSize = 50) {
  const searchParams = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  })

  return useQuery({
    queryKey: ['transactions', page, pageSize],
    queryFn: () => apiGet<TransactionListItem[]>(`/api/transactions?${searchParams}`),
  })
}
