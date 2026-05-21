import { useMutation } from "@tanstack/react-query"

import type { ReceiptScanResult } from "./types"

export function useScanReceipt() {
  return useMutation({
    mutationFn: async ({ file, accountId }: { file: File; accountId: string }) => {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("accountId", accountId)

      const response = await fetch("/api/receipts/scan", {
        method: "POST",
        body: formData,
        credentials: "include",
      })

      if (!response.ok) {
        const message = await response.text()
        throw new Error(message || "Failed to scan receipt.")
      }

      return (await response.json()) as ReceiptScanResult
    },
  })
}
