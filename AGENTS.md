# AGENTS.md

This is the primary agent guide for **Flamette Money**.

## Project summary

Flamette Money is a full-stack **TanStack Start** personal finance app focused on:

- multi-currency accounts with accurate balances
- hierarchical income and expense categories
- transactions with transfers, refunds, search, and optional itemization
- analytics and reporting with FX conversion
- AI-assisted receipt scanning that returns **draft data only**
- automatic email transaction import from bank notification mailboxes (IMAP polling + rules engine; see `docs\email-import.md`)

## Documentation policy

- `docs\` is the living documentation folder and should be treated as the main documentation source.
- If you change behavior, flows, or domain rules, update the relevant file in `docs\`.
- Older markdown files outside `docs\` may lag behind and should not be treated as the main source of product guidance.
- Code remains the implementation truth if documentation and implementation temporarily diverge.

## Stack

- **Framework:** TanStack Start + Vite + React 19 + TypeScript
- **Routing:** TanStack Router file-based routes
- **Server data layer:** `createServerFn` server functions
- **Server-only endpoints:** route handlers under `src\routes\api\`
- **Auth:** Better Auth with Drizzle adapter and TanStack Start cookies
- **Database:** SQLite via `better-sqlite3` + Drizzle ORM
- **State/query:** TanStack React Query
- **UI:** shadcn/ui + Tailwind CSS 4
- **Charts/tables:** bklit charts (`src\components\charts\`, visx + motion, added via the `@bklit` shadcn registry) + TanStack Table
- **Validation:** Zod

## Repository layout

- `src\routes\` — file-based routes and API-style handlers
- `src\features\` — feature modules with hooks, query options, types, services, and server functions
- `src\features\shared\server\` — shared server building blocks: `lookups.server.ts` (requireUser/requireAccount/…), `normalizers.server.ts`, `validators.ts` (zod schemas), `fx.server.ts` (currency conversion helpers), `user-data.server.ts` (user data wipe)
- `src\lib\` — auth, db, env, bootstrap, currency, exchange rates, utilities
- `src\components\` — shared app components
- `src\components\ui\` — shadcn/ui primitives
- `src\styles.css` — theme tokens and global styles
- `public\` — static assets

## Route and data flow

- `src\routes\__root.tsx` sets up the query client, tooltips, and document shell.
- `src\routes\_protected.tsx` is the authenticated layout and redirects unauthenticated users to `/sign-in`.
- Protected pages live under `src\routes\_protected\`.
- Use `src\routes\api\` only when raw `Request`/`Response`, upload, or download handling is needed.

Preferred implementation path for most product changes:

1. update validators or feature types
2. update service logic in the feature's `service.server.ts` (shared rules live in `src\features\shared\server\`)
3. expose through feature `server\functions.ts`
4. wire query options and hooks
5. update route and component usage

Components should usually consume feature hooks and query options rather than calling low-level server functions directly.

## Core domain rules

Main tables live in `src\lib\db\schema.ts`. The SQLite schema is created and kept current on startup by the migration runner in `src\lib\db\migrate.server.ts`, which applies the SQL files in `migrations\` (recorded in a `_migrations` table) and is wired from `src\lib\db\client.server.ts`.

- Supported currencies are `PLN`, `USD`, `EUR`, `GBP`, and `CAD`.
- Categories use one self-referential table and parent and child types must match.
- Default categories are seeded by `ensureUserBootstrap()`.
- Transfers must match source and target account currencies.
- Refunds must point to an original expense transaction and preserve account/category alignment.
- Transaction items are optional and create/update flows replace stored items explicitly.
- Receipt scanning returns draft data only and does not create transactions.
- Reports convert values into the user's base currency and treat refunds as expense-reducing values.

## Auth and data conventions

- Better Auth configuration lives in `src\lib\auth\config.server.ts`.
- Use `getSessionData()` or `requireSessionData()` in server-side code.
- Use `authClient` in browser code.
- Keep auth URL, trusted origins, and provider config centralized in `src\lib\env.server.ts`.
- Reuse `normalizeCurrencyOrDefault()` and `normalizeCurrencyOrNull()` from `src\lib\currency.ts`.
- Keep request validation in Zod and business invariants in server code.
- Prefer explicit thrown errors over silent fallbacks.
- Reuse `src\lib\db\sqlite-batch.server.ts` for bulk SQLite work.
- Wrap multi-write operations in `runDbTransaction()` from `src\lib\db\client.server.ts` (synchronous callback; use Drizzle's `.run()`/`.all()`/`.get()` inside).
- Raw route handlers reuse `HttpError`/`fail`/`requireUserForRequest`/`toErrorResponse` from `src\lib\server\http.server.ts`.

## UI conventions

- Reuse existing shadcn/ui primitives from `src\components\ui\`.
- Follow the established theme tokens in `src\styles.css`.
- Financial values should usually use tabular numbers.
- Prefer existing higher-level components when possible, especially `AppSidebar`, `SiteHeader`, `MetricCard`, `DataTable`, `SharedDateRangeToolbar`, and `TransactionEditorDialog`.

## Environment variables

Use `.env.example` as the current environment reference.

- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `BETTER_AUTH_ALLOWED_HOSTS`
- `BETTER_AUTH_TRUSTED_ORIGINS`
- `BETTER_AUTH_USE_SECURE_COOKIES`
- `DATABASE_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL`
- `EMAIL_IMPORT_ENCRYPTION_KEY`
- `EMAIL_IMPORT_DEFAULT_POLL_MINUTES`
- `EMAIL_IMPORT_MAX_MESSAGES_PER_SYNC`

## Commands

- `pnpm install`
- `pnpm dev`
- `pnpm build`
- `pnpm lint`
- `pnpm lint:fix`
- `pnpm format`
- `pnpm format:check`
- `pnpm typecheck`

Do **not** use `pnpm test` as part of normal workflow in this repo. There are currently no committed tests, and the command only fails because no test files exist.

## Generated files

- `src\routeTree.gen.ts` is generated by the TanStack Router plugin.
- Do not hand-edit generated router output unless there is a specific reason.

## Practical guidance

- Prefer extending existing feature modules over creating parallel patterns.
- Keep finance rules centralized in shared server code instead of duplicating them in routes or components.
- If you change behavior, make the matching docs update in `docs\`.
- Be conservative when touching auth, env handling, currency normalization, or reporting math.
