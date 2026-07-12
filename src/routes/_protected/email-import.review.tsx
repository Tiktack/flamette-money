import * as React from "react"

import { FilterIcon, Mail01Icon, RefreshIcon, ViewIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { createFileRoute } from "@tanstack/react-router"
import { type ColumnDef } from "@tanstack/react-table"

import { ReviewItemDialog } from "@/components/email-import/review-item-dialog"
import { statusBadge, statusLabels } from "@/components/email-import/status-badge"
import { DataTable } from "@/components/data-table"
import { DataTableFacetedFilter, type FacetedFilterOption } from "@/components/data-table-faceted-filter"
import { EmptyState } from "@/components/empty-state"
import { LazyTransactionEditorDialog } from "@/components/lazy-transaction-editor-dialog"
import { CardSkeleton } from "@/components/page-skeletons"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import type { TransactionEditorDraft } from "@/components/transaction-editor-dialog"
import { useAccounts } from "@/features/accounts/hooks"
import { matchAccountIdByBankHint } from "@/features/email-import/account-hint"
import { useApproveEmailImportItem, useEmailConnections, useEmailImportItems, useEmailImportRules, useReparseEmailImportItems } from "@/features/email-import/hooks"
import { emailImportItemStatusOptions, type EmailImportItemDetail, type EmailImportItemListItem, type EmailImportItemStatus } from "@/features/email-import/types"
import { getApiErrorMessage } from "@/features/shared/errors"
import { formatCurrency, formatDateInput, formatDateLabel } from "@/lib/finance"

const DEFAULT_STATUSES: EmailImportItemStatus[] = ["pending", "unparsed", "error"]

export const Route = createFileRoute("/_protected/email-import/review")({
  head: () => ({ meta: [{ title: "Review inbox — Flamette Money" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    connection: typeof search.connection === "string" ? search.connection : undefined,
  }),
  component: EmailImportReviewPage,
})

function EmailImportReviewPage() {
  const search = Route.useSearch()
  const connectionsQuery = useEmailConnections()
  const rulesQuery = useEmailImportRules()
  const accountsQuery = useAccounts()
  const approveItem = useApproveEmailImportItem()
  const reparseItems = useReparseEmailImportItems()
  const [statuses, setStatuses] = React.useState<string[]>(DEFAULT_STATUSES)
  const [connectionIds, setConnectionIds] = React.useState<string[]>(search.connection ? [search.connection] : [])
  const [detailItemId, setDetailItemId] = React.useState<string | null>(null)
  const [approveTarget, setApproveTarget] = React.useState<{ itemId: string; draft: TransactionEditorDraft } | null>(null)
  const [reparseMessage, setReparseMessage] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (search.connection) {
      setConnectionIds([search.connection])
    }
  }, [search.connection])

  const itemsQuery = useEmailImportItems({
    statuses: statuses.length > 0 ? (statuses as EmailImportItemStatus[]) : undefined,
    connectionId: connectionIds.length === 1 ? connectionIds[0] : undefined,
    limit: 200,
  })

  const connections = React.useMemo(() => connectionsQuery.data?.connections ?? [], [connectionsQuery.data?.connections])
  const rules = React.useMemo(() => rulesQuery.data ?? [], [rulesQuery.data])

  const items = React.useMemo(() => {
    const loaded = itemsQuery.data?.items ?? []
    if (connectionIds.length <= 1) {
      return loaded
    }
    return loaded.filter((item) => connectionIds.includes(item.connectionId))
  }, [connectionIds, itemsQuery.data?.items])

  const statusFacetOptions = React.useMemo<FacetedFilterOption[]>(
    () => emailImportItemStatusOptions.map((status) => ({ label: statusLabels[status], value: status })),
    []
  )

  const connectionFacetOptions = React.useMemo<FacetedFilterOption[]>(
    () => connections.map((connection) => ({ label: connection.name, value: connection.id, icon: Mail01Icon })),
    [connections]
  )

  const buildDraft = React.useCallback(
    (item: EmailImportItemDetail | EmailImportItemListItem): TransactionEditorDraft => {
      const rule = item.matchedRuleId ? rules.find((candidate) => candidate.id === item.matchedRuleId) : undefined
      const assign = rule?.action.type === "assign" ? rule.action : null
      const connection = connections.find((candidate) => candidate.id === item.connectionId)
      const parsed = item.parsed

      return {
        // Fall back to the email's local calendar date (formatDateInput), matching the
        // server auto-create path — not a UTC slice, which can land on the previous day.
        date: parsed?.bookedAt ?? (item.emailDate ? formatDateInput(new Date(item.emailDate)) : null),
        type: parsed ? (parsed.direction === "income" ? "Income" : "Expense") : undefined,
        amount: parsed?.amount ?? null,
        currency: parsed?.currency ?? null,
        // Same resolution order as the server: rule → account matched by bank number → connection default.
        accountId: assign?.accountId ?? matchAccountIdByBankHint(parsed?.accountHint, accountsQuery.data ?? []) ?? connection?.defaultAccountId ?? null,
        categoryId: assign?.categoryId ?? null,
        subCategoryId: assign?.subCategoryId ?? null,
        merchantName: parsed?.merchant ?? parsed?.description ?? null,
        location: parsed?.location ?? null,
        note: assign?.note ?? (parsed ? null : item.subject),
      }
    },
    [accountsQuery.data, connections, rules]
  )

  const handleApprove = React.useCallback(
    (item: EmailImportItemDetail) => {
      setDetailItemId(null)
      setApproveTarget({ itemId: item.id, draft: buildDraft(item) })
    },
    [buildDraft]
  )

  const handleReparse = async () => {
    setReparseMessage(null)
    try {
      const result = await reparseItems.mutateAsync({
        connectionId: connectionIds.length === 1 ? connectionIds[0] : undefined,
      })
      setReparseMessage(
        result.fetched === 0
          ? "Nothing to re-parse."
          : `Re-parsed ${result.fetched}: ${result.imported} imported, ${result.pending} to review, ${result.unparsed} still unparsed.`
      )
    } catch (error) {
      setReparseMessage(getApiErrorMessage(error, "Re-parse failed."))
    }
  }

  const columns = React.useMemo<ColumnDef<EmailImportItemListItem>[]>(
    () => [
      {
        accessorKey: "emailDate",
        header: "Received",
        cell: ({ row }) => {
          const item = row.original
          return <span className="text-sm whitespace-nowrap text-foreground">{item.emailDate ? formatDateLabel(item.emailDate) : "—"}</span>
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        enableHiding: false,
        cell: ({ row }) => statusBadge(row.original.status),
      },
      {
        accessorFn: (row) => row.parsed?.merchant ?? row.parsed?.description ?? row.subject ?? "",
        id: "email",
        header: "Email",
        enableHiding: false,
        cell: ({ row }) => {
          const item = row.original
          const primary = item.parsed?.merchant ?? item.parsed?.description ?? item.subject ?? "(no subject)"
          const secondary = item.parsed ? item.subject : item.excerpt

          return (
            <div className="max-w-[360px] min-w-0">
              <p className="truncate text-foreground">{primary}</p>
              {secondary && secondary !== primary ? <p className="truncate text-sm text-muted-foreground">{secondary}</p> : null}
            </div>
          )
        },
      },
      {
        accessorFn: (row) => row.parsed?.amount ?? 0,
        id: "amount",
        header: () => <div className="text-right">Amount</div>,
        cell: ({ row }) => {
          const parsed = row.original.parsed
          if (!parsed) {
            return <div className="text-right text-sm text-muted-foreground">—</div>
          }

          return (
            <div className={`text-right font-medium tabular-nums ${parsed.direction === "income" ? "text-emerald-600 dark:text-emerald-400" : ""}`}>
              {parsed.direction === "income" ? "+" : ""}
              {formatCurrency(parsed.amount, parsed.currency)}
            </div>
          )
        },
      },
      {
        accessorKey: "connectionName",
        header: "Connection",
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.connectionName}</span>,
      },
      {
        accessorKey: "matchedRuleName",
        header: "Rule",
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.matchedRuleName ?? "—"}</span>,
      },
      {
        id: "actions",
        enableSorting: false,
        enableHiding: false,
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button variant="ghost" size="icon-sm" onClick={() => setDetailItemId(row.original.id)}>
              <HugeiconsIcon icon={ViewIcon} strokeWidth={2} />
              <span className="sr-only">View email</span>
            </Button>
          </div>
        ),
      },
    ],
    []
  )

  const hasCustomFilters = statuses.length !== DEFAULT_STATUSES.length || connectionIds.length > 0
  const isFirstTimeEmpty = items.length === 0 && !hasCustomFilters && !itemsQuery.isPending

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Review inbox</h1>
          <p className="text-sm text-muted-foreground">
            Emails that couldn't be imported automatically wait here — approve them into transactions, dismiss them, or re-parse after improving the
            parser or rules.
          </p>
        </div>
        {reparseMessage ? <p className="text-sm text-muted-foreground">{reparseMessage}</p> : null}
      </div>

      {itemsQuery.isPending ? (
        <CardSkeleton className="h-[480px]" />
      ) : itemsQuery.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load the review inbox</AlertTitle>
          <AlertDescription>{getApiErrorMessage(itemsQuery.error, "Try again in a moment.")}</AlertDescription>
        </Alert>
      ) : isFirstTimeEmpty ? (
        <EmptyState
          eyebrow="Review inbox"
          title="Nothing to review"
          description="New bank emails appear here when they need attention. Fully matched emails skip the inbox and become transactions automatically."
        />
      ) : (
        <DataTable
          columns={columns}
          data={items}
          emptyMessage="No emails match the current filters."
          filters={() => (
            <>
              <DataTableFacetedFilter
                title="Status"
                icon={FilterIcon}
                options={statusFacetOptions}
                selectedValues={statuses}
                onSelectedValuesChange={setStatuses}
                emptyMessage="No statuses."
              />
              <DataTableFacetedFilter
                title="Connection"
                icon={Mail01Icon}
                options={connectionFacetOptions}
                selectedValues={connectionIds}
                onSelectedValuesChange={setConnectionIds}
                emptyMessage="No connections."
              />
              {hasCustomFilters ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStatuses(DEFAULT_STATUSES)
                    setConnectionIds([])
                  }}
                >
                  Reset
                </Button>
              ) : null}
            </>
          )}
          action={
            <Button variant="outline" size="sm" onClick={handleReparse} disabled={reparseItems.isPending}>
              <HugeiconsIcon icon={RefreshIcon} strokeWidth={2} data-icon="inline-start" className={reparseItems.isPending ? "animate-spin" : undefined} />
              {reparseItems.isPending ? "Re-parsing" : "Re-parse"}
            </Button>
          }
        />
      )}

      <ReviewItemDialog itemId={detailItemId} onOpenChange={(open) => !open && setDetailItemId(null)} onApprove={handleApprove} />

      <LazyTransactionEditorDialog
        open={Boolean(approveTarget)}
        mode="new"
        onOpenChange={(open) => !open && setApproveTarget(null)}
        initialDraft={approveTarget?.draft}
        submitNewOverride={async (request) => {
          if (!approveTarget) {
            return
          }
          // Create the transaction and mark the review item imported in one atomic call.
          await approveItem.mutateAsync({ id: approveTarget.itemId, request })
        }}
      />
    </div>
  )
}
