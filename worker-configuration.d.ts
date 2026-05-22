declare namespace Cloudflare {
  interface Env {
    DB: D1Database
    BETTER_AUTH_SECRET?: string
    BETTER_AUTH_URL?: string
    BETTER_AUTH_ALLOWED_HOSTS?: string
    BETTER_AUTH_TRUSTED_ORIGINS?: string
    GOOGLE_CLIENT_ID?: string
    GOOGLE_CLIENT_SECRET?: string
    GITHUB_CLIENT_ID?: string
    GITHUB_CLIENT_SECRET?: string
    OPENROUTER_API_KEY?: string
    OPENROUTER_MODEL?: string
    EXCHANGE_RATE_API_KEY?: string
    EXCHANGE_RATE_CACHE_HOURS?: string
  }
}

interface D1Result<T = Record<string, unknown>> {
  results: T[]
  success: boolean
  meta: Record<string, unknown>
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement
  first<T = Record<string, unknown>>(columnName?: string): Promise<T | null>
  run<T = Record<string, unknown>>(): Promise<D1Result<T>>
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>
  raw<T = unknown[]>(): Promise<T[]>
}

interface D1Database {
  prepare(query: string): D1PreparedStatement
  batch<T = D1Result>(statements: D1PreparedStatement[]): Promise<T[]>
  exec(query: string): Promise<D1Result>
}

declare module "cloudflare:workers" {
  export const env: Cloudflare.Env
  export function waitUntil(promise: Promise<unknown>): void
}
