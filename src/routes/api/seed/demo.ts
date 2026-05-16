import { createFileRoute } from "@tanstack/react-router"

import { handleSeedDemoRequest, toSeedErrorResponse } from "@/lib/api/demo-seed.server"

export const Route = createFileRoute("/api/seed/demo")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          return await handleSeedDemoRequest(request)
        } catch (error) {
          return toSeedErrorResponse(error)
        }
      },
    },
  },
})
