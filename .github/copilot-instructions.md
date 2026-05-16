# Copilot instructions for Flamette Money

You are working on a personal finance app built as a full-stack TanStack Start application.

Product goals from the specs:
- Foundation: account management with multi-currency accounts and accurate balances.
- Categories: single-table hierarchy with parent/child categories and strict type matching.
- Transactions: income/expense basics plus advanced transfers and refunds that adjust balances correctly.
- Search: multi-filter transactions search.
- Itemization: optional transaction items with per-item amounts and category overrides.
- Reports: category breakdowns and time-series analytics, with refunds reducing expense totals.
- Receipt scanning: AI-assisted receipt parsing to draft transactions (not auto-saved).

Architecture and conventions:
- **Stack**: TanStack Start (Vite + React 19 + TypeScript), TanStack Router (file-based), TanStack React Query, Better Auth, Drizzle ORM, SQLite.
- **UI**: shadcn/ui components with Tailwind CSS 4. Source lives in [src/components](src/components).
- **Routes**: file-based in [src/routes](src/routes); root layout in [src/routes/__root.tsx](src/routes/__root.tsx).
- **Server functions**: data access and mutations use TanStack Start server functions (`createServerFn`). No separate API server.
- **Database**: SQLite via Drizzle ORM. Schema and migrations live in [src/lib/db](src/lib/db).
- **Auth**: Better Auth with email/password. Auth config in [src/lib/auth](src/lib/auth).

Developer workflow:
- Run: `pnpm install` then `pnpm dev` from the repo root.
- App runs at `http://localhost:5174`.
- Environment variables: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `DATABASE_URL`, `OPENROUTER_API_KEY` (optional).

Upcoming features to align with specs (use these as guidance when extending code):
- Reports: category breakdowns and time-series analytics with refund adjustments.
- Transaction items: per-item amounts and category overrides in create/update flows.
- Receipt scanning: `/api/receipts/scan` using OpenRouter, returning draft transaction data only.
