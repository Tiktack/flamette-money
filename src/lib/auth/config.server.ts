import { drizzleAdapter } from "@better-auth/drizzle-adapter"
import { betterAuth } from "better-auth"
import { APIError } from "better-auth/api"
import { lastLoginMethod } from "better-auth/plugins"
import { tanstackStartCookies } from "better-auth/tanstack-start"

import { getDb } from "@/lib/db/client.server"
import {
  getBetterAuthBaseUrl,
  getBetterAuthSecret,
  getBetterAuthTrustedOrigins,
  getConfiguredSocialProviders,
  getSignupsDisabled,
  getUseSecureCookies,
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
      useSecureCookies: getUseSecureCookies(),
      ipAddress: {
        ipAddressHeaders: ["cf-connecting-ip", "x-forwarded-for"],
      },
      backgroundTasks: {
        // Node keeps the process alive across requests, so we just run the task and
        // make sure a rejection never becomes an unhandled promise rejection.
        handler: (promise) => {
          void Promise.resolve(promise).catch((error) => {
            console.error("[auth] background task failed", error)
          })
        },
      },
    },
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 60 * 5,
        strategy: "compact",
      },
    },
    databaseHooks: {
      user: {
        create: {
          // Gate new account creation for every method (email and social) in one place.
          // This fires only when a brand-new user is created, never on sign-in of an
          // existing user. When sign-ups are disabled we still allow the very first user
          // so a fresh private instance isn't locked out of creating its owner account.
          before: async (user) => {
            if (getSignupsDisabled()) {
              const existingUser = await getDb().query.users.findFirst({ columns: { id: true } })
              if (existingUser) {
                throw new APIError("FORBIDDEN", { message: "New sign-ups are disabled on this server." })
              }
            }

            return { data: user }
          },
        },
      },
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
