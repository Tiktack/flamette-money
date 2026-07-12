import * as React from "react"

import { PlusSignIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { createFileRoute } from "@tanstack/react-router"

import { ConnectionCard } from "@/components/email-import/connection-card"
import { ConnectionEditorDialog } from "@/components/email-import/connection-editor-dialog"
import { EmptyState } from "@/components/empty-state"
import { CardSkeleton } from "@/components/page-skeletons"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useDeleteEmailConnection, useEmailConnections } from "@/features/email-import/hooks"
import type { EmailConnectionSummary } from "@/features/email-import/types"
import { getApiErrorMessage } from "@/features/shared/errors"

export const Route = createFileRoute("/_protected/email-import/")({
  head: () => ({ meta: [{ title: "Email import — Flamette Money" }] }),
  component: EmailImportConnectionsPage,
})

function EmailImportConnectionsPage() {
  const connectionsQuery = useEmailConnections()
  const deleteConnection = useDeleteEmailConnection()
  const [editor, setEditor] = React.useState<{ connection: EmailConnectionSummary | null } | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<EmailConnectionSummary | null>(null)

  const connections = connectionsQuery.data?.connections ?? []
  const parserOptions = connectionsQuery.data?.parserOptions ?? []

  const handleDelete = async () => {
    if (!deleteTarget) {
      return
    }

    try {
      await deleteConnection.mutateAsync(deleteTarget.id)
      setDeleteTarget(null)
    } catch {
      // rendered below
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Mailbox connections</h1>
          <p className="text-sm text-muted-foreground">
            Connected mailboxes are polled for bank notification emails and turned into transactions automatically.
          </p>
        </div>
        <Button onClick={() => setEditor({ connection: null })}>
          <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} data-icon="inline-start" />
          Add connection
        </Button>
      </div>

      {connectionsQuery.isPending ? (
        <CardSkeleton className="h-64" />
      ) : connectionsQuery.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load connections</AlertTitle>
          <AlertDescription>{getApiErrorMessage(connectionsQuery.error, "Try again in a moment.")}</AlertDescription>
        </Alert>
      ) : connections.length === 0 ? (
        <EmptyState
          eyebrow="Email import"
          title="No mailboxes connected yet"
          description="Create a Gmail label for your bank's notification emails, generate an app password, and connect the mailbox here. New transaction emails will flow in automatically."
          action={
            <Button onClick={() => setEditor({ connection: null })}>
              <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} data-icon="inline-start" />
              Connect a mailbox
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {connections.map((connection) => (
            <ConnectionCard
              key={connection.id}
              connection={connection}
              onEdit={() => setEditor({ connection })}
              onDelete={() => setDeleteTarget(connection)}
            />
          ))}
        </div>
      )}

      <ConnectionEditorDialog
        open={Boolean(editor)}
        onOpenChange={(open) => !open && setEditor(null)}
        connection={editor?.connection ?? null}
        parserOptions={parserOptions}
      />

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete connection</DialogTitle>
            <DialogDescription>
              This removes "{deleteTarget?.name}" together with its entire import history (review items and dedupe records). Transactions that were
              already created stay untouched. Emails still in the mailbox may be imported again if you reconnect it.
            </DialogDescription>
          </DialogHeader>
          {deleteConnection.isError ? (
            <Alert variant="destructive">
              <AlertTitle>Delete failed</AlertTitle>
              <AlertDescription>{getApiErrorMessage(deleteConnection.error, "Unable to delete connection.")}</AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteConnection.isPending}>
              {deleteConnection.isPending ? "Deleting" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
