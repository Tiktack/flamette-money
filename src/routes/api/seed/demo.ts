import { createFileRoute } from "@tanstack/react-router"

import { handleSeedDemoRequest } from "@/features/demo-seed/server/service.server"
import { toErrorResponse } from "@/lib/server/http.server"

export const Route = createFileRoute("/api/seed/demo")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          return await handleSeedDemoRequest(request)
        } catch (error) {
          return toErrorResponse(error)
        }
      },
    },
  },
})
