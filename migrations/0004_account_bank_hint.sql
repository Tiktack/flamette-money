-- Email import: accounts learn their bank account number fragment so imported emails
-- ("Twoje konto o numerze 15..6630...") resolve to the right account automatically.

ALTER TABLE accounts ADD COLUMN bank_account_hint TEXT;
