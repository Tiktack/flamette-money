import * as React from "react"

import { createFileRoute } from "@tanstack/react-router"
import { type ColumnDef } from "@tanstack/react-table"
import {
  AddMoneyCircleIcon,
  Airplane01Icon,
  Delete02Icon,
  Edit01Icon,
  FilterIcon,
  FilterResetIcon,
  MoreHorizontalCircle01Icon,
  Tag01Icon,
  TransactionIcon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { DataTable } from "@/components/data-table"
import {
  DataTableFacetedFilter,
  DataTableRangeFilter,
  type FacetedFilterOption,
} from "@/components/data-table-faceted-filter"
import { LazyTransactionEditorDialog } from "@/components/lazy-transaction-editor-dialog"
import { SharedDateRangeToolbar } from "@/components/shared-date-range-toolbar"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getAccountIconDefinition } from "@/lib/account-icons"
import { useAccounts } from "@/features/accounts/hooks"
import { useCategories } from "@/features/categories/hooks"
import { getApiErrorMessage } from "@/features/shared/errors"
import {
  useDeleteTransaction,
  useTransactionsSearch,
} from "@/features/transactions/hooks"
import { useTrips } from "@/features/trips/hooks"
import type { AccountType } from "@/features/accounts/types"
import type { CategoryHierarchy } from "@/features/categories/types"
import type {
  TransactionListItem,
  TransactionType,
} from "@/features/transactions/types"
import {
  formatCurrency,
  formatDateLabel,
  getCategoryLabel,
  normalizeHexColor,
  toNumber,
  transactionTone,
} from "@/lib/finance"
import {
  resolveSharedDateRange,
  toApiDateString,
  useSharedDateRangeFilters,
} from "@/lib/state/sharedDateRangeFilters"
import { useTransactionsFilters } from "@/lib/state/transactionsFilters"

export const Route = createFileRoute("/_protected/transactions")({
  component: TransactionsPage,
})

const transactionTypeOptions: TransactionType[] = [
  "Expense",
  "Income",
  "Transfer",
  "Refund",
]
const accountTypeMeta: Record<AccountType, { label: string }> = {
  Cash: { label: "Cash" },
  DebitCard: { label: "Debit card" },
  CreditCard: { label: "Credit card" },
  Savings: { label: "Savings" },
}

