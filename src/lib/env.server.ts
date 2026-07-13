import { mkdirSync } from "node:fs"
import { dirname, resolve } from "node:path"

import { supportedSocialAuthProviders, type SocialAuthProvider } from "@/lib/auth/providers"

const DEFAULT_LOCAL_AUTH_ALLOWED_HOSTS = ["localhost:*", "127.0.0.1:*", "[::1]:*"] as const
const DEFAULT_DATABASE_URL = "file:./data/flamette-money.db"
const DEVELOPMENT_AUTH_SECRET = "please-change-this-development-secret-before-production"

type SocialProviderConfig = {
  clientId: string
  clientSecret: string
}

function trimOrUndefined(value: string | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function getEnvValue(name: string) {
  if (typeof process === "undefined") {
    return undefined
  }

  return trimOrUndefined(process.env[name])
}

function splitCommaSeparated(value: string | undefined) {
  const normalized = trimOrUndefined(value)
  if (!normalized) {
    return []
  }

  return normalized
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
}

function isProductionEnvironment() {
  return import.meta.env.PROD || getEnvValue("NODE_ENV") === "production"
}

function getSocialProviderConfig(providerName: string, clientIdEnvName: string, clientSecretEnvName: string): SocialProviderConfig | undefined {
  const clientId = getEnvValue(clientIdEnvName)
  const clientSecret = getEnvValue(clientSecretEnvName)

  if (!clientId && !clientSecret) {
    return undefined
  }

  if (!clientId || !clientSecret) {
    throw new Error(`${providerName} OAuth requires both ${clientIdEnvName} and ${clientSecretEnvName}.`)
  }

  return {
    clientId,
    clientSecret,
  }
}

export function getDatabasePath() {
  const databaseUrl = getEnvValue("DATABASE_URL") ?? DEFAULT_DATABASE_URL
  const rawPath = databaseUrl.startsWith("file:") ? databaseUrl.slice(5) : databaseUrl
  const absolutePath = resolve(process.cwd(), rawPath)

  mkdirSync(dirname(absolutePath), { recursive: true })

  return absolutePath
}

export function getBetterAuthBaseUrl() {
  const configuredUrl = getEnvValue("BETTER_AUTH_URL")

  if (configuredUrl) {
    return configuredUrl
  }

  const configuredAllowedHosts = splitCommaSeparated(getEnvValue("BETTER_AUTH_ALLOWED_HOSTS"))
  const allowedHosts = Array.from(new Set([...DEFAULT_LOCAL_AUTH_ALLOWED_HOSTS, ...configuredAllowedHosts]))

  return {
    allowedHosts,
    protocol: isProductionEnvironment() ? ("https" as const) : ("auto" as const),
  }
}

export function getBetterAuthTrustedOrigins() {
  return splitCommaSeparated(getEnvValue("BETTER_AUTH_TRUSTED_ORIGINS"))
}

export function getUseSecureCookies() {
  const override = getEnvValue("BETTER_AUTH_USE_SECURE_COOKIES")
  if (override) {
    return override.toLowerCase() === "true"
  }

  // When a fixed public URL is configured (the usual production case, e.g. behind a
  // Cloudflare Tunnel), trust its protocol. https => secure cookies; plain http (LAN
  // testing) => non-secure so the cookie is actually sent back by the browser.
  const configuredUrl = getEnvValue("BETTER_AUTH_URL")
  if (configuredUrl) {
    return configuredUrl.startsWith("https://")
  }

  return isProductionEnvironment()
}

export function getSignupsDisabled() {
  return getEnvValue("DISABLE_SIGNUPS")?.toLowerCase() === "true"
}

export function getConfiguredSocialProviders(): Partial<Record<SocialAuthProvider, SocialProviderConfig>> {
  const google = getSocialProviderConfig("Google", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET")
  const github = getSocialProviderConfig("GitHub", "GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET")

  return {
    ...(google ? { google } : {}),
    ...(github ? { github } : {}),
  }
}

export function getAvailableSocialAuthProviders() {
  const configuredProviders = getConfiguredSocialProviders()

  return supportedSocialAuthProviders.filter((provider) => configuredProviders[provider])
}

export function getBetterAuthSecret() {
  const secret = getEnvValue("BETTER_AUTH_SECRET")

  if (secret) {
    return secret
  }

  if (isProductionEnvironment()) {
    throw new Error("BETTER_AUTH_SECRET is required in production.")
  }

  return DEVELOPMENT_AUTH_SECRET
}

export function getExchangeRateApiKey() {
  return getEnvValue("EXCHANGE_RATE_API_KEY")
}

export function getExchangeRateCacheHours() {
  return Number.parseInt(getEnvValue("EXCHANGE_RATE_CACHE_HOURS") ?? "5", 10)
}

// A non-numeric or non-positive value falls back to the default instead of yielding NaN —
// a NaN limit would silently make every email sync fetch zero messages forever.
function parsePositiveIntEnv(name: string, fallback: number) {
  const parsed = Number.parseInt(getEnvValue(name) ?? "", 10)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback
  }
  return parsed
}

export function getEmailImportEncryptionKey() {
  return getEnvValue("EMAIL_IMPORT_ENCRYPTION_KEY")
}

export function getEmailImportDefaultPollMinutes() {
  return parsePositiveIntEnv("EMAIL_IMPORT_DEFAULT_POLL_MINUTES", 60)
}

export function getEmailImportMaxMessagesPerSync() {
  return parsePositiveIntEnv("EMAIL_IMPORT_MAX_MESSAGES_PER_SYNC", 50)
}
