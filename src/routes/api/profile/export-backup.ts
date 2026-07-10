import { createFileRoute } from "@tanstack/react-router"

import { handleExportBackupRequest } from "@/features/profile-backup/server/service.server"
import { toErrorResponse } from "@/lib/server/http.server"

export const Route = createFileRoute("/api/profile/export-backup")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          return await handleExportBackupRequest(request)
        } catch (error) {
          return toErrorResponse(error)
        }
      },
    },
  },
})
