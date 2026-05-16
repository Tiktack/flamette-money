import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { authClient } from "@/lib/auth-client"
import { getCurrentUserProfile } from "@/lib/auth.functions"

const authQueryKey = ["auth", "current-user"] as const

function getBetterAuthErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message
  }

  return "Unable to continue."
}

export function useCurrentUserProfile() {
  return useQuery({
    queryKey: authQueryKey,
    queryFn: () => getCurrentUserProfile(),
    staleTime: 60_000,
  })
}

export function useEmailSignUp() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { name: string; email: string; password: string }) => {
      const { error } = await authClient.signUp.email({
        name: input.name,
        email: input.email,
        password: input.password,
      })

      if (error) {
        throw new Error(getBetterAuthErrorMessage(error))
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: authQueryKey })
    },
  })
}

export function useEmailSignIn() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { email: string; password: string }) => {
      const { error } = await authClient.signIn.email({
        email: input.email,
        password: input.password,
      })

      if (error) {
        throw new Error(getBetterAuthErrorMessage(error))
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: authQueryKey })
    },
  })
}

export function useLogoutProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const { error } = await authClient.signOut()

      if (error) {
        throw new Error(getBetterAuthErrorMessage(error))
      }
    },
    onSuccess: async () => {
      queryClient.clear()
      await queryClient.invalidateQueries({ queryKey: authQueryKey })
    },
  })
}
