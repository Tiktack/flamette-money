import { drizzleAdapter } from "@better-auth/drizzle-adapter"
import { betterAuth } from "better-auth"
import { lastLoginMethod } from "better-auth/plugins"
import { tanstackStartCookies } from "better-auth/tanstack-start"
import { waitUntil } from "cloudflare:workers"

import { getDb } from "@/lib/db/client.server"
import {
  getBetterAuthBaseUrl,
  getBetterAuthSecret,
  getBetterAuthTrustedOrigins,
  getConfiguredSocialProviders,
} from "@/lib/env.server"
import * as dbSchema from "@/lib/db/schema"
import { authAccounts, authSessions, authVerifications, users } from "@/lib/db/schema"

function createAuth() {
  const socialProviders = getConfiguredSocialProviders()
  const trustedOrigins = getBetterAuthTrustedOrigins()

  return betterAuth({
    appName: "Flamette Money",
    baseURL: getBetterAuthBaseUrl(),
    secret: getBetterAuthSecret(),
    emailAndPassword: {
      enabled: true,
    },
    ...(Object.keys(socialProviders).length > 0 ? { socialProviders } : {}),
    ...(trustedOrigins.length > 0 ? { trustedOrigins } : {}),
    account: {
      encryptOAuthTokens: true,
      storeStateStrategy: "cookie",
    },
    advanced: {
      useSecureCookies: import.meta.env.PROD,
      ipAddress: {
        ipAddressHeaders: ["cf-connecting-ip", "x-forwarded-for"],
      },
      backgroundTasks: {
        handler: (promise) => waitUntil(promise),
      },
    },
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 60 * 5,
        strategy: "compact",
      },
    },
    experimental: {
      joins: true,
    },
    database: drizzleAdapter(getDb(), {
      provider: "sqlite",
      schema: {
        ...dbSchema,
        user: users,
        account: authAccounts,
        session: authSessions,
        verification: authVerifications,
      },
    }),
    plugins: [tanstackStartCookies(), lastLoginMethod()],
  })
}

type AuthInstance = ReturnType<typeof createAuth>

let authInstance: AuthInstance | null = null

export function getAuth() {
  authInstance ??= createAuth()
  return authInstance
}

export const auth: AuthInstance = new Proxy({} as AuthInstance, {
  get(_target, property) {
    const value = Reflect.get(getAuth(), property, getAuth())
    return typeof value === "function" ? value.bind(getAuth()) : value
  },
})

export type AuthSession = typeof auth.$Infer.Session
