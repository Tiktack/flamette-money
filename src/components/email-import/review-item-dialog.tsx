import * as React from "react"

import { Loading03Icon, RefreshIcon, Tick01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { useDismissEmailImportItem, useEmailImportItem, useReparseEmailImportItems, useRestoreEmailImportItem } from "@/features/email-import/hooks"
import type { EmailImportItemDetail } from "@/features/email-import/types"
import { getApiErrorMessage } from "@/features/shared/errors"
import { formatCurrency, formatDateLabel } from "@/lib/finance"

import { statusBadge } from "./status-badge"

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground">{value ?? "—"}</span>
    </div>
  )
}

export function ReviewItemDialog({
  itemId,
  onOpenChange,
  onApprove,
}: {
  itemId: string | null
  onOpenChange: (open: boolean) => void
  onApprove: (item: EmailImportItemDetail) => void
}) {
  const itemQuery = useEmailImportItem(itemId ?? undefined)
  const dismissItem = useDismissEmailImportItem()
  const restoreItem = useRestoreEmailImportItem()
  const reparseItems = useReparseEmailImportItems()
  const [actionError, setActionError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (itemId) {
      setActionError(null)
    }
  }, [itemId])

  const item = itemQuery.data
  const parsed = item?.parsed ?? null

  const runAction = async (action: () => Promise<unknown>, closeAfter = true) => {
    setActionError(null)
    try {
      await action()
      if (closeAfter) {
        onOpenChange(false)
      }
    } catch (error) {
      setActionError(getApiErrorMessage(error, "The action failed."))
    }
  }

  const busy = dismissItem.isPending || restoreItem.isPending || reparseItems.isPending

  return (
    <Dialog open={Boolean(itemId)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Imported email
            {item ? statusBadge(item.status) : null}
          </DialogTitle>
          <DialogDescription>{item ? `${item.connectionName} · ${item.fromAddress ?? "unknown sender"}` : "Loading…"}</DialogDescription>
        </DialogHeader>

        {itemQuery.isPending ? (
          <div className="flex items-center justify-center py-10">
            <HugeiconsIcon icon={Loading03Icon} strokeWidth={2} className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : itemQuery.isError ? (
          <Alert variant="destructive">
            <AlertTitle>Unable to load the email</AlertTitle>
            <AlertDescription>{getApiErrorMessage(itemQuery.error, "Try again in a moment.")}</AlertDescription>
          </Alert>
        ) : item ? (
          <div className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailRow label="Subject" value={item.subject} />
              <DetailRow label="Received" value={item.emailDate ? formatDateLabel(item.emailDate) : null} />
            </div>

            {parsed ? (
              <>
                <Separator />
                <div className="grid gap-3 sm:grid-cols-3">
                  <DetailRow
                    label="Direction"
                    value={<Badge variant={parsed.direction === "income" ? "secondary" : "outline"}>{parsed.direction === "income" ? "Income" : "Expense"}</Badge>}
                  />
                  <DetailRow label="Amount" value={<span className="font-medium tabular-nums">{formatCurrency(parsed.amount, parsed.currency)}</span>} />
                  <DetailRow label="Booked" value={parsed.bookedAt ? formatDateLabel(parsed.bookedAt) : null} />
                  <DetailRow label="Merchant" value={parsed.merchant} />
                  <DetailRow label="Account hint" value={parsed.accountHint} />
                  <DetailRow
                    label="Balance after"
                    value={parsed.balanceAfter != null ? <span className="tabular-nums">{formatCurrency(parsed.balanceAfter, parsed.currency)}</span> : null}
                  />
                </div>
                {parsed.description ? <DetailRow label="Description" value={parsed.description} /> : null}
                {item.matchedRuleName ? <DetailRow label="Matched rule" value={item.matchedRuleName} /> : null}
              </>
            ) : null}

            {item.parseError && item.status === "unparsed" ? (
              <Alert>
                <AlertTitle>Not recognized yet</AlertTitle>
                <AlertDescription>
                  {item.parseError} Once the parser is updated for this email format, use Re-parse to process it again.
                </AlertDescription>
              </Alert>
            ) : null}

            {item.error ? (
              <Alert variant="destructive">
                <AlertTitle>Automatic import failed</AlertTitle>
                <AlertDescription>{item.error}</AlertDescription>
              </Alert>
            ) : null}

            {item.status === "imported" && !item.transactionId ? (
              <Alert>
                <AlertTitle>Transaction deleted</AlertTitle>
                <AlertDescription>The transaction created from this email was deleted later.</AlertDescription>
              </Alert>
            ) : null}

            {item.rawText ? (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-muted-foreground">Raw email text</span>
                <pre className="max-h-72 overflow-y-auto rounded-xl border border-border/60 bg-muted/20 p-3 font-mono text-xs whitespace-pre-wrap text-muted-foreground">
                  {item.rawText}
                </pre>
              </div>
            ) : null}

            {actionError ? (
              <Alert variant="destructive">
                <AlertTitle>Action failed</AlertTitle>
                <AlertDescription>{actionError}</AlertDescription>
              </Alert>
            ) : null}
          </div>
        ) : null}

        {item ? (
          <DialogFooter className="flex-wrap">
            {item.status === "dismissed" || item.status === "ignored" ? (
              <Button variant="outline" disabled={busy} onClick={() => runAction(() => restoreItem.mutateAsync(item.id))}>
                Restore to inbox
              </Button>
            ) : null}

            {item.status === "unparsed" || item.status === "pending" || item.status === "error" ? (
              <>
                <Button variant="outline" disabled={busy} onClick={() => runAction(() => reparseItems.mutateAsync({ ids: [item.id] }), false)}>
                  <HugeiconsIcon
                    icon={reparseItems.isPending ? Loading03Icon : RefreshIcon}
                    strokeWidth={2}
                    data-icon="inline-start"
                    className={reparseItems.isPending ? "animate-spin" : undefined}
                  />
                  Re-parse
                </Button>
                <Button variant="outline" disabled={busy} onClick={() => runAction(() => dismissItem.mutateAsync(item.id))}>
                  Dismiss
                </Button>
                <Button disabled={busy} onClick={() => onApprove(item)}>
                  <HugeiconsIcon icon={Tick01Icon} strokeWidth={2} data-icon="inline-start" />
                  {parsed ? "Approve…" : "Create manually…"}
                </Button>
              </>
            ) : null}
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
