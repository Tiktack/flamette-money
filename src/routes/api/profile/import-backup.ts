import { createFileRoute } from "@tanstack/react-router"

import { handleImportBackupRequest } from "@/features/profile-backup/server/service.server"
import { assertRequestSizeWithinLimit, toErrorResponse } from "@/lib/server/http.server"

export const Route = createFileRoute("/api/profile/import-backup")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          assertRequestSizeWithinLimit(request, 25 * 1024 * 1024)
          return await handleImportBackupRequest(request)
        } catch (error) {
          return toErrorResponse(error)
        }
      },
    },
  },
})
