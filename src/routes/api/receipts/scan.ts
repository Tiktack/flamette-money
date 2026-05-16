import { createFileRoute } from "@tanstack/react-router"

import { handleReceiptScanRequest, toReceiptScanErrorResponse } from "@/lib/api/receipt-scan.server"

export const Route = createFileRoute("/api/receipts/scan")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          return await handleReceiptScanRequest(request)
        } catch (error) {
          return toReceiptScanErrorResponse(error)
        }
      },
    },
  },
})
