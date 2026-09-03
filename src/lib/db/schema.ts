import { relations, sql } from "drizzle-orm"
import { type AnySQLiteColumn, index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core"

export const accountTypes = ["Cash", "DebitCard", "CreditCard", "Savings"] as const
export const categoryTypes = ["Income", "Expense"] as const
export const subscriptionTypes = ["Free", "Premium"] as const
export const transactionTypes = ["Income", "Expense", "Transfer", "Refund"] as const
export const emailImportItemStatuses = ["pending", "unparsed", "imported", "dismissed", "ignored", "error"] as const
export const emailSyncStatuses = ["ok", "auth_failed", "folder_missing", "network", "error"] as const
export const emailRuleMatchModes = ["all", "any"] as const

const timestampDefault = sql`(cast(unixepoch('subsecond') * 1000 as integer))`

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: integer("email_verified", { mode: "boolean" }).default(false).notNull(),
    image: text("image"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).default(timestampDefault).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).default(timestampDefault).notNull(),
    baseCurrency: text("base_currency").notNull().default("USD"),
    bootstrapCompletedAt: integer("bootstrap_completed_at", { mode: "timestamp_ms" }),
    subscriptionType: text("subscription_type", {
      enum: subscriptionTypes,
    })
      .notNull()
      .default("Free"),
  },
  (table) => [uniqueIndex("users_email_idx").on(table.email)]
)

export const authSessions = sqliteTable(
  "auth_sessions",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    token: text("token").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).default(timestampDefault).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).default(timestampDefault).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => [uniqueIndex("auth_sessions_token_idx").on(table.token), index("auth_sessions_user_id_idx").on(table.userId)]
)

export const authAccounts = sqliteTable(
  "auth_accounts",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", {
      mode: "timestamp_ms",
    }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", {
      mode: "timestamp_ms",
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).default(timestampDefault).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).default(timestampDefault).notNull(),
  },
  (table) => [index("auth_accounts_user_id_idx").on(table.userId)]
)

export const authVerifications = sqliteTable(
  "auth_verifications",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).default(timestampDefault).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).default(timestampDefault).notNull(),
  },
  (table) => [index("auth_verifications_identifier_idx").on(table.identifier)]
)

export const accounts = sqliteTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    currency: text("currency").notNull(),
    color: text("color").notNull(),
    icon: text("icon").notNull(),
    type: text("type", { enum: accountTypes }).notNull(),
    currentBalance: real("current_balance").notNull().default(0),
    // Masked bank account number fragment (e.g. "6630") used by email import to match
    // notification emails to this account.
    bankAccountHint: text("bank_account_hint"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).default(timestampDefault).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).default(timestampDefault).notNull(),
  },
  (table) => [index("accounts_user_id_name_idx").on(table.userId, table.name), index("accounts_user_id_type_idx").on(table.userId, table.type)]
)

export const categories = sqliteTable(
  "categories",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color").notNull(),
    icon: text("icon").notNull(),
    parentId: text("parent_id").references((): AnySQLiteColumn => categories.id, { onDelete: "restrict" }),
    type: text("type", { enum: categoryTypes }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).default(timestampDefault).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).default(timestampDefault).notNull(),
  },
  (table) => [
    index("categories_user_id_name_idx").on(table.userId, table.name),
    index("categories_user_id_type_parent_idx").on(table.userId, table.type, table.parentId),
  ]
)

export const trips = sqliteTable(
  "trips",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    country: text("country"),
    startDate: integer("start_date", { mode: "timestamp_ms" }),
    endDate: integer("end_date", { mode: "timestamp_ms" }),
    imageUrl: text("image_url"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).default(timestampDefault).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).default(timestampDefault).notNull(),
  },
  (table) => [index("trips_user_id_name_idx").on(table.userId, table.name), index("trips_user_id_start_date_idx").on(table.userId, table.startDate)]
)

export const transactions = sqliteTable(
  "transactions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: integer("date", { mode: "timestamp_ms" }).notNull(),
    type: text("type", { enum: transactionTypes }).notNull(),
    amount: real("amount").notNull(),
    amount2: real("amount2"),
    currency: text("currency"),
    currency2: text("currency2"),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    categoryId: text("category_id").references(() => categories.id, {
      onDelete: "restrict",
    }),
    subCategoryId: text("sub_category_id").references(() => categories.id, {
      onDelete: "restrict",
    }),
    targetAccountId: text("target_account_id").references(() => accounts.id, {
      onDelete: "restrict",
    }),
    relatedTransactionId: text("related_transaction_id").references((): AnySQLiteColumn => transactions.id, { onDelete: "restrict" }),
    originalTransactionId: text("original_transaction_id").references((): AnySQLiteColumn => transactions.id, { onDelete: "restrict" }),
    tripId: text("trip_id").references(() => trips.id, {
      onDelete: "restrict",
    }),
    isRefund: integer("is_refund", { mode: "boolean" }).default(false).notNull(),
    note: text("note"),
    merchantName: text("merchant_name"),
    location: text("location"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).default(timestampDefault).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).default(timestampDefault).notNull(),
  },
  (table) => [
    index("transactions_user_id_date_idx").on(table.userId, table.date),
    index("transactions_user_id_date_created_at_idx").on(table.userId, table.date, table.createdAt),
    index("transactions_user_id_type_date_idx").on(table.userId, table.type, table.date),
    index("transactions_user_id_account_id_date_idx").on(table.userId, table.accountId, table.date),
    index("transactions_user_id_category_id_date_idx").on(table.userId, table.categoryId, table.date),
    index("transactions_user_id_trip_id_date_idx").on(table.userId, table.tripId, table.date),
    index("transactions_related_transaction_id_idx").on(table.relatedTransactionId),
    index("transactions_original_transaction_id_idx").on(table.originalTransactionId),
  ]
)

