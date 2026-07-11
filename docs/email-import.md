# Email transaction import

Flamette Money can watch one or more Gmail mailboxes for bank notification emails (PKO Bank Polski today) and turn them into transactions automatically.

## How it works

```
Gmail label ──IMAP poll──▶ fetch new emails ──▶ deterministic parser ──▶ rules engine ──▶ outcome
                                                                                          ├─ auto-created transaction (account + category resolved)
                                                                                          ├─ review inbox item (pending / unparsed / error)
                                                                                          └─ ignored (rule said so)
```

- A background scheduler ticks every minute and syncs each enabled connection when its poll interval (default 60 minutes, configurable per connection) has elapsed. "Sync now" on a connection card runs the same pipeline immediately.
- Emails are fetched incrementally by IMAP UID; every fetched email is recorded in the review inbox ledger, and unique indexes plus RFC822 Message-ID checks make re-syncs idempotent (bank resends and Gmail folder recreation do not duplicate items or transactions).
- Auto-created transactions go through the exact same validated creation path as manual ones (category type checks, ownership checks, account balance updates).

## Setting up a mailbox connection

1. In Gmail, enable 2-Step Verification, then create an **app password** at <https://myaccount.google.com/apppasswords>.
2. Create a Gmail **label** (e.g. `Bank/PKO`) and a **filter** that applies it to the bank's notification emails (e.g. `from:powiadomienia@pkobp.pl`).
3. In the app, go to **Email import → Connections → Add connection**, enter the Gmail address, app password, and the label name, then use **Test connection**.
4. Optionally pick a **default account** — used when a matching rule doesn't assign one.

The app password is encrypted at rest (AES-256-GCM) with a key derived from `EMAIL_IMPORT_ENCRYPTION_KEY`, falling back to `BETTER_AUTH_SECRET`. **Rotating the effective secret invalidates stored passwords** — syncs then fail with "Sign-in failed" until the password is re-entered on the connection.

## Parser status: TO VERIFY

The PKO Bank Polski parser (`src/features/email-import/server/parsers/pko-bank-polski.ts`) is seeded with commonly observed iPKO notification phrases ("Płatność kartą", "Przelew przychodzący", "Dostępne środki", …) but has **not yet been verified against real emails**. Until it is:

- Unrecognized emails are kept in the **review inbox** with status **Unparsed** and their full raw text preserved.
- To finalize the parser: open a few unparsed items, read the raw text, adjust the matcher table / extraction regexes (all marked `TO VERIFY against real template`), then press **Re-parse** — the stored history is re-processed through the parser and rules without refetching mail, auto-creating transactions where possible.
- Card authorization holds ("blokada środków") are deliberately not matched to avoid double-importing a hold plus its settlement; revisit once real templates confirm which notifications PKO sends.

## Rules

Rules live under **Email import → Rules** and run top to bottom on every parsed email; **the first matching rule wins**.

- **Conditions** on parsed fields: merchant / description / account hint (contains, is exactly — case-insensitive), amount (at least / at most / between), currency, direction (money in / money out), and source connection. A rule matches **all** or **any** of its conditions; a rule with no conditions matches every email (useful as a catch-all last rule).
- **Actions**: assign an account, category + subcategory, and note — or **ignore** the email entirely.
- **Auto-create** happens only when the email resolves to both an account (from the rule or the connection default) and a category whose type matches the direction. Anything else waits in the review inbox with whatever the rule did provide pre-filled.
- The rule editor shows a **live preview** against the ~50 most recently parsed emails.
- Rules reference accounts/categories by id; if a referenced entity is later deleted, the rule row shows a "Broken reference" badge and affected emails fall back to the review inbox.

## Review inbox

Statuses: **To review** (parsed, needs a decision), **Unparsed**, **Error** (auto-create failed), **Imported**, **Ignored**, **Dismissed**. Approving an item opens the transaction editor pre-filled from the parsed email plus rule output; saving creates the transaction and links it to the item. Dismissed/ignored items can be restored.

Deleting a connection deletes its import history (items and dedupe records) — already-created transactions stay. Deleting an imported transaction keeps the item, shown as "transaction deleted".

## Operations

- **Scheduler**: starts lazily on the first HTTP request (the Home Assistant watchdog polls `/api/healthz` right after boot, and any authenticated request also triggers it). Failed connections back off exponentially (2× per consecutive failure, capped at 24 h).
- **Batch size**: at most `EMAIL_IMPORT_MAX_MESSAGES_PER_SYNC` (default 50) emails per sync per connection; larger backlogs drain across consecutive runs.
- **Environment variables** (all optional; also exposed as Home Assistant add-on options):
  - `EMAIL_IMPORT_ENCRYPTION_KEY` — dedicated secret for encrypting mailbox passwords; falls back to `BETTER_AUTH_SECRET`.
  - `EMAIL_IMPORT_DEFAULT_POLL_MINUTES` — default poll interval for new connections (60).
  - `EMAIL_IMPORT_MAX_MESSAGES_PER_SYNC` — per-run fetch cap (50).

## Data model

Three tables (migration `0003_email_import.sql`): `email_connections` (mailbox credentials + sync cursor + health), `email_import_rules` (priority-ordered conditions/action JSON, zod-validated on read and write), and `email_import_items` (one row per fetched email: raw text, parsed payload, status, links to the matched rule and created transaction).
