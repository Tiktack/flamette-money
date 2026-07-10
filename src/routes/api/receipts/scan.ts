import { createFileRoute } from "@tanstack/react-router"

import { handleReceiptScanRequest } from "@/features/receipt-scan/server/service.server"
import { assertRequestSizeWithinLimit, toErrorResponse } from "@/lib/server/http.server"

export const Route = createFileRoute("/api/receipts/scan")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          assertRequestSizeWithinLimit(request, 10 * 1024 * 1024)
          return await handleReceiptScanRequest(request)
        } catch (error) {
          return toErrorResponse(error)
        }
      },
    },
  },
})
