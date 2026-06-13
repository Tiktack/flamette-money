import { createFileRoute } from "@tanstack/react-router"

import { pingDatabase } from "@/lib/db/client.server"

export const Route = createFileRoute("/api/healthz")({
  server: {
    handlers: {
      GET: async () => {
        try {
          pingDatabase()
          return Response.json({ status: "ok" })
        } catch (error) {
          console.error("[healthz] database check failed", error)
          return Response.json({ status: "error" }, { status: 503 })
        }
      },
    },
  },
})
