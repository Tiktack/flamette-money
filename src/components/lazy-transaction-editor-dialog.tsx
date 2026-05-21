import * as React from "react"

import { Dialog, DialogContent } from "@/components/ui/dialog"

import type { TransactionEditorDialogProps } from "@/components/transaction-editor-dialog"

const TransactionEditorDialog = React.lazy(() =>
  import("@/components/transaction-editor-dialog").then((module) => ({
    default: module.TransactionEditorDialog,
  }))
)

export function LazyTransactionEditorDialog(props: TransactionEditorDialogProps) {
  if (!props.open) {
    return null
  }

  return (
    <React.Suspense
      fallback={
        <Dialog open={props.open} onOpenChange={props.onOpenChange}>
          <DialogContent className="sm:max-w-4xl">
            <div className="h-32 animate-pulse rounded-2xl bg-muted" />
          </DialogContent>
        </Dialog>
      }
    >
      <TransactionEditorDialog {...props} />
    </React.Suspense>
  )
}
