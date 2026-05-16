import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { currentUserQueryOptions, appInfoQueryOptions } from "./query-options"

import { authClient } from "@/lib/auth/client"

export function useAppInfo() {
  return useQuery(appInfoQueryOptions())
}

export function useCurrentUser() {
  return useQuery(currentUserQueryOptions())
}

export function useLogout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const { error } = await authClient.signOut()

      if (error) {
        throw new Error(error.message || "Unable to sign out.")
      }
    },
    onSuccess: async () => {
      queryClient.clear()
    },
  })
}
