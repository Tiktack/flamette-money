import { createFileRoute } from '@tanstack/react-router'
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Collapse,
  Group,
  Modal,
  MultiSelect,
  NumberInput,
  Pagination,
  Skeleton,
  Stack,
  Table,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core'
import { useEffect, useMemo, useState } from 'react'
import {
  useAccounts,
  useCategories,
  useDeleteTransaction,
  useTransactionsSearch,
} from '../lib/api/hooks'
import { CategoryIcon, normalizeCategoryColor } from '../lib/categories/visuals'
import { SharedDateRangeChips } from '../components/SharedDateRangeChips'
import {
  resolveSharedDateRange,
  useSharedDateRangeFilters,
} from '../lib/state/sharedDateRangeFilters'
import { useTransactionsFilters } from '../lib/state/transactionsFilters'
import type { CategoryHierarchy, TransactionListItem, TransactionType } from '../lib/api/types'
import { Route as RootRoute } from './__root'
import classes from './page.module.css'

export const Route = createFileRoute('/transactions')({
  component: TransactionsPage,
})

function TransactionsPage() {
  const accountsQuery = useAccounts()
  const categoriesQuery = useCategories()
  const deleteTransaction = useDeleteTransaction()
  const filters = useTransactionsFilters()
  const dateFilters = useSharedDateRangeFilters()
  const [filtersOpened, setFiltersOpened] = useState(false)
  const [page, setPage] = useState(1)
  const navigate = RootRoute.useNavigate()
  const pageSize = 12
  const [deleteTarget, setDeleteTarget] = useState<TransactionListItem | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const categoryMap = useMemo(() => {
    const map = new Map<string, CategoryHierarchy>()
    for (const category of categoriesQuery.data ?? []) {
      map.set(category.id, category)
      for (const subcategory of category.subcategories ?? []) {
        map.set(subcategory.id, subcategory)
      }
    }
    return map
  }, [categoriesQuery.data])

  const accountMap = useMemo(() => {
    const map = new Map<string, { name: string; currency: string; color: string }>()
    for (const account of accountsQuery.data ?? []) {
      map.set(account.id, {
        name: account.name,
        currency: account.currency,
        color: account.color,
      })
    }
    return map
  }, [accountsQuery.data])

  const accountOptions = useMemo(
    () =>
      (accountsQuery.data ?? [])
        .filter(Boolean)
        .map((account) => ({
          value: account.id,
          label: `${account.name} · ${account.currency}`,
        })),
    [accountsQuery.data],
  )

  const categoryOptions = useMemo(() => {
    const groups: Record<string, { group: string; items: { value: string; label: string }[] }> = {}

    for (const category of categoriesQuery.data ?? []) {
      if (!category) {
        continue
      }

      const group = category.type ?? 'Other'
      if (!groups[group]) {
        groups[group] = { group, items: [] }
      }

      groups[group].items.push({
        value: category.id,
        label: category.name,
      })

      for (const subcategory of category.subcategories ?? []) {
        if (!subcategory) {
          continue
        }

        groups[group].items.push({
          value: subcategory.id,
          label: `${category.name} / ${subcategory.name}`,
        })
      }
    }

    return Object.values(groups).filter((group) => group.items.length > 0)
  }, [categoriesQuery.data])

  const safeAccountOptions = useMemo(
    () => (Array.isArray(accountOptions) ? accountOptions : []).filter(Boolean),
    [accountOptions],
  )
  const safeCategoryOptions = useMemo(
    () =>
      (Array.isArray(categoryOptions) ? categoryOptions : []).filter(
        (group) => group && Array.isArray(group.items),
      ),
    [categoryOptions],
  )
  const safeAccountValues = useMemo(
    () => (Array.isArray(filters.accountIds) ? filters.accountIds.filter(Boolean) : []),
    [filters.accountIds],
  )
  const safeCategoryValues = useMemo(
    () => (Array.isArray(filters.categoryIds) ? filters.categoryIds.filter(Boolean) : []),
    [filters.categoryIds],
  )
  const safeTypeValues = useMemo(
    () =>
      Array.isArray(filters.transactionTypes)
        ? filters.transactionTypes.filter(Boolean)
        : [],
    [filters.transactionTypes],
  )
  const transactionTypeOptions = useMemo(
    () => ['Income', 'Expense', 'Transfer', 'Refund'],
    [],
  )

  const resolvedDateRange = useMemo(() => {
    return resolveSharedDateRange(dateFilters)
  }, [dateFilters])

  const searchQuery = useMemo(() => {
    const query: {
      StartDate?: string
      EndDate?: string
      AccountIds?: string[]
      CategoryIds?: string[]
      MinAmount?: number
      MaxAmount?: number
      Types?: TransactionType[]
    } = {}

    if (resolvedDateRange.start) {
      query.StartDate = resolvedDateRange.start.toISOString()
    }

    if (resolvedDateRange.end) {
      query.EndDate = resolvedDateRange.end.toISOString()
    }

    if (filters.accountIds.length > 0) {
      query.AccountIds = filters.accountIds
    }

    if (filters.categoryIds.length > 0) {
      query.CategoryIds = filters.categoryIds
    }

    if (filters.transactionTypes.length > 0) {
      query.Types = filters.transactionTypes as TransactionType[]
    }

    if (filters.amountMin !== null) {
      query.MinAmount = filters.amountMin
    }

    if (filters.amountMax !== null) {
      query.MaxAmount = filters.amountMax
    }

    return query
  }, [
    filters.accountIds,
    filters.amountMax,
    filters.transactionTypes,
    filters.amountMin,
    filters.categoryIds,
    resolvedDateRange.end,
    resolvedDateRange.start,
  ])

  const transactionsQuery = useTransactionsSearch(searchQuery)

  useEffect(() => {
    setPage(1)
  }, [searchQuery])

  const pagedTransactions = useMemo(() => {
    const list = transactionsQuery.data ?? []
    const start = (page - 1) * pageSize
    return list.slice(start, start + pageSize)
  }, [page, pageSize, transactionsQuery.data])

  const pageCount = Math.max(1, Math.ceil((transactionsQuery.data?.length ?? 0) / pageSize))

  const formatAmount = (transaction: TransactionListItem) => {
    const account = accountMap.get(transaction.accountId)
    const currency = account?.currency ?? 'USD'
    const amount = Number(transaction.amount)
    const sign = transaction.type === 'Expense' || transaction.type === 'Refund' ? -1 : 1
    const formatted = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount * sign)

    return formatted
  }

  const buildCategoryLabel = (transaction: TransactionListItem) => {
    if (transaction.type === 'Transfer') {
      return 'Transfer'
    }

    const categoryId = transaction.subCategoryId ?? transaction.categoryId
    if (!categoryId) {
      return '-'
    }

    const category = categoryMap.get(categoryId)
    if (!category) {
      return '-'
    }

    if (transaction.subCategoryId && category.parentId) {
      const parent = categoryMap.get(category.parentId)
      if (parent) {
        return `${parent.name} / ${category.name}`
      }
    }

    return category.name
  }

  const buildAccountBadge = (accountId: string) => {
    const account = accountMap.get(accountId)
    if (!account) {
      return { name: '-', color: '#CED4DA' }
    }

    return { name: account.name, color: account.color }
  }

  const formatDate = (value: string) => {
    const date = new Date(value)
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${day}-${month}-${year}`
  }

  const handleDelete = async () => {
    if (!deleteTarget) {
      return
    }

    setDeleteError(null)
    try {
      await deleteTransaction.mutateAsync(deleteTarget.id)
      setDeleteTarget(null)
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Unable to delete transaction.')
    }
  }

  const EditIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M4 20h4l10.5-10.5-4-4L4 16v4z" />
      <path d="M13.5 5.5l4 4" />
    </svg>
  )

  const TrashIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M6 6l1 14h10l1-14" />
    </svg>
  )

  return (
    <Stack className={classes.page}>
      <Group className={classes.header} justify="space-between" wrap="wrap" gap="md">
        <Title order={2}>Transactions</Title>
        <Group gap="sm" className={classes.toolbar}>
          <Button
            variant={filtersOpened ? 'light' : 'subtle'}
            onClick={() => setFiltersOpened((current) => !current)}
          >
            Filters
          </Button>
        </Group>
      </Group>

      <Card shadow="sm" radius="md" padding="md" className={classes.dateBar}>
        <SharedDateRangeChips />
      </Card>

      <Collapse in={filtersOpened} transitionDuration={180}>
        <Card shadow="sm" radius="md" padding="md" className={classes.filtersCard}>
          <Stack gap="sm">
            <Group gap="md" wrap="wrap">
              <MultiSelect
                label="Accounts"
                data={safeAccountOptions}
                value={safeAccountValues}
                onChange={filters.setAccountIds}
                searchable
                clearable
                placeholder="Select accounts"
                nothingFoundMessage="No accounts"
              />
              <MultiSelect
                label="Categories"
                data={safeCategoryOptions}
                value={safeCategoryValues}
                onChange={filters.setCategoryIds}
                searchable
                clearable
                placeholder="Select categories"
                nothingFoundMessage="No categories"
              />
              <MultiSelect
                label="Transaction types"
                data={transactionTypeOptions}
                value={safeTypeValues}
                onChange={filters.setTransactionTypes}
                searchable
                clearable
                placeholder="Select types"
              />
            </Group>
            <Group gap="md" wrap="wrap">
              <NumberInput
                label="Min amount"
                min={0}
                value={filters.amountMin ?? undefined}
                onChange={(value) =>
                  filters.setAmountMin(typeof value === 'number' ? value : null)
                }
              />
              <NumberInput
                label="Max amount"
                min={0}
                value={filters.amountMax ?? undefined}
                onChange={(value) =>
                  filters.setAmountMax(typeof value === 'number' ? value : null)
                }
              />
            </Group>
            <Group justify="space-between">
              <Button variant="subtle" onClick={filters.resetFilters}>
                Reset
              </Button>
              <Button onClick={() => setFiltersOpened(false)}>Collapse</Button>
            </Group>
          </Stack>
        </Card>
      </Collapse>

      <Card shadow="sm" radius="lg" padding="lg" className={classes.card}>
        {transactionsQuery.isLoading ? (
          <Skeleton height={220} />
        ) : (
          <div className={classes.tableWrap}>
            <Table verticalSpacing="sm" horizontalSpacing="md" className={classes.table}>
              <Table.Thead>
                <Table.Tr className={classes.headRow}>
                  <Table.Th>Account</Table.Th>
                  <Table.Th>Category</Table.Th>
                  <Table.Th>Amount</Table.Th>
                  <Table.Th>Note</Table.Th>
                  <Table.Th>Date</Table.Th>
                  <Table.Th className={classes.actionsHeader}>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {pagedTransactions.map((transaction) => {
                  const accountInfo = buildAccountBadge(transaction.accountId)
                  const targetInfo = transaction.targetAccountId
                    ? buildAccountBadge(transaction.targetAccountId)
                    : null
                  const isRefund = transaction.isRefund || transaction.type === 'Refund'
                  const amountColor = isRefund
                    ? 'gray.7'
                    : transaction.type === 'Income'
                      ? 'green.7'
                      : transaction.type === 'Expense'
                        ? 'red.7'
                        : transaction.type === 'Transfer'
                          ? 'orange.7'
                          : 'gray.7'
                  const isTransfer = transaction.type === 'Transfer'
                  const categoryId =
                    transaction.type === 'Transfer'
                      ? null
                      : transaction.subCategoryId ?? transaction.categoryId
                  const category = categoryId ? categoryMap.get(categoryId) ?? null : null
                  const categoryColor = category ? normalizeCategoryColor(category.color) : '#CED4DA'
                  const categoryIcon = category?.icon ?? 'tag'
                  const categoryLabel = buildCategoryLabel(transaction)

                  return (
                    <Table.Tr key={transaction.id} className={classes.row}>
                      <Table.Td>
                        <div className={classes.accountCell}>
                          <span
                            className={classes.accountBadge}
                            style={{ backgroundColor: accountInfo.color }}
                          >
                            {accountInfo.name.slice(0, 1)}
                          </span>
                          <Text fw={600} size="sm">
                            {accountInfo.name}
                          </Text>
                          {isTransfer && targetInfo ? (
                            <div className={classes.accountTransfer}>
                              <span className={classes.accountArrow}>→</span>
                              <span
                                className={classes.accountBadge}
                                style={{ backgroundColor: targetInfo.color }}
                              >
                                {targetInfo.name.slice(0, 1)}
                              </span>
                              <Text fw={600} size="sm">
                                {targetInfo.name}
                              </Text>
                            </div>
                          ) : null}
                        </div>
                      </Table.Td>
                      <Table.Td>
                        <div className={classes.categoryCell}>
                          <ThemeIcon
                            radius="xl"
                            size={30}
                            variant="light"
                            style={{
                              backgroundColor: `color-mix(in srgb, ${categoryColor} 16%, transparent)`,
                              color: categoryColor,
                            }}
                          >
                            <CategoryIcon icon={categoryIcon} color={categoryColor} size={18} />
                          </ThemeIcon>
                          <Text fw={600} size="sm">
                            {categoryLabel}
                          </Text>
                          {isRefund ? (
                            <Badge variant="light" size="xs" color="orange">
                              Refund
                            </Badge>
                          ) : null}
                        </div>
                      </Table.Td>
                      <Table.Td>
                        <Text fw={600} c={amountColor}>
                          {formatAmount(transaction)}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" c="dimmed">
                          {transaction.note ?? transaction.merchantName ?? '-'}
                        </Text>
                        {Number(transaction.itemCount) > 0 ? (
                          <Badge variant="light" size="xs" color="blue" mt={2}>
                            {transaction.itemCount} items
                          </Badge>
                        ) : null}
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" className={classes.dateCell}>
                          {formatDate(transaction.date)}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <div className={classes.actions}>
                          <ActionIcon
                            variant="subtle"
                            aria-label="Edit transaction"
                            onClick={() =>
                              navigate({
                                search: (previous) => ({
                                  ...previous,
                                  transactionMode: 'edit',
                                  transactionId: transaction.id,
                                  transactionCategoryId: undefined,
                                  transactionType: undefined,
                                }),
                              })
                            }
                          >
                            <EditIcon width={16} height={16} />
                          </ActionIcon>
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            aria-label="Remove transaction"
                            onClick={() => setDeleteTarget(transaction)}
                          >
                            <TrashIcon width={16} height={16} />
                          </ActionIcon>
                        </div>
                      </Table.Td>
                    </Table.Tr>
                  )
                })}
              </Table.Tbody>
            </Table>
          </div>
        )}
      </Card>

      <Group justify="space-between" align="center">
        <Text size="sm" c="dimmed">
          Showing {(transactionsQuery.data ?? []).length} transactions
        </Text>
        <Pagination value={page} onChange={setPage} total={pageCount} />
      </Group>

      <Modal
        opened={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Remove transaction"
      >
        <Stack gap="sm">
          <Text size="sm">Remove this transaction? This action cannot be undone.</Text>
          {deleteError ? (
            <Text size="sm" c="red">
              {deleteError}
            </Text>
          ) : null}
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button color="red" onClick={handleDelete} loading={deleteTransaction.isPending}>
              Remove
            </Button>
          </Group>
        </Stack>
      </Modal>

    </Stack>
  )
}