function TransactionsPage() {
  const accountsQuery = useAccounts()
  const categoriesQuery = useCategories()
  const tripsQuery = useTrips()
  const deleteTransaction = useDeleteTransaction()
  const filters = useTransactionsFilters()
  const dateFilters = useSharedDateRangeFilters()
  const [searchText, setSearchText] = React.useState("")
  const [editor, setEditor] = React.useState<{
    mode: "new" | "edit"
    id?: string
  } | null>(null)
  const [deleteTarget, setDeleteTarget] =
    React.useState<TransactionListItem | null>(null)

  const categories = React.useMemo(
    () => categoriesQuery.data ?? [],
    [categoriesQuery.data]
  )
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
    const map = new Map<
      string,
      {
        name: string
        currency: string
        color: string
        icon: string
        type: AccountType
      }
    >()
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

  const resolvedDateRange = React.useMemo(
    () => resolveSharedDateRange(dateFilters),
    [dateFilters]
  )

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
    } = {}

    if (resolvedDateRange.start) {
      value.StartDate = toApiDateString(resolvedDateRange.start)
    }
    if (resolvedDateRange.end) {
      value.EndDate = toApiDateString(resolvedDateRange.end)
    }
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
    if (searchText.trim()) {
      value.SearchText = searchText.trim()
    }

    return value
  }, [
    filters.accountIds,
    filters.categoryIds,
    filters.tripIds,
    filters.transactionTypes,
    resolvedDateRange.end,
    resolvedDateRange.start,
    searchText,
  ])

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

  const supportingTransactionsQuery = useTransactionsSearch(baseQuery)
  const transactionsQuery = useTransactionsSearch(query)
  const transactions = React.useMemo(
    () => transactionsQuery.data ?? [],
    [transactionsQuery.data]
  )
  const supportingTransactions = React.useMemo(
    () => supportingTransactionsQuery.data ?? transactions,
    [supportingTransactionsQuery.data, transactions]
  )

  const hasActiveFilters =
    filters.accountIds.length > 0 ||
    filters.categoryIds.length > 0 ||
    filters.tripIds.length > 0 ||
    filters.transactionTypes.length > 0 ||
    filters.amountMin != null ||
    filters.amountMax != null ||
    searchText.trim().length > 0

  const accountCounts = React.useMemo(() => {
    const counts = new Map<string, number>()

    for (const transaction of supportingTransactions) {
      counts.set(
        transaction.accountId,
        (counts.get(transaction.accountId) ?? 0) + 1
      )

      if (transaction.targetAccountId) {
        counts.set(
          transaction.targetAccountId,
          (counts.get(transaction.targetAccountId) ?? 0) + 1
        )
      }
    }

    return counts
  }, [supportingTransactions])

  const categoryCounts = React.useMemo(() => {
    const counts = new Map<string, number>()

    for (const transaction of supportingTransactions) {
      if (!transaction.categoryId) {
        continue
      }

      counts.set(
        transaction.categoryId,
        (counts.get(transaction.categoryId) ?? 0) + 1
      )
    }

    return counts
  }, [supportingTransactions])

  const transactionTypeCounts = React.useMemo(() => {
    const counts = new Map<string, number>()

    for (const transaction of supportingTransactions) {
      counts.set(transaction.type, (counts.get(transaction.type) ?? 0) + 1)
    }

    return counts
  }, [supportingTransactions])

  const tripCounts = React.useMemo(() => {
    const counts = new Map<string, number>()

    for (const transaction of supportingTransactions) {
      if (!transaction.tripId) {
        continue
      }

      counts.set(transaction.tripId, (counts.get(transaction.tripId) ?? 0) + 1)
    }

    return counts
  }, [supportingTransactions])

  const maxAvailableAmount = React.useMemo(() => {
    let maxAmount = 0

    for (const transaction of supportingTransactions) {
      maxAmount = Math.max(maxAmount, toNumber(transaction.amount))
    }

    return maxAmount
  }, [supportingTransactions])

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
        icon: Tag01Icon,
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
        icon:
          type === "Income"
            ? AddMoneyCircleIcon
            : type === "Transfer"
              ? TransactionIcon
              : type === "Refund"
                ? FilterResetIcon
                : Tag01Icon,
        color:
          type === "Income"
            ? "#059669"
            : type === "Transfer"
              ? "#d97706"
              : type === "Refund"
                ? "#2563eb"
                : "#dc2626",
      })),
    [transactionTypeCounts]
  )

  const resultCurrencies = React.useMemo(() => {
    const values = new Set<string>()

    for (const transaction of transactions) {
      const currency =
        transaction.currency ??
        accountMap.get(transaction.accountId)?.currency ??
        "USD"
      values.add(currency.toUpperCase())
    }

    return Array.from(values)
  }, [accountMap, transactions])

  const summaryCurrency =
    resultCurrencies.length === 1 ? resultCurrencies[0] : null
  const incomeTotal = transactions
    .filter((transaction) => transaction.type === "Income")
    .reduce((sum, transaction) => sum + toNumber(transaction.amount), 0)
  const expenseTotal = transactions
    .filter((transaction) => transaction.type === "Expense")
    .reduce((sum, transaction) => sum + toNumber(transaction.amount), 0)
  const formatAmountRangeLabel = React.useCallback(
    (value: number) =>
      summaryCurrency
        ? formatCurrency(value, summaryCurrency)
        : new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(
            value
          ),
    [summaryCurrency]
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
                <HugeiconsIcon
                  icon={iconDefinition.icon}
                  strokeWidth={2}
                  className="size-5"
                />
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">
                  {account?.name ?? "Account"}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {transaction.type}
                </p>
              </div>
            </div>
          )
        },
      },
      {
        accessorKey: "categoryId",
        header: "Category",
        cell: ({ row }) => (
          <span className="text-sm text-foreground">
            {getCategoryLabel(row.original, categoryMap)}
          </span>
        ),
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
            <div
              className={`text-right font-medium ${transactionTone(transaction.type, transaction.isRefund)}`}
            >
              {formatCurrency(
                transaction.amount,
                transaction.currency ?? account?.currency ?? "USD"
              )}
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
          const summary =
            transaction.note ||
            transaction.merchantName ||
            transaction.location ||
            "-"
          const secondary = [transaction.merchantName, transaction.location]
            .filter((value) => value && value !== summary)
            .join(" • ")

          return (
            <div className="max-w-[320px] min-w-0">
              <p className="truncate text-foreground">{summary}</p>
              {secondary ? (
                <p className="truncate text-sm text-muted-foreground">
                  {secondary}
                </p>
              ) : null}
            </div>
          )
        },
      },
      {
        accessorKey: "date",
        header: "Date",
        cell: ({ row }) => {
          const transaction = row.original
          const itemCount = toNumber(transaction.itemCount)

          return (
            <div>
              <p className="text-foreground">
                {formatDateLabel(transaction.date)}
              </p>
              {itemCount > 0 ? (
                <p className="text-sm text-muted-foreground">
                  {itemCount} items
                </p>
              ) : null}
            </div>
          )
        },
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
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setEditor({ mode: "edit", id: transaction.id })}
              >
                <HugeiconsIcon icon={Edit01Icon} strokeWidth={2} />
                <span className="sr-only">Edit transaction</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground data-open:bg-muted"
                    />
                  }
                >
                  <HugeiconsIcon
                    icon={MoreHorizontalCircle01Icon}
                    strokeWidth={2}
                  />
                  <span className="sr-only">More actions</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setDeleteTarget(transaction)}
                  >
                    <HugeiconsIcon
                      icon={Delete02Icon}
                      strokeWidth={2}
                      className="text-destructive"
                    />
                    <span>Delete transaction</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() =>
                      setEditor({ mode: "edit", id: transaction.id })
                    }
                  >
                    <HugeiconsIcon
                      icon={Edit01Icon}
                      strokeWidth={2}
                      className="text-muted-foreground"
                    />
                    <span>Edit transaction</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      },
    ],
    [accountMap, categoryMap]
  )

  const resetAllFilters = () => {
    filters.resetFilters()
    setSearchText("")
  }

  const handleAmountRangeChange = (value: [number, number]) => {
    const [nextMin, nextMax] = value
    const normalizedMax = Math.max(nextMin, nextMax)

    filters.setAmountMin(nextMin <= 0 ? null : nextMin)
    filters.setAmountMax(
      normalizedMax >= maxAvailableAmount ? null : normalizedMax
    )
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

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-3">
        {transactionsQuery.isPending ? (
          <>
            <div className="h-[120px] animate-pulse rounded-[1.5rem] bg-muted" />
            <div className="h-[120px] animate-pulse rounded-[1.5rem] bg-muted" />
            <div className="h-[120px] animate-pulse rounded-[1.5rem] bg-muted" />
          </>
        ) : (
          <>
            <MetricCard
              label="Results"
              value={String(transactions.length)}
              helper="Transactions matching the active filters"
            />
            <MetricCard
              label="Income"
              value={
                summaryCurrency
                  ? formatCurrency(incomeTotal, summaryCurrency)
                  : "Mixed"
              }
              helper={
                summaryCurrency
                  ? "Gross income in the filtered result set"
                  : `${resultCurrencies.length || 0} currencies in the filtered result set`
              }
            />
            <MetricCard
              label="Expense"
              value={
                summaryCurrency
                  ? formatCurrency(expenseTotal, summaryCurrency)
                  : "Mixed"
              }
              helper={
                summaryCurrency
                  ? "Gross expense in the filtered result set"
                  : `${resultCurrencies.length || 0} currencies in the filtered result set`
              }
            />
          </>
        )}
      </div>

      <SharedDateRangeToolbar />

      {transactionsQuery.isPending ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="h-9 w-[240px] animate-pulse rounded-lg bg-muted" />
            <div className="h-8 w-[124px] animate-pulse rounded-lg bg-muted" />
            <div className="h-8 w-[124px] animate-pulse rounded-lg bg-muted" />
            <div className="h-8 w-[124px] animate-pulse rounded-lg bg-muted" />
          </div>
          <div className="h-[560px] animate-pulse rounded-[1.75rem] bg-muted" />
        </div>
      ) : transactionsQuery.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load transactions</AlertTitle>
          <AlertDescription>
            {getApiErrorMessage(
              transactionsQuery.error,
              "Try another filter combination."
            )}
          </AlertDescription>
        </Alert>
      ) : (
        <DataTable
          columns={columns}
          data={transactions}
          searchValue={searchText}
          onSearchChange={setSearchText}
          searchPlaceholder="Search merchant, note, or location"
          emptyMessage="No transactions to show."
          pageSizeOptions={[12, 24, 48]}
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

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete transaction</DialogTitle>
            <DialogDescription>
              This permanently removes the transaction and updates the related
              balances on the backend.
            </DialogDescription>
          </DialogHeader>
          {deleteTransaction.isError ? (
            <Alert variant="destructive">
              <AlertTitle>Delete failed</AlertTitle>
              <AlertDescription>
                {getApiErrorMessage(
                  deleteTransaction.error,
                  "Unable to delete transaction."
                )}
              </AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteTransaction.isPending}
            >
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

function MetricCard({
  label,
  value,
  helper,
}: {
  label: string
  value: string
  helper: string
}) {
  return (
    <Card
      size="sm"
      className="border-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),transparent),linear-gradient(135deg,rgba(255,255,255,0.02),rgba(255,255,255,0))] shadow-sm"
    >
      <CardHeader className="px-4 pb-1">
        <CardTitle className="text-sm font-medium tracking-tight text-muted-foreground">
          {label}
        </CardTitle>
        <CardDescription className="text-xs leading-5">
          {helper}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 pt-0">
        <p className="text-[2rem] leading-none font-semibold tracking-tight break-words text-foreground tabular-nums">
          {value}
        </p>
      </CardContent>
    </Card>
  )
}
