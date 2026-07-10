import { useMutation } from "@tanstack/react-query"

import { readApiErrorMessage } from "@/features/shared/errors"

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
        throw new Error(await readApiErrorMessage(response, "Failed to scan receipt."))
      }

      return (await response.json()) as ReceiptScanResult
    },
  })
}
