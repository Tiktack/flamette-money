import * as React from "react"

import { createFileRoute } from "@tanstack/react-router"
import { type ColumnDef } from "@tanstack/react-table"
import {
  AddMoneyCircleIcon,
  Airplane01Icon,
  CreditCardIcon,
  Delete02Icon,
  Edit01Icon,
  FilterIcon,
  FilterResetIcon,
  MoreHorizontalCircle01Icon,
  PlusSignIcon,
  Tag01Icon,
  TransactionIcon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { DataTable } from "@/components/data-table"
import { DataTableFacetedFilter, DataTableRangeFilter, type FacetedFilterOption } from "@/components/data-table-faceted-filter"
import { EmptyState } from "@/components/empty-state"
import { LazyTransactionEditorDialog } from "@/components/lazy-transaction-editor-dialog"
import { MetricCard } from "@/components/metric-card"
import { CardSkeleton, MetricCardsSkeleton } from "@/components/page-skeletons"
import { SharedDateRangeToolbar } from "@/components/shared-date-range-toolbar"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { getAccountIconDefinition } from "@/lib/account-icons"
import { CategoryIconBadge, getCategoryIconDefinition } from "@/lib/category-icons"
import { useAccounts } from "@/features/accounts/hooks"
import { useCategories } from "@/features/categories/hooks"
import { getApiErrorMessage } from "@/features/shared/errors"
import { useDeleteTransaction, useTransactionsFacets, useTransactionsSearch, useTransactionsSummary } from "@/features/transactions/hooks"
import { useTrips } from "@/features/trips/hooks"
import { accountTypeMeta } from "@/features/accounts/types"
import type { AccountType } from "@/features/accounts/types"
import type { CategoryHierarchy } from "@/features/categories/types"
import type { TransactionListItem, TransactionType } from "@/features/transactions/types"
import { dispatchPageAction, pageActionTypes } from "@/lib/page-actions"
import { formatCurrency, formatDateLabel, getCategoryLabel, normalizeHexColor, toNumber, transactionTone } from "@/lib/finance"
import { useSharedDateRangeQuery } from "@/lib/state/sharedDateRangeFilters"
import { useTransactionsFilters } from "@/lib/state/transactionsFilters"

export const Route = createFileRoute("/_protected/transactions")({
  head: () => ({ meta: [{ title: "Transactions — Flamette Money" }] }),
  component: TransactionsPage,
})

const transactionTypeOptions: TransactionType[] = ["Expense", "Income", "Transfer", "Refund"]

type AccountSummary = {
  name: string
  currency: string
  color: string
  icon: string
  type: AccountType
}

function TransactionsPage() {
  const accountsQuery = useAccounts()
  const categoriesQuery = useCategories()
  const tripsQuery = useTrips()
  const deleteTransaction = useDeleteTransaction()
  const filters = useTransactionsFilters()
  const sharedDateRangeQuery = useSharedDateRangeQuery()
  const [searchText, setSearchText] = React.useState("")
  const [debouncedSearchText, setDebouncedSearchText] = React.useState("")
  const [editor, setEditor] = React.useState<{
    mode: "new" | "edit"
    id?: string
  } | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<TransactionListItem | null>(null)

  const categories = React.useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data])
  const categoryMap = React.useMemo(() => {
    const map = new Map<string, CategoryHierarchy>()
    for (const category of categories) {
      map.set(category.id, category)
      for (const subcategory of category.subcategories ?? []) {
        map.set(subcategory.id, subcategory)
      }
    }
    return map
  }, [categories])

  const accountMap = React.useMemo(() => {
    const map = new Map<string, AccountSummary>()
    for (const account of accountsQuery.data ?? []) {
      map.set(account.id, {
        name: account.name,
        currency: account.currency,
        color: normalizeHexColor(account.color),
        icon: account.icon,
        type: account.type,
      })
    }
    return map
  }, [accountsQuery.data])

  // Debounce the free-text search so each keystroke doesn't fire three server queries.
  React.useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearchText(searchText), 300)
    return () => clearTimeout(timeout)
  }, [searchText])

  const baseQuery = React.useMemo(() => {
    const value: {
      StartDate?: string
      EndDate?: string
      AccountIds?: string[]
      CategoryIds?: string[]
      TripIds?: string[]
      Types?: TransactionType[]
      SearchText?: string
      MinAmount?: number
      MaxAmount?: number
    } = { ...sharedDateRangeQuery }

    if (filters.accountIds.length) {
      value.AccountIds = filters.accountIds
    }
    if (filters.categoryIds.length) {
      value.CategoryIds = filters.categoryIds
    }
    if (filters.tripIds.length) {
      value.TripIds = filters.tripIds
    }
    if (filters.transactionTypes.length) {
      value.Types = filters.transactionTypes as TransactionType[]
    }
    if (debouncedSearchText.trim()) {
      value.SearchText = debouncedSearchText.trim()
    }

    return value
  }, [debouncedSearchText, filters.accountIds, filters.categoryIds, filters.tripIds, filters.transactionTypes, sharedDateRangeQuery])

  const query = React.useMemo(() => {
    const value: typeof baseQuery & {
      MinAmount?: number
      MaxAmount?: number
    } = { ...baseQuery }

    if (filters.amountMin != null) {
      value.MinAmount = filters.amountMin
    }
    if (filters.amountMax != null) {
      value.MaxAmount = filters.amountMax
    }

    return value
  }, [baseQuery, filters.amountMax, filters.amountMin])

  const transactionsFacetsQuery = useTransactionsFacets(baseQuery)
  const transactionsQuery = useTransactionsSearch(query)
  const transactionsSummaryQuery = useTransactionsSummary(query)
  const transactions = React.useMemo(() => transactionsQuery.data ?? [], [transactionsQuery.data])

  const hasActiveFilters =
    filters.accountIds.length > 0 ||
    filters.categoryIds.length > 0 ||
    filters.tripIds.length > 0 ||
    filters.transactionTypes.length > 0 ||
    filters.amountMin != null ||
    filters.amountMax != null ||
    searchText.trim().length > 0

  const accountCounts = React.useMemo(() => {
    return new Map(Object.entries(transactionsFacetsQuery.data?.accountCounts ?? {}).map(([id, count]) => [id, Number(count)]))
  }, [transactionsFacetsQuery.data?.accountCounts])

  const categoryCounts = React.useMemo(() => {
    return new Map(Object.entries(transactionsFacetsQuery.data?.categoryCounts ?? {}).map(([id, count]) => [id, Number(count)]))
  }, [transactionsFacetsQuery.data?.categoryCounts])

  const transactionTypeCounts = React.useMemo(() => {
    return new Map(Object.entries(transactionsFacetsQuery.data?.transactionTypeCounts ?? {}).map(([id, count]) => [id, Number(count)]))
  }, [transactionsFacetsQuery.data?.transactionTypeCounts])

  const tripCounts = React.useMemo(() => {
    return new Map(Object.entries(transactionsFacetsQuery.data?.tripCounts ?? {}).map(([id, count]) => [id, Number(count)]))
  }, [transactionsFacetsQuery.data?.tripCounts])

  const maxAvailableAmount = React.useMemo(() => {
    return Number(transactionsFacetsQuery.data?.maxAvailableAmount ?? 0)
  }, [transactionsFacetsQuery.data?.maxAvailableAmount])

  const amountRangeValue = React.useMemo<[number, number]>(() => {
    const nextMax = maxAvailableAmount

    return [filters.amountMin ?? 0, filters.amountMax ?? nextMax]
  }, [filters.amountMax, filters.amountMin, maxAvailableAmount])

  const accountFacetOptions = React.useMemo<FacetedFilterOption[]>(
    () =>
      (accountsQuery.data ?? []).map((account) => ({
        label: account.name,
        value: account.id,
        count: accountCounts.get(account.id) ?? 0,
        icon: getAccountIconDefinition(account.icon).icon,
        color: normalizeHexColor(account.color),
        group: accountTypeMeta[account.type].label,
      })),
    [accountCounts, accountsQuery.data]
  )

  const categoryFacetOptions = React.useMemo<FacetedFilterOption[]>(
    () =>
      categories.map((category) => ({
        label: category.name,
        value: category.id,
        count: categoryCounts.get(category.id) ?? 0,
        icon: getCategoryIconDefinition(category.icon).icon,
        color: normalizeHexColor(category.color, "#D96B4F"),
        group: category.type,
      })),
    [categories, categoryCounts]
  )

  const tripFacetOptions = React.useMemo<FacetedFilterOption[]>(
    () =>
      (tripsQuery.data ?? []).map((trip) => ({
        label: trip.name,
        value: trip.id,
        count: tripCounts.get(trip.id) ?? 0,
        icon: Airplane01Icon,
        color: "#2563eb",
      })),
    [tripCounts, tripsQuery.data]
  )

  const transactionTypeFacetOptions = React.useMemo<FacetedFilterOption[]>(
    () =>
      transactionTypeOptions.map((type) => ({
        label: type,
        value: type,
        count: transactionTypeCounts.get(type) ?? 0,
        icon: type === "Income" ? AddMoneyCircleIcon : type === "Transfer" ? TransactionIcon : type === "Refund" ? FilterResetIcon : Tag01Icon,
        color: type === "Income" ? "#059669" : type === "Transfer" ? "#d97706" : type === "Refund" ? "#2563eb" : "#dc2626",
      })),
    [transactionTypeCounts]
  )

  const summaryMetrics = transactionsSummaryQuery.data
  const primaryCurrency = summaryMetrics?.baseCurrency
  const formatAmountRangeLabel = React.useCallback(
    (value: number) =>
      primaryCurrency ? formatCurrency(value, primaryCurrency) : new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value),
    [primaryCurrency]
  )

  // mutation.reset is a stable reference; destructured so the callback below stays stable too.
  const { reset: resetDeleteTransaction } = deleteTransaction

  const openDelete = React.useCallback(
    (transaction: TransactionListItem) => {
      resetDeleteTransaction()
      setDeleteTarget(transaction)
    },
    [resetDeleteTransaction]
  )

  const columns = React.useMemo<ColumnDef<TransactionListItem>[]>(
    () => [
      {
        accessorKey: "accountId",
        header: "Account",
        enableHiding: false,
        cell: ({ row }) => {
          const transaction = row.original
          const account = accountMap.get(transaction.accountId)
          const iconDefinition = getAccountIconDefinition(account?.icon)

          return (
            <div className="flex items-center gap-3">
              <div
                className="flex size-10 items-center justify-center rounded-2xl text-sm font-semibold text-white"
                style={{ backgroundColor: account?.color ?? "#B9A88A" }}
              >
                <HugeiconsIcon icon={iconDefinition.icon} strokeWidth={2} className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{account?.name ?? "Account"}</p>
                <p className="truncate text-sm text-muted-foreground">{transaction.type}</p>
              </div>
            </div>
          )
        },
      },
      {
        accessorKey: "categoryId",
        header: "Category",
        cell: ({ row }) => {
          const transaction = row.original
          const label = getCategoryLabel(transaction, categoryMap)
          const categoryId = transaction.subCategoryId ?? transaction.categoryId
          const category = transaction.type === "Transfer" || !categoryId ? null : categoryMap.get(categoryId)

          if (!category) {
            return <span className="text-sm text-muted-foreground">{label}</span>
          }

          return (
            <div className="flex items-center gap-2">
              <CategoryIconBadge icon={category.icon} color={category.color} className="size-6 rounded-md" iconClassName="size-3.5" />
              <span className="truncate text-sm text-foreground">{label}</span>
            </div>
          )
        },
      },
      {
        accessorFn: (row) => toNumber(row.amount),
        id: "amount",
        enableHiding: false,
        header: () => <div className="text-right">Amount</div>,
        cell: ({ row }) => {
          const transaction = row.original
          const account = accountMap.get(transaction.accountId)

          return (
            <div className={`text-right font-medium tabular-nums ${transactionTone(transaction.type, transaction.isRefund)}`}>
              {formatCurrency(transaction.amount, transaction.currency ?? account?.currency ?? "USD")}
            </div>
          )
        },
      },
      {
        accessorFn: (row) => row.note || row.merchantName || row.location || "",
        id: "details",
        header: "Details",
        cell: ({ row }) => {
          const transaction = row.original
          const detailsSummary = transaction.note || transaction.merchantName || transaction.location || "-"
          const secondary = [transaction.merchantName, transaction.location].filter((value) => value && value !== detailsSummary).join(" • ")

          return (
            <div className="max-w-[320px] min-w-0">
              <p className="truncate text-foreground">{detailsSummary}</p>
              {secondary ? <p className="truncate text-sm text-muted-foreground">{secondary}</p> : null}
            </div>
          )
        },
      },
      {
        accessorKey: "date",
        header: "Date",
        cell: ({ row }) => <p className="text-foreground">{formatDateLabel(row.original.date)}</p>,
      },
      {
        id: "actions",
        enableSorting: false,
        enableHiding: false,
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => {
          const transaction = row.original

          return (
            <div className="flex justify-end gap-1">
              <Button variant="ghost" size="icon-sm" onClick={() => setEditor({ mode: "edit", id: transaction.id })}>
                <HugeiconsIcon icon={Edit01Icon} strokeWidth={2} />
                <span className="sr-only">Edit transaction</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" className="text-muted-foreground data-open:bg-muted" />}>
                  <HugeiconsIcon icon={MoreHorizontalCircle01Icon} strokeWidth={2} />
                  <span className="sr-only">More actions</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem variant="destructive" onClick={() => openDelete(transaction)}>
                    <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} className="text-destructive" />
                    <span>Delete transaction</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setEditor({ mode: "edit", id: transaction.id })}>
                    <HugeiconsIcon icon={Edit01Icon} strokeWidth={2} className="text-muted-foreground" />
                    <span>Edit transaction</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      },
    ],
    [accountMap, categoryMap, openDelete]
  )

  const resetAllFilters = () => {
    filters.resetFilters()
    setSearchText("")
  }

  const handleAmountRangeChange = (value: [number, number]) => {
    const [nextMin, nextMax] = value
    const normalizedMax = Math.max(nextMin, nextMax)

    filters.setAmountMin(nextMin <= 0 ? null : nextMin)
    filters.setAmountMax(normalizedMax >= maxAvailableAmount ? null : normalizedMax)
  }

  const handleDelete = async () => {
    if (!deleteTarget) {
      return
    }

    try {
      await deleteTransaction.mutateAsync(deleteTarget.id)
      setDeleteTarget(null)
    } catch {
      // rendered below
    }
  }

  const isFirstTimeEmpty = transactions.length === 0 && !hasActiveFilters

  return (
    <div className="flex flex-col gap-6">
      <SharedDateRangeToolbar />

      {transactionsQuery.isPending || transactionsSummaryQuery.isPending ? (
        <MetricCardsSkeleton className="md:grid-cols-3" />
      ) : transactionsSummaryQuery.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load summary</AlertTitle>
          <AlertDescription>{getApiErrorMessage(transactionsSummaryQuery.error, "Try again in a moment.")}</AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard
            label="Transactions"
            icon={TransactionIcon}
            iconBgClassName="bg-primary/10"
            iconColorClassName="text-primary"
            value={String(summaryMetrics?.transactionCount ?? transactions.length)}
          />
          <MetricCard
            label="Income"
            icon={AddMoneyCircleIcon}
            iconBgClassName="bg-blue-500/10 dark:bg-blue-400/15"
            iconColorClassName="text-blue-600 dark:text-blue-400"
            badge={<MetricCardBadge>{formatTransactionCount(summaryMetrics?.incomeCount ?? 0)}</MetricCardBadge>}
            value={formatCurrency(summaryMetrics?.incomeTotal, summaryMetrics?.baseCurrency)}
          />
          <MetricCard
            label="Expenses"
            icon={CreditCardIcon}
            iconBgClassName="bg-amber-500/10 dark:bg-amber-500/15"
            iconColorClassName="text-amber-600 dark:text-amber-400"
            badge={<MetricCardBadge>{formatTransactionCount(summaryMetrics?.expenseCount ?? 0)}</MetricCardBadge>}
            value={formatCurrency(summaryMetrics?.expenseTotal, summaryMetrics?.baseCurrency)}
          />
        </div>
      )}

      {transactionsQuery.isPending ? (
        <CardSkeleton className="h-[560px]" />
      ) : transactionsQuery.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load transactions</AlertTitle>
          <AlertDescription>{getApiErrorMessage(transactionsQuery.error, "Try another filter combination.")}</AlertDescription>
        </Alert>
      ) : isFirstTimeEmpty ? (
        <EmptyState
          eyebrow="Transactions"
          title="No transactions yet"
          description="Record your first transaction to start tracking income, expenses, and transfers."
          action={
            <Button onClick={() => dispatchPageAction(pageActionTypes.createTransaction)}>
              <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} />
              Add transaction
            </Button>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={transactions}
          searchValue={searchText}
          onSearchChange={setSearchText}
          searchPlaceholder="Search merchant, note, or location"
          emptyMessage="No transactions to show."
          filters={() => (
            <>
              <DataTableFacetedFilter
                title="Accounts"
                icon={Wallet01Icon}
                options={accountFacetOptions}
                selectedValues={filters.accountIds}
                onSelectedValuesChange={filters.setAccountIds}
                emptyMessage="No accounts found."
              />

              <DataTableFacetedFilter
                title="Categories"
                icon={Tag01Icon}
                options={categoryFacetOptions}
                selectedValues={filters.categoryIds}
                onSelectedValuesChange={filters.setCategoryIds}
                emptyMessage="No categories found."
              />

              <DataTableFacetedFilter
                title="Type"
                icon={TransactionIcon}
                options={transactionTypeFacetOptions}
                selectedValues={filters.transactionTypes}
                onSelectedValuesChange={filters.setTransactionTypes}
                emptyMessage="No transaction types found."
              />

              <DataTableFacetedFilter
                title="Trips"
                icon={Airplane01Icon}
                options={tripFacetOptions}
                selectedValues={filters.tripIds}
                onSelectedValuesChange={filters.setTripIds}
                emptyMessage="No trips found."
              />

              <DataTableRangeFilter
                title="Amount"
                icon={FilterIcon}
                min={0}
                max={maxAvailableAmount}
                value={amountRangeValue}
                onValueChange={handleAmountRangeChange}
                formatValue={formatAmountRangeLabel}
              />

              {hasActiveFilters ? (
                <Button variant="ghost" size="sm" onClick={resetAllFilters}>
                  Reset
                </Button>
              ) : null}
            </>
          )}
        />
      )}

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete transaction</DialogTitle>
            <DialogDescription>This permanently removes the transaction and updates the related balances on the backend.</DialogDescription>
          </DialogHeader>
          {deleteTransaction.isError ? (
            <Alert variant="destructive">
              <AlertTitle>Delete failed</AlertTitle>
              <AlertDescription>{getApiErrorMessage(deleteTransaction.error, "Unable to delete transaction.")}</AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteTransaction.isPending}>
              {deleteTransaction.isPending ? "Deleting" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <LazyTransactionEditorDialog
        open={Boolean(editor)}
        mode={editor?.mode ?? "new"}
        transactionId={editor?.id}
        onOpenChange={(open) => !open && setEditor(null)}
      />
    </div>
  )
}

function MetricCardBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-border bg-background/80 px-2 py-1 font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
      {children}
    </span>
  )
}

function formatTransactionCount(count: number) {
  return `${count} txn${count === 1 ? "" : "s"}`
}
