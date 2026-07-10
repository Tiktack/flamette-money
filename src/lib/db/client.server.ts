import BetterSqlite3 from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"

import { runMigrations } from "@/lib/db/migrate.server"
import { getDatabasePath } from "@/lib/env.server"
import * as schema from "@/lib/db/schema"

let connection: BetterSqlite3.Database | null = null
let shutdownRegistered = false

function closeConnection() {
  if (!connection) {
    return
  }

  try {
    // Flush the WAL back into the main database file so a stopped/updated container
    // never leaves the DB mid-write, then release the file handle.
    connection.pragma("wal_checkpoint(TRUNCATE)")
    connection.close()
  } catch {
    // Best-effort during shutdown; nothing useful to do if checkpoint/close fails.
  } finally {
    connection = null
  }
}

function registerShutdownHandlers() {
  if (shutdownRegistered || typeof process === "undefined") {
    return
  }

  shutdownRegistered = true

  for (const signal of ["SIGTERM", "SIGINT"] as const) {
    process.once(signal, () => {
      closeConnection()
      process.exit(0)
    })
  }
}

function createDatabase() {
  connection = new BetterSqlite3(getDatabasePath())
  connection.pragma("journal_mode = WAL")
  connection.pragma("foreign_keys = ON")
  connection.pragma("busy_timeout = 5000")

  runMigrations(connection)
  registerShutdownHandlers()

  return drizzle(connection, { schema })
}

export type AppDatabase = ReturnType<typeof createDatabase>

let database: AppDatabase | null = null

export function getDb() {
  database ??= createDatabase()
  return database
}

export type AppTransaction = Parameters<Parameters<AppDatabase["transaction"]>[0]>[0]

/**
 * Runs the callback inside a single SQLite transaction so multi-write operations are atomic.
 * better-sqlite3 transactions are synchronous — use the sync query methods (.run()/.all()/.get())
 * inside the callback; async work (validation, lookups) belongs before or after it.
 */
export function runDbTransaction<T>(callback: (tx: AppTransaction) => T): T {
  return getDb().transaction(callback)
}

/** Lightweight liveness check used by the /healthz endpoint. Throws if the DB is unreachable. */
export function pingDatabase() {
  getDb()
  connection?.prepare("SELECT 1").get()
}

export const db: AppDatabase = new Proxy({} as AppDatabase, {
  get(_target, property) {
    const value = Reflect.get(getDb(), property, getDb())
    return typeof value === "function" ? value.bind(getDb()) : value
  },
})
