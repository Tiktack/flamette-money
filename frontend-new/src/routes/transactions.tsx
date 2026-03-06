import * as React from "react"

import { createFileRoute } from "@tanstack/react-router"

import { EmptyState } from "@/components/empty-state"
import { PageHeader } from "@/components/page-header"
import { SharedDateRangeToolbar } from "@/components/shared-date-range-toolbar"
import { TransactionEditorDialog } from "@/components/transaction-editor-dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getApiErrorMessage } from "@/lib/api/errors"
import { useAccounts, useCategories, useDeleteTransaction, useTransactionsSearch } from "@/lib/api/hooks"
import type { CategoryHierarchy, TransactionListItem, TransactionType } from "@/lib/api/types"
import { formatCurrency, formatDateLabel, getCategoryLabel, normalizeHexColor, toNumber, transactionTone } from "@/lib/finance"
import { resolveSharedDateRange, useSharedDateRangeFilters } from "@/lib/state/sharedDateRangeFilters"
import { useTransactionsFilters } from "@/lib/state/transactionsFilters"

export const Route = createFileRoute("/transactions")({
  component: TransactionsPage,
})

function TransactionsPage() {
  const accountsQuery = useAccounts()
  const categoriesQuery = useCategories()
  const deleteTransaction = useDeleteTransaction()
  const filters = useTransactionsFilters()
  const dateFilters = useSharedDateRangeFilters()
  const [filterOpen, setFilterOpen] = React.useState(false)
  const [page, setPage] = React.useState(1)
  const [searchText, setSearchText] = React.useState("")
  const [editor, setEditor] = React.useState<{ mode: "new" | "edit"; id?: string } | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<TransactionListItem | null>(null)
  const pageSize = 12

  const categories = categoriesQuery.data ?? []
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
    const map = new Map<string, { name: string; currency: string; color: string }>()
    for (const account of accountsQuery.data ?? []) {
      map.set(account.id, {
        name: account.name,
        currency: account.currency,
        color: normalizeHexColor(account.color),
      })
    }
    return map
  }, [accountsQuery.data])

  const resolvedDateRange = React.useMemo(() => resolveSharedDateRange(dateFilters), [dateFilters])

  const query = React.useMemo(() => {
    const value: {
      StartDate?: string
      EndDate?: string
      AccountIds?: string[]
      CategoryIds?: string[]
      Types?: TransactionType[]
      SearchText?: string
      MinAmount?: number
      MaxAmount?: number
    } = {}

    if (resolvedDateRange.start) {
      value.StartDate = resolvedDateRange.start.toISOString()
    }
    if (resolvedDateRange.end) {
      value.EndDate = resolvedDateRange.end.toISOString()
    }
    if (filters.accountIds.length) {
      value.AccountIds = filters.accountIds
    }
    if (filters.categoryIds.length) {
      value.CategoryIds = filters.categoryIds
    }
    if (filters.transactionTypes.length) {
      value.Types = filters.transactionTypes as TransactionType[]
    }
    if (searchText.trim()) {
      value.SearchText = searchText.trim()
    }
    if (filters.amountMin != null) {
      value.MinAmount = filters.amountMin
    }
    if (filters.amountMax != null) {
      value.MaxAmount = filters.amountMax
    }

    return value
  }, [filters.accountIds, filters.amountMax, filters.amountMin, filters.categoryIds, filters.transactionTypes, resolvedDateRange.end, resolvedDateRange.start, searchText])

  const transactionsQuery = useTransactionsSearch(query)
  const transactions = transactionsQuery.data ?? []
  const pagedTransactions = React.useMemo(() => transactions.slice((page - 1) * pageSize, page * pageSize), [page, pageSize, transactions])
  const pageCount = Math.max(1, Math.ceil(transactions.length / pageSize))

  React.useEffect(() => {
    setPage(1)
  }, [query])

  const hasActiveFilters =
    filters.accountIds.length > 0 ||
    filters.categoryIds.length > 0 ||
    filters.transactionTypes.length > 0 ||
    filters.amountMin != null ||
    filters.amountMax != null ||
    searchText.trim().length > 0

  const incomeTotal = transactions.filter((transaction) => transaction.type === "Income").reduce((sum, transaction) => sum + toNumber(transaction.amount), 0)
  const expenseTotal = transactions.filter((transaction) => transaction.type === "Expense").reduce((sum, transaction) => sum + toNumber(transaction.amount), 0)

  const toggleListValue = (current: string[], value: string) =>
    current.includes(value) ? current.filter((item) => item !== value) : [...current, value]

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
      <PageHeader
        title="Transactions"
        description="Filter the ledger by account, category, type, amount, and date range, then create or refine transactions with the full editor."
        actions={
          <>
            <Button variant={hasActiveFilters ? "default" : "outline"} onClick={() => setFilterOpen(true)}>
              Filters
            </Button>
            <Button onClick={() => setEditor({ mode: "new" })}>New transaction</Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Results" value={String(transactions.length)} helper="Transactions matching the active filters" />
        <MetricCard label="Income" value={formatCurrency(incomeTotal, "USD")} helper="Gross income in the filtered result set" />
        <MetricCard label="Expense" value={formatCurrency(expenseTotal, "USD")} helper="Gross expense in the filtered result set" />
      </div>

      <SharedDateRangeToolbar />

      <Card className="border-border/60 bg-card/80 shadow-sm">
        <CardContent className="grid gap-4 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="w-full max-w-lg">
              <Input placeholder="Search merchant, note, or location" value={searchText} onChange={(event) => setSearchText(event.target.value)} />
            </div>
            {hasActiveFilters ? (
              <div className="flex flex-wrap gap-2">
                {filters.accountIds.map((accountId) => (
                  <Badge key={accountId} variant="secondary">{accountMap.get(accountId)?.name ?? "Account"}</Badge>
                ))}
                {filters.categoryIds.map((categoryId) => (
                  <Badge key={categoryId} variant="secondary">{categoryMap.get(categoryId)?.name ?? "Category"}</Badge>
                ))}
                {filters.transactionTypes.map((type) => (
                  <Badge key={type} variant="secondary">{type}</Badge>
                ))}
              </div>
            ) : null}
          </div>

          {transactionsQuery.isPending ? (
            <div className="h-64 animate-pulse rounded-[1.75rem] bg-muted" />
          ) : transactionsQuery.isError ? (
            <Alert variant="destructive">
              <AlertTitle>Unable to load transactions</AlertTitle>
              <AlertDescription>{getApiErrorMessage(transactionsQuery.error, "Try another filter combination.")}</AlertDescription>
            </Alert>
          ) : transactions.length === 0 ? (
            <EmptyState
              eyebrow="Transactions"
              title="No transactions matched the current filters"
              description="Adjust the date range or remove some filters to broaden the ledger query."
              action={<Button onClick={() => setEditor({ mode: "new" })}>Create transaction</Button>}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Note</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedTransactions.map((transaction) => {
                      const account = accountMap.get(transaction.accountId)
                      return (
                        <TableRow key={transaction.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="size-10 rounded-2xl" style={{ backgroundColor: account?.color ?? "#B9A88A" }} />
                              <div>
                                <p className="font-medium text-foreground">{account?.name ?? "Account"}</p>
                                <p className="text-sm text-muted-foreground">{transaction.type}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{getCategoryLabel(transaction, categoryMap)}</TableCell>
                          <TableCell>
                            <span className={`font-medium ${transactionTone(transaction.type, transaction.isRefund)}`}>
                              {formatCurrency(transaction.amount, account?.currency ?? "USD")}
                            </span>
                          </TableCell>
                          <TableCell className="max-w-[320px] truncate text-muted-foreground">{transaction.note || transaction.merchantName || transaction.location || "-"}</TableCell>
                          <TableCell>{formatDateLabel(transaction.date)}</TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => setEditor({ mode: "edit", id: transaction.id })}>Edit</Button>
                              <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(transaction)}>Delete</Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between gap-4 border-t border-border/60 pt-4">
                <p className="text-sm text-muted-foreground">Page {page} of {pageCount}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}>Previous</Button>
                  <Button variant="outline" size="sm" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={page === pageCount}>Next</Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Ledger filters</DialogTitle>
            <DialogDescription>Refine the search by accounts, categories, types, and amount bounds.</DialogDescription>
          </DialogHeader>
          <FieldGroup className="grid gap-6 md:grid-cols-2">
            <Field>
              <FieldLabel>Accounts</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {(accountsQuery.data ?? []).map((account) => (
                  <Button key={account.id} type="button" variant={filters.accountIds.includes(account.id) ? "default" : "outline"} onClick={() => filters.setAccountIds(toggleListValue(filters.accountIds, account.id))}>
                    {account.name}
                  </Button>
                ))}
              </div>
            </Field>
            <Field>
              <FieldLabel>Categories</FieldLabel>
              <div className="flex max-h-44 flex-wrap gap-2 overflow-y-auto">
                {categories.map((category) => (
                  <Button key={category.id} type="button" variant={filters.categoryIds.includes(category.id) ? "default" : "outline"} onClick={() => filters.setCategoryIds(toggleListValue(filters.categoryIds, category.id))}>
                    {category.name}
                  </Button>
                ))}
              </div>
            </Field>
            <Field>
              <FieldLabel>Transaction types</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {(["Expense", "Income", "Transfer", "Refund"] as const).map((type) => (
                  <Button key={type} type="button" variant={filters.transactionTypes.includes(type) ? "default" : "outline"} onClick={() => filters.setTransactionTypes(toggleListValue(filters.transactionTypes, type))}>
                    {type}
                  </Button>
                ))}
              </div>
            </Field>
            <FieldGroup className="grid gap-4 md:grid-cols-2">
              <Field>
                <FieldLabel>Min amount</FieldLabel>
                <Input type="number" min={0} value={filters.amountMin ?? ""} onChange={(event) => filters.setAmountMin(event.target.value === "" ? null : Number(event.target.value))} />
              </Field>
              <Field>
                <FieldLabel>Max amount</FieldLabel>
                <Input type="number" min={0} value={filters.amountMax ?? ""} onChange={(event) => filters.setAmountMax(event.target.value === "" ? null : Number(event.target.value))} />
              </Field>
            </FieldGroup>
          </FieldGroup>
          <DialogFooter>
            <Button variant="outline" onClick={filters.resetFilters}>Reset</Button>
            <Button onClick={() => setFilterOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteTransaction.isPending}>{deleteTransaction.isPending ? "Deleting" : "Delete"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TransactionEditorDialog open={Boolean(editor)} mode={editor?.mode ?? "new"} transactionId={editor?.id} onOpenChange={(open) => !open && setEditor(null)} />
    </div>
  )
}

function MetricCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <Card className="border-border/60 bg-card/80 shadow-sm">
      <CardContent className="space-y-2 p-5">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold tracking-tight text-foreground">{value}</p>
        <p className="text-xs leading-5 text-muted-foreground">{helper}</p>
      </CardContent>
    </Card>
  )
}