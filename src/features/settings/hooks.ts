import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { QueryClient } from "@tanstack/react-query"

import { settingsQueryOptions } from "./query-options"
import { postResetUserData, updateSettings } from "./server/functions"

import { fullDataRefreshInvalidations, invalidateQueries, settingsMutationInvalidations } from "@/features/shared/cache-invalidations"
import { queryKeys } from "@/features/shared/query-keys"

import type { BackupExportType, BackupImportType } from "@/features/profile-backup/types"
import type { ImportBackupResponse } from "@/features/profile-backup/types"
import type { CurrentUser } from "@/features/app/types"
import type { UpdateUserSettingsRequest } from "./types"
import type { UserSettings } from "./types"

function restoreQueryData<T>(queryClient: QueryClient, queryKey: readonly unknown[], previousData: T | undefined) {
  if (previousData === undefined) {
    queryClient.removeQueries({ queryKey, exact: true })
    return
  }

  queryClient.setQueryData(queryKey, previousData)
}

export function useSettings() {
  return useQuery(settingsQueryOptions())
}

export function useUpdateSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: UpdateUserSettingsRequest) => updateSettings({ data: request }),
    onMutate: async (request) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: queryKeys.settings() }),
        queryClient.cancelQueries({ queryKey: queryKeys.authMe() }),
      ])

      const previousSettings = queryClient.getQueryData<UserSettings | null>(queryKeys.settings())
      const previousCurrentUser = queryClient.getQueryData<CurrentUser | null>(queryKeys.authMe())

      queryClient.setQueryData<UserSettings>(queryKeys.settings(), {
        baseCurrency: request.baseCurrency,
      })
      queryClient.setQueryData<CurrentUser | null>(queryKeys.authMe(), (currentUser) =>
        currentUser
          ? {
              ...currentUser,
              baseCurrency: request.baseCurrency,
            }
          : currentUser
      )

      return {
        optimisticBaseCurrency: request.baseCurrency,
        previousCurrentUser,
        previousSettings,
      }
    },
    onError: (_error, _request, context) => {
      if (!context) {
        return
      }

      const currentSettings = queryClient.getQueryData<UserSettings | null>(queryKeys.settings())

      if (currentSettings?.baseCurrency !== context.optimisticBaseCurrency) {
        return
      }

      restoreQueryData(queryClient, queryKeys.settings(), context.previousSettings)
      restoreQueryData(queryClient, queryKeys.authMe(), context.previousCurrentUser)
    },
    onSettled: async () => invalidateQueries(queryClient, settingsMutationInvalidations),
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
