import { env as workerEnv } from "cloudflare:workers"

import { supportedSocialAuthProviders, type SocialAuthProvider } from "@/lib/auth/providers"

const DEFAULT_LOCAL_AUTH_ALLOWED_HOSTS = ["localhost:*", "127.0.0.1:*", "[::1]:*"] as const
const DEFAULT_CLOUDFLARE_AUTH_ALLOWED_HOSTS = ["*.workers.dev"] as const
const DEVELOPMENT_AUTH_SECRET = "please-change-this-development-secret-before-production"

type SocialProviderConfig = {
  clientId: string
  clientSecret: string
}

function trimOrUndefined(value: string | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function getProcessEnvValue(name: string) {
  if (typeof process === "undefined") {
    return undefined
  }

  return trimOrUndefined(process.env[name])
}

function getRuntimeEnvValue(name: string) {
  const runtimeValue = workerEnv[name as keyof typeof workerEnv]
  return typeof runtimeValue === "string" ? trimOrUndefined(runtimeValue) : getProcessEnvValue(name)
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
  return import.meta.env.PROD || getRuntimeEnvValue("NODE_ENV") === "production"
}

function getSocialProviderConfig(providerName: string, clientIdEnvName: string, clientSecretEnvName: string): SocialProviderConfig | undefined {
  const clientId = getRuntimeEnvValue(clientIdEnvName)
  const clientSecret = getRuntimeEnvValue(clientSecretEnvName)

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

export function getDatabaseBinding() {
  const binding = workerEnv.DB

  if (!binding) {
    throw new Error("Cloudflare D1 binding 'DB' is required.")
  }

  return binding
}

export function getBetterAuthBaseUrl() {
  const configuredUrl = getRuntimeEnvValue("BETTER_AUTH_URL")

  if (configuredUrl) {
    return configuredUrl
  }

  const configuredAllowedHosts = splitCommaSeparated(getRuntimeEnvValue("BETTER_AUTH_ALLOWED_HOSTS"))
  const allowedHosts = Array.from(
    new Set([...DEFAULT_LOCAL_AUTH_ALLOWED_HOSTS, ...DEFAULT_CLOUDFLARE_AUTH_ALLOWED_HOSTS, ...configuredAllowedHosts])
  )

  return {
    allowedHosts,
    protocol: isProductionEnvironment() ? ("https" as const) : ("auto" as const),
  }
}

export function getBetterAuthTrustedOrigins() {
  return splitCommaSeparated(getRuntimeEnvValue("BETTER_AUTH_TRUSTED_ORIGINS"))
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
  const secret = getRuntimeEnvValue("BETTER_AUTH_SECRET")

  if (secret) {
    return secret
  }

  if (isProductionEnvironment()) {
    throw new Error("BETTER_AUTH_SECRET is required in production.")
  }

  return DEVELOPMENT_AUTH_SECRET
}

export function getExchangeRateApiKey() {
  return getRuntimeEnvValue("EXCHANGE_RATE_API_KEY")
}

export function getExchangeRateCacheHours() {
  return Number.parseInt(getRuntimeEnvValue("EXCHANGE_RATE_CACHE_HOURS") ?? "5", 10)
}

export function getOpenRouterApiKey() {
  return getRuntimeEnvValue("OPENROUTER_API_KEY") ?? getRuntimeEnvValue("OpenRouter__ApiKey") ?? getRuntimeEnvValue("OPENROUTER_APIKEY")
}

export function getOpenRouterModel() {
  return getRuntimeEnvValue("OPENROUTER_MODEL") ?? getRuntimeEnvValue("OpenRouter__Model") ?? "nvidia/llama-3.3-nemotron-super-49b-v1:free"
}
