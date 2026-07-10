import { useMutation, useQueryClient } from "@tanstack/react-query"

import { fullDataRefreshInvalidations, invalidateQueries } from "@/features/shared/cache-invalidations"
import { readApiErrorMessage } from "@/features/shared/errors"

import type { SeedDemoResponse } from "./types"

export function useSeedDemo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ years, seed }: { years: number; seed?: number }) => {
      const searchParams = new URLSearchParams()
      searchParams.set("Years", String(years))
      if (typeof seed === "number" && Number.isFinite(seed)) {
        searchParams.set("Seed", String(seed))
      }

      const response = await fetch(`/api/seed/demo?${searchParams.toString()}`, {
        method: "POST",
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error(await readApiErrorMessage(response, "Unable to seed demo data."))
      }

      return (await response.json()) as SeedDemoResponse
    },
    onSuccess: async () => invalidateQueries(queryClient, fullDataRefreshInvalidations),
  })
}
