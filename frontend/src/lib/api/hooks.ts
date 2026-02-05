import { useQuery } from '@tanstack/react-query'
import { apiGet } from './client'
import type { AccountListItem, CategoryHierarchy, TransactionListItem } from './types'

export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: () => apiGet<AccountListItem[]>('/api/accounts'),
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
