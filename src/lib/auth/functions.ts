import { createServerFn } from "@tanstack/react-start"

import { db } from "@/lib/db/client.server"
import { getAvailableSocialAuthProviders as getAvailableSocialAuthProvidersData, getSignupsDisabled } from "@/lib/env.server"
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

// Whether the sign-in screen should offer sign-up. Mirrors the server-side gate: sign-ups
// are allowed unless disabled, and always allowed while no user exists yet (first owner).
export const getSignupAllowed = createServerFn({ method: "GET" }).handler(async (): Promise<boolean> => {
  if (!getSignupsDisabled()) {
    return true
  }

  const existingUser = await db.query.users.findFirst({ columns: { id: true } })
  return !existingUser
})
