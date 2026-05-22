import { drizzleAdapter } from "@better-auth/drizzle-adapter"
import { betterAuth } from "better-auth"
import { lastLoginMethod } from "better-auth/plugins"
import { tanstackStartCookies } from "better-auth/tanstack-start"

import { db } from "@/lib/db/client.server"
import { getBetterAuthBaseUrl, getBetterAuthSecret, getBetterAuthTrustedOrigins, getConfiguredSocialProviders } from "@/lib/env.server"
import { authAccounts, authSessions, authVerifications, users } from "@/lib/db/schema"

const socialProviders = getConfiguredSocialProviders()
const trustedOrigins = getBetterAuthTrustedOrigins()

export const auth = betterAuth({
  appName: "Flamette Money",
  baseURL: getBetterAuthBaseUrl(),
  secret: getBetterAuthSecret(),
  emailAndPassword: {
    enabled: true,
  },
  ...(Object.keys(socialProviders).length > 0 ? { socialProviders } : {}),
  ...(trustedOrigins.length > 0 ? { trustedOrigins } : {}),
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
  },
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema: {
      user: users,
      account: authAccounts,
      session: authSessions,
      verification: authVerifications,
    },
  }),
  plugins: [tanstackStartCookies(), lastLoginMethod()],
})

export type AuthSession = typeof auth.$Infer.Session
