-- Email transaction import: IMAP mailbox connections, user-defined import rules,
-- and imported email items (review inbox + dedupe ledger).

CREATE TABLE IF NOT EXISTS email_connections (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  host TEXT NOT NULL DEFAULT 'imap.gmail.com',
  port INTEGER NOT NULL DEFAULT 993,
  username TEXT NOT NULL,
  password_encrypted TEXT NOT NULL,
  folder TEXT NOT NULL,
  parser_key TEXT NOT NULL DEFAULT 'pko-bank-polski',
  default_account_id TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  poll_interval_minutes INTEGER NOT NULL DEFAULT 60,
  uid_validity INTEGER,
  last_seen_uid INTEGER NOT NULL DEFAULT 0,
  last_sync_at INTEGER,
  last_sync_status TEXT,
  last_sync_error TEXT,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
  updated_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (default_account_id) REFERENCES accounts(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS email_connections_user_id_created_at_idx ON email_connections(user_id, created_at);

CREATE TABLE IF NOT EXISTS email_import_rules (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  priority INTEGER NOT NULL,
  match_mode TEXT NOT NULL DEFAULT 'all',
  conditions TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
  updated_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS email_import_rules_user_id_priority_idx ON email_import_rules(user_id, priority);

CREATE TABLE IF NOT EXISTS email_import_items (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  connection_id TEXT NOT NULL,
  uid_validity INTEGER NOT NULL DEFAULT 0,
  message_uid INTEGER NOT NULL,
  message_id TEXT,
  subject TEXT,
  from_address TEXT,
  email_date INTEGER,
  raw_text TEXT,
  status TEXT NOT NULL,
  parsed_json TEXT,
  parse_error TEXT,
  matched_rule_id TEXT,
  transaction_id TEXT,
  error TEXT,
  imported_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
  updated_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (connection_id) REFERENCES email_connections(id) ON DELETE CASCADE,
  FOREIGN KEY (matched_rule_id) REFERENCES email_import_rules(id) ON DELETE SET NULL,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS email_import_items_connection_uid_idx ON email_import_items(connection_id, uid_validity, message_uid);

CREATE INDEX IF NOT EXISTS email_import_items_user_id_status_created_at_idx ON email_import_items(user_id, status, created_at);

CREATE INDEX IF NOT EXISTS email_import_items_connection_id_message_id_idx ON email_import_items(connection_id, message_id);
