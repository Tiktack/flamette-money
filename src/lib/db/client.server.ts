import { drizzle } from "drizzle-orm/d1"

import { getDatabaseBinding } from "@/lib/env.server"
import * as schema from "@/lib/db/schema"

function createDatabase() {
  return drizzle(getDatabaseBinding(), { schema })
}

export type AppDatabase = ReturnType<typeof createDatabase>

let database: AppDatabase | null = null

export function getDb() {
  database ??= createDatabase()
  return database
}

export async function runWithDb<T>(callback: (database: AppDatabase) => Promise<T>): Promise<T> {
  return callback(getDb())
}

export const db: AppDatabase = new Proxy({} as AppDatabase, {
  get(_target, property) {
    const value = Reflect.get(getDb(), property, getDb())
    return typeof value === "function" ? value.bind(getDb()) : value
  },
})
