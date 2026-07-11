import { Badge } from "@/components/ui/badge"
import type { EmailImportItemStatus } from "@/features/email-import/types"

export const statusLabels: Record<EmailImportItemStatus, string> = {
  pending: "To review",
  unparsed: "Unparsed",
  imported: "Imported",
  dismissed: "Dismissed",
  ignored: "Ignored",
  error: "Error",
}

export function statusBadge(status: EmailImportItemStatus) {
  switch (status) {
    case "imported":
      return (
        <Badge variant="outline" className="text-emerald-600 dark:text-emerald-400">
          {statusLabels[status]}
        </Badge>
      )
    case "pending":
      return <Badge variant="secondary">{statusLabels[status]}</Badge>
    case "unparsed":
      return (
        <Badge variant="outline" className="text-amber-600 dark:text-amber-400">
          {statusLabels[status]}
        </Badge>
      )
    case "error":
      return <Badge variant="destructive">{statusLabels[status]}</Badge>
    case "dismissed":
    case "ignored":
      return (
        <Badge variant="outline" className="text-muted-foreground">
          {statusLabels[status]}
        </Badge>
      )
  }
}
