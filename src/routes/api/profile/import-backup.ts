import { createFileRoute } from "@tanstack/react-router"

import { handleImportBackupRequest, toBackupErrorResponse } from "@/lib/api/profile-backup.server"

export const Route = createFileRoute("/api/profile/import-backup")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          return await handleImportBackupRequest(request)
        } catch (error) {
          return toBackupErrorResponse(error)
        }
      },
    },
  },
})
