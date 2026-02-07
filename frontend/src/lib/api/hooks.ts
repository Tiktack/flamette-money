import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  deleteApiAccountsById,
  deleteApiCategoriesById,
  getApiAccounts,
  getApiCategories,
  getApiTransactions,
  postApiAccounts,
  postApiCategories,
  putApiAccountsById,
  putApiCategoriesById,
} from './generated/sdk.gen'
import type {
  AccountCreateRequest,
  AccountUpdateRequest,
  CategoryCreateRequest,
  CategoryUpdateRequest,
} from './types'

export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: () => getApiAccounts({ throwOnError: true }),
    select: (result) => result.data ?? [],
  })
}

export function useCreateAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: AccountCreateRequest) =>
      postApiAccounts({ body: request, throwOnError: true }).then((result) => result.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts'] }),
  })
}

export function useUpdateAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: AccountUpdateRequest }) =>
      putApiAccountsById({ path: { id }, body: request, throwOnError: true }).then(
        (result) => result.data,
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts'] }),
  })
}

export function useDeleteAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      deleteApiAccountsById({ path: { id }, throwOnError: true }).then(() => undefined),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts'] }),
  })
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => getApiCategories({ throwOnError: true }),
    select: (result) => result.data ?? [],
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: CategoryCreateRequest) =>
      postApiCategories({ body: request, throwOnError: true }).then((result) => result.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  })
}

export function useUpdateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: CategoryUpdateRequest }) =>
      putApiCategoriesById({ path: { id }, body: request, throwOnError: true }).then(
        (result) => result.data,
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      deleteApiCategoriesById({ path: { id }, throwOnError: true }).then(() => undefined),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  })
}

export function useTransactions(page = 1, pageSize = 50) {
  return useQuery({
    queryKey: ['transactions', page, pageSize],
    queryFn: () =>
      getApiTransactions({
        query: { page, pageSize },
        throwOnError: true,
      }),
    select: (result) => result.data ?? [],
  })
}
