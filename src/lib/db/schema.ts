import { relations, sql } from "drizzle-orm"
import { type AnySQLiteColumn, index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core"

export const accountTypes = ["Cash", "DebitCard", "CreditCard", "Savings"] as const
export const categoryTypes = ["Income", "Expense"] as const
export const subscriptionTypes = ["Free", "Premium"] as const
export const transactionTypes = ["Income", "Expense", "Transfer", "Refund"] as const

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
  ]
)

export const transactionItems = sqliteTable(
  "transaction_items",
  {
    id: text("id").primaryKey(),
    transactionId: text("transaction_id")
      .notNull()
      .references(() => transactions.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    quantity: real("quantity").notNull().default(1),
    unit: text("unit"),
    unitPrice: real("unit_price").notNull().default(0),
    promotionAmount: real("promotion_amount").notNull().default(0),
    finalAmount: real("final_amount").notNull().default(0),
    categoryId: text("category_id").references(() => categories.id, {
      onDelete: "restrict",
    }),
    subCategoryId: text("sub_category_id").references(() => categories.id, {
      onDelete: "restrict",
    }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).default(timestampDefault).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).default(timestampDefault).notNull(),
  },
  (table) => [index("transaction_items_transaction_id_created_at_idx").on(table.transactionId, table.createdAt)]
)

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  authAccounts: many(authAccounts),
  authSessions: many(authSessions),
  categories: many(categories),
  trips: many(trips),
  transactions: many(transactions),
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

export const transactionsRelations = relations(transactions, ({ one, many }) => ({
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
  items: many(transactionItems),
}))

export const transactionItemsRelations = relations(transactionItems, ({ one }) => ({
  transaction: one(transactions, {
    fields: [transactionItems.transactionId],
    references: [transactions.id],
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
