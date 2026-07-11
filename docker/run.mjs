#!/usr/bin/env node
// Container entrypoint for the Home Assistant add-on.
// Home Assistant writes the user's add-on options to /data/options.json; we map those to
// the environment variables the app reads, apply sane defaults, then start the server.
import { spawn } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

const OPTIONS_PATH = "/data/options.json"

const OPTION_TO_ENV = {
  better_auth_secret: "BETTER_AUTH_SECRET",
  better_auth_url: "BETTER_AUTH_URL",
  better_auth_trusted_origins: "BETTER_AUTH_TRUSTED_ORIGINS",
  better_auth_allowed_hosts: "BETTER_AUTH_ALLOWED_HOSTS",
  better_auth_use_secure_cookies: "BETTER_AUTH_USE_SECURE_COOKIES",
  disable_signups: "DISABLE_SIGNUPS",
  database_url: "DATABASE_URL",
  google_client_id: "GOOGLE_CLIENT_ID",
  google_client_secret: "GOOGLE_CLIENT_SECRET",
  github_client_id: "GITHUB_CLIENT_ID",
  github_client_secret: "GITHUB_CLIENT_SECRET",
  exchange_rate_api_key: "EXCHANGE_RATE_API_KEY",
  exchange_rate_cache_hours: "EXCHANGE_RATE_CACHE_HOURS",
  openrouter_api_key: "OPENROUTER_API_KEY",
  openrouter_model: "OPENROUTER_MODEL",
  email_import_encryption_key: "EMAIL_IMPORT_ENCRYPTION_KEY",
  email_import_default_poll_minutes: "EMAIL_IMPORT_DEFAULT_POLL_MINUTES",
  email_import_max_messages_per_sync: "EMAIL_IMPORT_MAX_MESSAGES_PER_SYNC",
}

if (existsSync(OPTIONS_PATH)) {
  try {
    const options = JSON.parse(readFileSync(OPTIONS_PATH, "utf8"))
    for (const [optionKey, envName] of Object.entries(OPTION_TO_ENV)) {
      const value = options[optionKey]
      if (value !== undefined && value !== null && String(value).trim().length > 0) {
        process.env[envName] = String(value)
      }
    }
  } catch (error) {
    console.error(`[start] could not parse ${OPTIONS_PATH}:`, error)
  }
}

process.env.NODE_ENV ||= "production"
process.env.HOST ||= "0.0.0.0"
process.env.PORT ||= "8744"
process.env.DATABASE_URL ||= "file:/data/flamette-money.db"

if (!process.env.BETTER_AUTH_SECRET || process.env.BETTER_AUTH_SECRET.trim().length === 0) {
  console.error("[start] BETTER_AUTH_SECRET is required. Set it in the add-on configuration and restart.")
  process.exit(1)
}

const srvxEntry = resolve(process.cwd(), "node_modules/srvx/bin/srvx.mjs")
const args = [srvxEntry, "--prod", "--host", process.env.HOST, "--port", process.env.PORT, "-s", "../client", "dist/server/server.js"]

const child = spawn(process.execPath, args, { stdio: "inherit", env: process.env })

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }
  process.exit(code ?? 0)
})

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => child.kill(signal))
}
