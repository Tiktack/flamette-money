import { createServerFn } from "@tanstack/react-start"

import { getCurrentUserProfileData } from "@/lib/auth/session.server"

export const getCurrentUserProfile = createServerFn({ method: "GET" }).handler(
  async () => {
    return getCurrentUserProfileData()
  }
)
