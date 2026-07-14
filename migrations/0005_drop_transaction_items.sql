-- Receipt scanning and per-transaction line items were removed from the app, and the
-- table no longer exists in 0001 for fresh databases (no-op there). Databases created
-- before the removal still have it, and its ON DELETE RESTRICT foreign keys to
-- categories would block category deletion — so drop it.
DROP TABLE IF EXISTS transaction_items;
