import * as React from "react"

import { Delete02Icon, Edit01Icon, FolderLibraryIcon, Loading03Icon, MailAtSign01Icon, RefreshIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Link } from "@tanstack/react-router"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useSyncEmailConnectionNow, useUpdateEmailConnection } from "@/features/email-import/hooks"
import type { EmailConnectionSummary, EmailImportSyncResult } from "@/features/email-import/types"
import { getApiErrorMessage } from "@/features/shared/errors"
import { formatDateLabel } from "@/lib/finance"

const syncStatusLabels: Record<string, string> = {
  ok: "Healthy",
  auth_failed: "Sign-in failed",
  folder_missing: "Folder missing",
  network: "Unreachable",
  error: "Error",
}

function formatSyncResult(result: EmailImportSyncResult) {
  if (result.fetched === 0) {
    return "No new emails."
  }

  const parts = [`${result.fetched} new`]
  if (result.imported > 0) parts.push(`${result.imported} imported`)
  if (result.pending > 0) parts.push(`${result.pending} to review`)
  if (result.unparsed > 0) parts.push(`${result.unparsed} unparsed`)
  if (result.ignored > 0) parts.push(`${result.ignored} ignored`)
  if (result.errors > 0) parts.push(`${result.errors} failed`)
  return parts.join(" · ")
}

function formatLastSync(lastSyncAt: string | null) {
  if (!lastSyncAt) {
    return "Never synced"
  }

  const date = new Date(lastSyncAt)
  const minutesAgo = Math.max(0, Math.round((Date.now() - date.getTime()) / 60_000))
  if (minutesAgo < 1) return "Synced just now"
  if (minutesAgo < 60) return `Synced ${minutesAgo} min ago`
  if (minutesAgo < 24 * 60) return `Synced ${Math.round(minutesAgo / 60)} h ago`
  return `Synced ${formatDateLabel(lastSyncAt)}`
}

export function ConnectionCard({
  connection,
  onEdit,
  onDelete,
}: {
  connection: EmailConnectionSummary
  onEdit: () => void
  onDelete: () => void
}) {
  const syncNow = useSyncEmailConnectionNow()
  const updateConnection = useUpdateEmailConnection()
  const [syncMessage, setSyncMessage] = React.useState<string | null>(null)
  const [syncError, setSyncError] = React.useState<string | null>(null)

  const hasFailure = connection.lastSyncStatus !== null && connection.lastSyncStatus !== "ok"
  const reviewCount = connection.pendingCount + connection.unparsedCount + connection.errorCount

  const handleSyncNow = async () => {
    setSyncMessage(null)
    setSyncError(null)
    try {
      const result = await syncNow.mutateAsync(connection.id)
      setSyncMessage(formatSyncResult(result))
    } catch (error) {
      setSyncError(getApiErrorMessage(error, "Sync failed."))
    }
  }

  const handleToggleEnabled = (enabled: boolean) => {
    updateConnection.mutate({
      id: connection.id,
      request: {
        name: connection.name,
        username: connection.username,
        folder: connection.folder,
        parserKey: connection.parserKey,
        defaultAccountId: connection.defaultAccountId,
        pollIntervalMinutes: connection.pollIntervalMinutes,
        enabled,
      },
    })
  }

  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <CardTitle className="truncate">{connection.name}</CardTitle>
          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5 truncate">
              <HugeiconsIcon icon={MailAtSign01Icon} strokeWidth={2} className="size-3.5 shrink-0" />
              {connection.username}
            </span>
            <span className="flex items-center gap-1.5 truncate">
              <HugeiconsIcon icon={FolderLibraryIcon} strokeWidth={2} className="size-3.5 shrink-0" />
              {connection.folder}
            </span>
          </div>
        </div>
        <Switch checked={connection.enabled} onCheckedChange={handleToggleEnabled} disabled={updateConnection.isPending} aria-label="Enable connection" />
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {hasFailure ? (
            <Tooltip>
              <TooltipTrigger render={<Badge variant="destructive" />}>{syncStatusLabels[connection.lastSyncStatus ?? "error"]}</TooltipTrigger>
              <TooltipContent className="max-w-72">{connection.lastSyncError ?? "The last sync failed."}</TooltipContent>
            </Tooltip>
          ) : (
            <Badge variant="secondary">{connection.lastSyncStatus === "ok" ? "Healthy" : "Waiting for first sync"}</Badge>
          )}
          {reviewCount > 0 ? (
            <Link to="/email-import/review" search={{ connection: connection.id }}>
              <Badge variant="outline" className="hover:bg-muted">
                {reviewCount} to review
              </Badge>
            </Link>
          ) : null}
          <span className="text-xs text-muted-foreground">{formatLastSync(connection.lastSyncAt)}</span>
        </div>

        {syncMessage ? <p className="text-xs text-muted-foreground">{syncMessage}</p> : null}
        {syncError ? <p className="text-xs text-destructive">{syncError}</p> : null}

        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={handleSyncNow} disabled={syncNow.isPending || !connection.enabled}>
            <HugeiconsIcon
              icon={syncNow.isPending ? Loading03Icon : RefreshIcon}
              strokeWidth={2}
              data-icon="inline-start"
              className={syncNow.isPending ? "animate-spin" : undefined}
            />
            {syncNow.isPending ? "Syncing" : "Sync now"}
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onEdit}>
            <HugeiconsIcon icon={Edit01Icon} strokeWidth={2} />
            <span className="sr-only">Edit connection</span>
          </Button>
          <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive" onClick={onDelete}>
            <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
            <span className="sr-only">Delete connection</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
