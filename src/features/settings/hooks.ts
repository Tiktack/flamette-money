import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { settingsQueryOptions } from "./query-options"
import { postResetUserData, updateSettings } from "./server/functions"

import { fullDataRefreshInvalidations, invalidateQueries, settingsMutationInvalidations } from "@/features/shared/cache-invalidations"

import type { BackupExportType, BackupImportType } from "@/features/profile-backup/types"
import type { ImportBackupResponse } from "@/features/profile-backup/types"
import type { UpdateUserSettingsRequest } from "./types"

export function useSettings() {
  return useQuery(settingsQueryOptions())
}

export function useUpdateSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: UpdateUserSettingsRequest) => updateSettings({ data: request }),
    onSuccess: async () => invalidateQueries(queryClient, settingsMutationInvalidations),
  })
}

export function useResetData() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => postResetUserData(),
    onSuccess: async () => invalidateQueries(queryClient, fullDataRefreshInvalidations),
  })
}

export function useImportBackup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ file, type }: { file: File; type: BackupImportType }) => {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("type", type)

      const response = await fetch("/api/profile/import-backup", {
        method: "POST",
        body: formData,
        credentials: "include",
      })

      if (!response.ok) {
        const message = await response.text()
        throw new Error(message || "Unable to import backup.")
      }

      return (await response.json()) as ImportBackupResponse
    },
    onSuccess: async () => invalidateQueries(queryClient, fullDataRefreshInvalidations),
  })
}

export function useExportBackup() {
  return useMutation({
    mutationFn: async ({ type }: { type: BackupExportType }) => {
      const requestUrl = `/api/profile/export-backup?type=${encodeURIComponent(type)}`
      const response = await fetch(requestUrl, {
        method: "GET",
        credentials: "include",
      })

      if (!response.ok) {
        const message = await response.text()
        throw new Error(message || "Unable to export backup.")
      }

      const blob = await response.blob()
      const disposition = response.headers.get("content-disposition") ?? ""
      const match = /filename="?([^";]+)"?/i.exec(disposition)
      const fileName = match?.[1] ?? `flamette-backup-${new Date().toISOString()}.xlsx`

      const downloadUrl = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = downloadUrl
      anchor.download = fileName
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(downloadUrl)
    },
  })
}
