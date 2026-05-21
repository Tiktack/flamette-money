import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { categoriesQueryOptions } from "./query-options"
import { createCategory, deleteCategory, updateCategory } from "./server/functions"

import { queryKeys } from "@/features/shared/query-keys"

import type { CategoryCreateRequest, CategoryUpdateRequest } from "./types"

export function useCategories() {
  return useQuery(categoriesQueryOptions())
}

export function useCreateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: CategoryCreateRequest) => createCategory({ data: request }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.categories() }),
  })
}

export function useUpdateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: CategoryUpdateRequest }) => updateCategory({ data: { id, request } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.categories() }),
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteCategory({ data: { id } }).then(() => undefined),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.categories() }),
  })
}
