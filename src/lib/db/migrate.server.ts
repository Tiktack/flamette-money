import { readdirSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

import type BetterSqlite3 from "better-sqlite3"

function getMigrationsDir() {
  const configured = process.env.MIGRATIONS_DIR?.trim()
  return configured && configured.length > 0 ? configured : resolve(process.cwd(), "migrations")
}

/**
 * Applies the SQL files in the migrations directory, in filename order, exactly once each.
 * Applied filenames are recorded in a bookkeeping table so this is safe to call on every
 * startup. The migration files are the single source of truth for the schema (the Drizzle
 * definitions in schema.ts mirror them but do not create tables).
 */
export function runMigrations(database: BetterSqlite3.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY NOT NULL,
      applied_at INTEGER NOT NULL
    );
  `)

  const directory = getMigrationsDir()
  const files = readdirSync(directory)
    .filter((file) => file.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b))

  const isApplied = database.prepare<[string]>("SELECT 1 FROM _migrations WHERE name = ?")
  const recordApplied = database.prepare<[string, number]>("INSERT INTO _migrations (name, applied_at) VALUES (?, ?)")

  for (const file of files) {
    if (isApplied.get(file)) {
      continue
    }

    const sql = readFileSync(resolve(directory, file), "utf8")

    // SQLite implicitly commits on DDL, so exec() runs each statement in the file in order.
    database.exec(sql)
    recordApplied.run(file, Date.now())
    console.info(`[db] applied migration ${file}`)
  }
}