export const emailConnections = sqliteTable(
  "email_connections",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    host: text("host").notNull().default("imap.gmail.com"),
    port: integer("port").notNull().default(993),
    username: text("username").notNull(),
    passwordEncrypted: text("password_encrypted").notNull(),
    folder: text("folder").notNull(),
    parserKey: text("parser_key").notNull().default("pko-bank-polski"),
    defaultAccountId: text("default_account_id").references(() => accounts.id, { onDelete: "set null" }),
    enabled: integer("enabled", { mode: "boolean" }).default(true).notNull(),
    pollIntervalMinutes: integer("poll_interval_minutes").notNull().default(60),
    uidValidity: integer("uid_validity"),
    lastSeenUid: integer("last_seen_uid").notNull().default(0),
    lastSyncAt: integer("last_sync_at", { mode: "timestamp_ms" }),
    lastSyncStatus: text("last_sync_status", { enum: emailSyncStatuses }),
    lastSyncError: text("last_sync_error"),
    consecutiveFailures: integer("consecutive_failures").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).default(timestampDefault).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).default(timestampDefault).notNull(),
  },
  (table) => [index("email_connections_user_id_created_at_idx").on(table.userId, table.createdAt)]
)

export const emailImportRules = sqliteTable(
  "email_import_rules",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    enabled: integer("enabled", { mode: "boolean" }).default(true).notNull(),
    priority: integer("priority").notNull(),
    matchMode: text("match_mode", { enum: emailRuleMatchModes }).notNull().default("all"),
    conditions: text("conditions").notNull(),
    action: text("action").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).default(timestampDefault).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).default(timestampDefault).notNull(),
  },
  (table) => [index("email_import_rules_user_id_priority_idx").on(table.userId, table.priority)]
)

export const emailImportItems = sqliteTable(
  "email_import_items",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    connectionId: text("connection_id")
      .notNull()
      .references(() => emailConnections.id, { onDelete: "cascade" }),
    uidValidity: integer("uid_validity").notNull().default(0),
    messageUid: integer("message_uid").notNull(),
    messageId: text("message_id"),
    subject: text("subject"),
    fromAddress: text("from_address"),
    emailDate: integer("email_date", { mode: "timestamp_ms" }),
    rawText: text("raw_text"),
    status: text("status", { enum: emailImportItemStatuses }).notNull(),
    parsedJson: text("parsed_json"),
    parseError: text("parse_error"),
    matchedRuleId: text("matched_rule_id").references(() => emailImportRules.id, { onDelete: "set null" }),
    transactionId: text("transaction_id").references(() => transactions.id, { onDelete: "set null" }),
    error: text("error"),
    importedAt: integer("imported_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).default(timestampDefault).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).default(timestampDefault).notNull(),
  },
  (table) => [
    uniqueIndex("email_import_items_connection_uid_idx").on(table.connectionId, table.uidValidity, table.messageUid),
    index("email_import_items_user_id_status_created_at_idx").on(table.userId, table.status, table.createdAt),
    index("email_import_items_connection_id_message_id_idx").on(table.connectionId, table.messageId),
  ]
)

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  authAccounts: many(authAccounts),
  authSessions: many(authSessions),
  categories: many(categories),
  trips: many(trips),
  transactions: many(transactions),
  emailConnections: many(emailConnections),
  emailImportRules: many(emailImportRules),
  emailImportItems: many(emailImportItems),
}))

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
  transactions: many(transactions),
}))

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  user: one(users, {
    fields: [categories.userId],
    references: [users.id],
  }),
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
  }),
  children: many(categories),
}))

export const tripsRelations = relations(trips, ({ one, many }) => ({
  user: one(users, {
    fields: [trips.userId],
    references: [users.id],
  }),
  transactions: many(transactions),
}))

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
  account: one(accounts, {
    fields: [transactions.accountId],
    references: [accounts.id],
  }),
  trip: one(trips, {
    fields: [transactions.tripId],
    references: [trips.id],
  }),
}))

export const authSessionsRelations = relations(authSessions, ({ one }) => ({
  user: one(users, {
    fields: [authSessions.userId],
    references: [users.id],
  }),
}))

export const authAccountsRelations = relations(authAccounts, ({ one }) => ({
  user: one(users, {
    fields: [authAccounts.userId],
    references: [users.id],
  }),
}))

export const emailConnectionsRelations = relations(emailConnections, ({ one, many }) => ({
  user: one(users, {
    fields: [emailConnections.userId],
    references: [users.id],
  }),
  defaultAccount: one(accounts, {
    fields: [emailConnections.defaultAccountId],
    references: [accounts.id],
  }),
  items: many(emailImportItems),
}))

export const emailImportRulesRelations = relations(emailImportRules, ({ one, many }) => ({
  user: one(users, {
    fields: [emailImportRules.userId],
    references: [users.id],
  }),
  items: many(emailImportItems),
}))

export const emailImportItemsRelations = relations(emailImportItems, ({ one }) => ({
  user: one(users, {
    fields: [emailImportItems.userId],
    references: [users.id],
  }),
  connection: one(emailConnections, {
    fields: [emailImportItems.connectionId],
    references: [emailConnections.id],
  }),
  matchedRule: one(emailImportRules, {
    fields: [emailImportItems.matchedRuleId],
    references: [emailImportRules.id],
  }),
  transaction: one(transactions, {
    fields: [emailImportItems.transactionId],
    references: [transactions.id],
  }),
}))
