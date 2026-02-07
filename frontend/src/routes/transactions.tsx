import { createFileRoute } from '@tanstack/react-router'
import {
  Badge,
  Button,
  Card,
  Collapse,
  Group,
  MultiSelect,
  NumberInput,
  Pagination,
  Skeleton,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core'
import { DatePickerInput } from '@mantine/dates'
import { useEffect, useMemo, useState } from 'react'
import { useAccounts, useCategories, useTransactionsSearch } from '../lib/api/hooks'
import { useTransactionsFilters } from '../lib/state/transactionsFilters'
import type { CategoryHierarchy, TransactionListItem, TransactionType } from '../lib/api/types'
import classes from './page.module.css'

export const Route = createFileRoute('/transactions')({
  component: TransactionsPage,
})

function TransactionsPage() {
  const accountsQuery = useAccounts()
  const categoriesQuery = useCategories()
  const filters = useTransactionsFilters()
  const [filtersOpened, setFiltersOpened] = useState(false)
  const [page, setPage] = useState(1)
  const pageSize = 12

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
    if (filters.datePreset === 'month') {
      const anchor = filters.monthAnchor
        ? new Date(`${filters.monthAnchor}T00:00:00`)
        : new Date()
      const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
      const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0, 23, 59, 59, 999)
      return { start, end }
    }

    if (filters.datePreset === 'year') {
      const year = filters.yearAnchor || new Date().getFullYear()
      const start = new Date(year, 0, 1)
      const end = new Date(year, 11, 31, 23, 59, 59, 999)
      return { start, end }
    }

    if (filters.datePreset === 'custom') {
      const start = filters.customStartDate
        ? new Date(`${filters.customStartDate}T00:00:00`)
        : null
      const end = filters.customEndDate
        ? new Date(`${filters.customEndDate}T23:59:59`)
        : null
      return { start, end }
    }

    return { start: null, end: null }
  }, [
    filters.customEndDate,
    filters.customStartDate,
    filters.datePreset,
    filters.monthAnchor,
    filters.yearAnchor,
  ])

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

  const monthLabel = useMemo(() => {
    const anchor = filters.monthAnchor
      ? new Date(`${filters.monthAnchor}T00:00:00`)
      : new Date()
    return anchor.toLocaleString('en-US', { month: 'long', year: 'numeric' })
  }, [filters.monthAnchor])

  const yearLabel = useMemo(
    () => String(filters.yearAnchor || new Date().getFullYear()),
    [filters.yearAnchor],
  )

  const customRangeValue = useMemo(() => {
    if (!filters.customStartDate || !filters.customEndDate) {
      return [null, null] as [Date | null, Date | null]
    }

    return [
      new Date(`${filters.customStartDate}T00:00:00`),
      new Date(`${filters.customEndDate}T00:00:00`),
    ]
  }, [filters.customEndDate, filters.customStartDate])

  const handleRangeChange = (value: [Date | null, Date | null]) => {
    const [start, end] = value
    filters.setCustomStartDate(start ? start.toISOString().slice(0, 10) : '')
    filters.setCustomEndDate(end ? end.toISOString().slice(0, 10) : '')
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
        <Group gap="sm" wrap="wrap" justify="space-between">
          <Group gap="xs">
            <Button
              variant={filters.datePreset === 'month' ? 'light' : 'subtle'}
              onClick={() => filters.setDatePreset('month')}
            >
              Month
            </Button>
            <Button
              variant={filters.datePreset === 'year' ? 'light' : 'subtle'}
              onClick={() => filters.setDatePreset('year')}
            >
              Year
            </Button>
            <Button
              variant={filters.datePreset === 'all' ? 'light' : 'subtle'}
              onClick={() => filters.setDatePreset('all')}
            >
              All time
            </Button>
            <Button
              variant={filters.datePreset === 'custom' ? 'light' : 'subtle'}
              onClick={() => filters.setDatePreset('custom')}
            >
              Custom
            </Button>
          </Group>
          {filters.datePreset === 'month' ? (
            <Group gap="xs" className={classes.dateNav}>
              <Button variant="subtle" onClick={() => filters.shiftMonth(-1)}>
                Prev
              </Button>
              <Text fw={600}>{monthLabel}</Text>
              <Button variant="subtle" onClick={() => filters.shiftMonth(1)}>
                Next
              </Button>
            </Group>
          ) : null}
          {filters.datePreset === 'year' ? (
            <Group gap="xs" className={classes.dateNav}>
              <Button variant="subtle" onClick={() => filters.shiftYear(-1)}>
                Prev
              </Button>
              <Text fw={600}>{yearLabel}</Text>
              <Button variant="subtle" onClick={() => filters.shiftYear(1)}>
                Next
              </Button>
            </Group>
          ) : null}
        </Group>
        {filters.datePreset === 'custom' ? (
          <DatePickerInput
            type="range"
            label="Custom range"
            placeholder="Pick dates"
            value={customRangeValue}
            onChange={handleRangeChange}
            className={classes.rangePicker}
          />
        ) : null}
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
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {pagedTransactions.map((transaction) => {
                  const accountInfo = buildAccountBadge(transaction.accountId)
                  const targetInfo = transaction.targetAccountId
                    ? buildAccountBadge(transaction.targetAccountId)
                    : null
                  const amountTone =
                    transaction.type === 'Income'
                      ? classes.amountPositive
                      : transaction.type === 'Expense'
                        ? classes.amountNegative
                        : transaction.type === 'Refund'
                          ? classes.amountWarning
                          : classes.amountNeutral
                  const isTransfer = transaction.type === 'Transfer'
                  const isRefund = transaction.type === 'Refund'

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
                          <Text fw={600} size="sm">
                            {buildCategoryLabel(transaction)}
                          </Text>
                          {isRefund ? (
                            <Badge variant="light" size="xs" color="orange">
                              Refund
                            </Badge>
                          ) : null}
                        </div>
                      </Table.Td>
                      <Table.Td>
                        <Text fw={600} className={amountTone}>
                          {formatAmount(transaction)}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" c="dimmed">
                          {transaction.note ?? transaction.merchantName ?? '-'}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" className={classes.dateCell}>
                          {formatDate(transaction.date)}
                        </Text>
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

    </Stack>
  )
}
