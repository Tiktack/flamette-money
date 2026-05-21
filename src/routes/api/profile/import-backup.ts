import { createFileRoute } from "@tanstack/react-router"

import { handleImportBackupRequest, toBackupErrorResponse } from "@/features/profile-backup/server/service.server"

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
