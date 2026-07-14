ALTER TABLE users ADD COLUMN bootstrap_completed_at INTEGER;

UPDATE users
SET bootstrap_completed_at = created_at
WHERE EXISTS (
  SELECT 1
  FROM categories
  WHERE categories.user_id = users.id
);

CREATE INDEX IF NOT EXISTS transactions_user_id_date_created_at_idx
  ON transactions(user_id, date, created_at);

CREATE INDEX IF NOT EXISTS transactions_user_id_type_date_idx
  ON transactions(user_id, type, date);

PRAGMA optimize;
