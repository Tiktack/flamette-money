import { createServerFn } from "@tanstack/react-start"

import { getAvailableSocialAuthProviders as getAvailableSocialAuthProvidersData } from "@/lib/env.server"
import { getCurrentUserProfileData } from "@/lib/auth/session.server"
import type { SocialAuthProvider } from "@/lib/auth/providers"

export const getCurrentUserProfile = createServerFn({ method: "GET" }).handler(async () => {
  return getCurrentUserProfileData()
})

export const getAvailableSocialAuthProviders = createServerFn({
  method: "GET",
}).handler(async (): Promise<SocialAuthProvider[]> => {
  return getAvailableSocialAuthProvidersData()
})
