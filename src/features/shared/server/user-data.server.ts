import { and, eq, isNotNull, isNull } from "drizzle-orm"

import type { AppTransaction } from "@/lib/db/client.server"
import { accounts, categories, emailConnections, emailImportItems, emailImportRules, transactions, trips } from "@/lib/db/schema"

/**
 * Deletes every row owned by the user in dependency order. Synchronous on purpose so it can
 * run inside `runDbTransaction` — a failed wipe or re-import then rolls back atomically.
 */
export function clearUserScopedData(tx: AppTransaction, userId: string) {
  // Email import first: items reference transactions/rules/connections, and removing the
  // connections also stops the background scheduler from repopulating the "erased" profile.
  // Without this, a data wipe would leave the encrypted mailbox password and stored raw
  // bank emails behind.
  tx.delete(emailImportItems).where(eq(emailImportItems.userId, userId)).run()
  tx.delete(emailImportRules).where(eq(emailImportRules.userId, userId)).run()
  tx.delete(emailConnections).where(eq(emailConnections.userId, userId)).run()

  // Self-referencing transaction FKs use ON DELETE RESTRICT, so break the links first.
  tx.update(transactions)
    .set({
      originalTransactionId: null,
      relatedTransactionId: null,
    })
    .where(eq(transactions.userId, userId))
    .run()

  // transaction_items.transaction_id uses ON DELETE CASCADE, so removing
  // the user's transactions also clears their items without chunked deletes.
  tx.delete(transactions).where(eq(transactions.userId, userId)).run()
  tx.delete(trips).where(eq(trips.userId, userId)).run()
  tx.delete(categories)
    .where(and(eq(categories.userId, userId), isNotNull(categories.parentId)))
    .run()
  tx.delete(categories)
    .where(and(eq(categories.userId, userId), isNull(categories.parentId)))
    .run()
  tx.delete(accounts).where(eq(accounts.userId, userId)).run()
}
