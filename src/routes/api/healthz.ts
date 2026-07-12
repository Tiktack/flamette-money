import { createFileRoute } from "@tanstack/react-router"

import { pingDatabase } from "@/lib/db/client.server"

export const Route = createFileRoute("/api/healthz")({
  server: {
    handlers: {
      GET: async () => {
        // The Home Assistant watchdog polls this endpoint right after boot, which makes
        // it a reliable place to start the lazy email-import scheduler in production.
        try {
          const { ensureEmailImportScheduler } = await import("@/features/email-import/server/scheduler.server")
          ensureEmailImportScheduler()
        } catch (error) {
          console.error("[healthz] failed to start email import scheduler", error)
        }

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
