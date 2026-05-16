import BetterSqlite3 from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"

import { getDatabasePath } from "@/lib/env.server"
import * as schema from "@/lib/db/schema"

let initialized = false

function initializeDatabase(database: BetterSqlite3.Database) {
  if (initialized) {
    return
  }

  database.pragma("journal_mode = WAL")
  database.pragma("foreign_keys = ON")
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      email_verified INTEGER NOT NULL DEFAULT 0,
      image TEXT,
      created_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
      updated_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
      base_currency TEXT NOT NULL DEFAULT 'USD',
      subscription_type TEXT NOT NULL DEFAULT 'Free'
    );
    CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx ON users(email);

    CREATE TABLE IF NOT EXISTS auth_sessions (
      id TEXT PRIMARY KEY NOT NULL,
      expires_at INTEGER NOT NULL,
      token TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
      updated_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
      ip_address TEXT,
      user_agent TEXT,
      user_id TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE UNIQUE INDEX IF NOT EXISTS auth_sessions_token_idx ON auth_sessions(token);
    CREATE INDEX IF NOT EXISTS auth_sessions_user_id_idx ON auth_sessions(user_id);

    CREATE TABLE IF NOT EXISTS auth_accounts (
      id TEXT PRIMARY KEY NOT NULL,
      account_id TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      access_token TEXT,
      refresh_token TEXT,
      id_token TEXT,
      access_token_expires_at INTEGER,
      refresh_token_expires_at INTEGER,
      scope TEXT,
      password TEXT,
      created_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
      updated_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS auth_accounts_user_id_idx ON auth_accounts(user_id);

    CREATE TABLE IF NOT EXISTS auth_verifications (
      id TEXT PRIMARY KEY NOT NULL,
      identifier TEXT NOT NULL,
      value TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
      updated_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer))
    );
    CREATE INDEX IF NOT EXISTS auth_verifications_identifier_idx ON auth_verifications(identifier);

    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      currency TEXT NOT NULL,
      color TEXT NOT NULL,
      icon TEXT NOT NULL,
      type TEXT NOT NULL,
      current_balance REAL NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
      updated_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS accounts_user_id_name_idx ON accounts(user_id, name);
    CREATE INDEX IF NOT EXISTS accounts_user_id_type_idx ON accounts(user_id, type);

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      icon TEXT NOT NULL,
      parent_id TEXT,
      type TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
      updated_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE RESTRICT
    );
    CREATE INDEX IF NOT EXISTS categories_user_id_name_idx ON categories(user_id, name);
    CREATE INDEX IF NOT EXISTS categories_user_id_type_parent_idx ON categories(user_id, type, parent_id);

    CREATE TABLE IF NOT EXISTS trips (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      country TEXT,
      start_date INTEGER,
      end_date INTEGER,
      image_url TEXT,
      created_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
      updated_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS trips_user_id_name_idx ON trips(user_id, name);
    CREATE INDEX IF NOT EXISTS trips_user_id_start_date_idx ON trips(user_id, start_date);

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      date INTEGER NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      amount2 REAL,
      currency TEXT,
      currency2 TEXT,
      account_id TEXT NOT NULL,
      category_id TEXT,
      sub_category_id TEXT,
      target_account_id TEXT,
      related_transaction_id TEXT,
      original_transaction_id TEXT,
      trip_id TEXT,
      is_refund INTEGER NOT NULL DEFAULT 0,
      note TEXT,
      merchant_name TEXT,
      location TEXT,
      created_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
      updated_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT,
      FOREIGN KEY (target_account_id) REFERENCES accounts(id) ON DELETE RESTRICT,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
      FOREIGN KEY (sub_category_id) REFERENCES categories(id) ON DELETE RESTRICT,
      FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE RESTRICT,
      FOREIGN KEY (related_transaction_id) REFERENCES transactions(id) ON DELETE RESTRICT,
      FOREIGN KEY (original_transaction_id) REFERENCES transactions(id) ON DELETE RESTRICT
    );
    CREATE INDEX IF NOT EXISTS transactions_user_id_date_idx ON transactions(user_id, date);
    CREATE INDEX IF NOT EXISTS transactions_user_id_account_id_date_idx ON transactions(user_id, account_id, date);
    CREATE INDEX IF NOT EXISTS transactions_user_id_category_id_date_idx ON transactions(user_id, category_id, date);
    CREATE INDEX IF NOT EXISTS transactions_user_id_trip_id_date_idx ON transactions(user_id, trip_id, date);

    CREATE TABLE IF NOT EXISTS transaction_items (
      id TEXT PRIMARY KEY NOT NULL,
      transaction_id TEXT NOT NULL,
      name TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 1,
      unit TEXT,
      unit_price REAL NOT NULL DEFAULT 0,
      promotion_amount REAL NOT NULL DEFAULT 0,
      final_amount REAL NOT NULL DEFAULT 0,
      category_id TEXT,
      sub_category_id TEXT,
      created_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
      updated_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
      FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
      FOREIGN KEY (sub_category_id) REFERENCES categories(id) ON DELETE RESTRICT
    );
  `)

  initialized = true
}

export const sqlite = new BetterSqlite3(getDatabasePath())
initializeDatabase(sqlite)

export const db = drizzle(sqlite, { schema })
