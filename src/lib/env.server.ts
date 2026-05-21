import { dirname, resolve } from "node:path"
import { mkdirSync } from "node:fs"

import { supportedSocialAuthProviders, type SocialAuthProvider } from "@/lib/auth/providers"

const DEFAULT_DATABASE_URL = "file:./data/flamette-money.db"
const DEFAULT_LOCAL_AUTH_ALLOWED_HOSTS = ["localhost:*", "127.0.0.1:*", "[::1]:*"] as const

type SocialProviderConfig = {
  clientId: string
  clientSecret: string
}

function trimOrUndefined(value: string | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
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

function getSocialProviderConfig(providerName: string, clientIdEnvName: string, clientSecretEnvName: string): SocialProviderConfig | undefined {
  const clientId = trimOrUndefined(process.env[clientIdEnvName])
  const clientSecret = trimOrUndefined(process.env[clientSecretEnvName])

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

export function getBetterAuthBaseUrl() {
  const configuredUrl = trimOrUndefined(process.env.BETTER_AUTH_URL)

  if (configuredUrl) {
    return configuredUrl
  }

  const configuredAllowedHosts = splitCommaSeparated(process.env.BETTER_AUTH_ALLOWED_HOSTS)
  const allowedHosts = Array.from(new Set([...DEFAULT_LOCAL_AUTH_ALLOWED_HOSTS, ...configuredAllowedHosts]))

  return {
    allowedHosts,
    protocol: "auto" as const,
  }
}

export function getBetterAuthTrustedOrigins() {
  return splitCommaSeparated(process.env.BETTER_AUTH_TRUSTED_ORIGINS)
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
  return trimOrUndefined(process.env.BETTER_AUTH_SECRET) ?? "please-change-this-development-secret-before-production"
}

export function getDatabasePath() {
  const databaseUrl = trimOrUndefined(process.env.DATABASE_URL) ?? DEFAULT_DATABASE_URL
  const rawPath = databaseUrl.startsWith("file:") ? databaseUrl.slice(5) : databaseUrl
  const absolutePath = resolve(process.cwd(), rawPath)

  mkdirSync(dirname(absolutePath), { recursive: true })

  return absolutePath
}

export function getOpenRouterApiKey() {
  return trimOrUndefined(process.env.OPENROUTER_API_KEY) ?? trimOrUndefined(process.env.OpenRouter__ApiKey) ?? trimOrUndefined(process.env.OPENROUTER_APIKEY)
}

export function getOpenRouterModel() {
  return trimOrUndefined(process.env.OPENROUTER_MODEL) ?? trimOrUndefined(process.env.OpenRouter__Model) ?? "nvidia/llama-3.3-nemotron-super-49b-v1:free"
}
