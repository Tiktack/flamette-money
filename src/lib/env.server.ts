import { dirname, resolve } from "node:path"
import { mkdirSync } from "node:fs"

const DEFAULT_DATABASE_URL = "file:./data/flamette-money.db"
const DEFAULT_APP_URL = "http://localhost:5174"

function trimOrUndefined(value: string | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

export function getAppUrl() {
  return trimOrUndefined(process.env.BETTER_AUTH_URL) ?? DEFAULT_APP_URL
}

export function getBetterAuthSecret() {
  return (
    trimOrUndefined(process.env.BETTER_AUTH_SECRET) ??
    "please-change-this-development-secret-before-production"
  )
}

export function getDatabasePath() {
  const databaseUrl = trimOrUndefined(process.env.DATABASE_URL) ?? DEFAULT_DATABASE_URL
  const rawPath = databaseUrl.startsWith("file:") ? databaseUrl.slice(5) : databaseUrl
  const absolutePath = resolve(process.cwd(), rawPath)

  mkdirSync(dirname(absolutePath), { recursive: true })

  return absolutePath
}

export function getOpenRouterApiKey() {
  return (
    trimOrUndefined(process.env.OPENROUTER_API_KEY) ??
    trimOrUndefined(process.env.OpenRouter__ApiKey) ??
    trimOrUndefined(process.env.OPENROUTER_APIKEY)
  )
}

export function getOpenRouterModel() {
  return (
    trimOrUndefined(process.env.OPENROUTER_MODEL) ??
    trimOrUndefined(process.env.OpenRouter__Model) ??
    "nvidia/llama-3.3-nemotron-super-49b-v1:free"
  )
}
