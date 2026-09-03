CREATE INDEX IF NOT EXISTS transactions_related_transaction_id_idx
  ON transactions(related_transaction_id);

CREATE INDEX IF NOT EXISTS transactions_original_transaction_id_idx
  ON transactions(original_transaction_id);
