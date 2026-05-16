import { drizzleAdapter } from "@better-auth/drizzle-adapter"
import { betterAuth } from "better-auth"
import { tanstackStartCookies } from "better-auth/tanstack-start"

import { db } from "@/lib/db/client.server"
import { getAppUrl, getBetterAuthSecret } from "@/lib/env.server"
import {
  authAccounts,
  authSessions,
  authVerifications,
  users,
} from "@/lib/db/schema"

export const auth = betterAuth({
  appName: "Flamette Money",
  baseURL: getAppUrl(),
  secret: getBetterAuthSecret(),
  emailAndPassword: {
    enabled: true,
  },
  trustedOrigins: [getAppUrl()],
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
  plugins: [tanstackStartCookies()],
})

export type AuthSession = typeof auth.$Infer.Session
