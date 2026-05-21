import { createFileRoute } from "@tanstack/react-router"

import { handleExportBackupRequest, toBackupErrorResponse } from "@/features/profile-backup/server/service.server"

export const Route = createFileRoute("/api/profile/export-backup")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          return await handleExportBackupRequest(request)
        } catch (error) {
          return toBackupErrorResponse(error)
        }
      },
    },
  },
})
