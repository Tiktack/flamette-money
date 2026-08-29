# Flamette Money

Flamette Money is a sophisticated personal finance application designed to help users track their multi-currency accounts, categorize transactions with precision, and gain insights through detailed reports.
## Features

- **Account Management**: Manage multi-currency accounts with accurate balances and visual customization (colors).
- **Categories**: Single-table hierarchy support for parent/child categories with strict type matching.
- **Advanced Transactions**:
  - Support for Income, Expense, Transfers, and Refunds.
  - Automatic balance adjustments.
- **Reporting**:
  - Category breakdowns.
  - Time-series analytics.
  - Refund-adjusted expense totals.
- **Search**: Powerful multi-filter transaction search.
- **Multi-currency**: Integration with exchange rate APIs for accurate cross-currency reporting.
- **Trip Tracking**: Organize transactions by trips for better travel expense management.

## Architecture

- **Frontend + server runtime**: TanStack Start full-stack app (source at `src/`).
- **Authentication**: Better Auth with email/password plus optional Google and GitHub social sign-in.
- **Database**: local SQLite (via `better-sqlite3`) shared by the app and auth, accessed through Drizzle ORM. No external/managed database is required.
- **Routing and data**: TanStack Router, TanStack React Query, and TanStack Start server functions.
- **UI**: shadcn/ui components with Tailwind CSS 4.
- **Deployment**: self-hosted Node server; ships as a Home Assistant add-on (see [`docs/home-assistant-addon.md`](docs/home-assistant-addon.md)).

## Project Structure

- `src/routes/`: File-based routes (TanStack Router).
- `src/components/`: Shared UI components.
- `src/lib/`: Database schema, auth config, server utilities.
- `public/`: Static assets.

## Configuration

To run `frontend-new` with the full local TanStack Start stack, configure these environment variables:

- `BETTER_AUTH_SECRET`: Better Auth signing secret.
- `BETTER_AUTH_URL`: Optional explicit app origin for auth callbacks/cookies.
- `BETTER_AUTH_ALLOWED_HOSTS`: Optional comma-separated host patterns for dynamic auth URLs. Defaults to local hosts like `localhost:*`.
- `BETTER_AUTH_TRUSTED_ORIGINS`: Optional comma-separated extra origins Better Auth should trust.
- `BETTER_AUTH_USE_SECURE_COOKIES`: Optional `true`/`false` override. By default derived from `BETTER_AUTH_URL` (https ⇒ secure).
- `DATABASE_URL`: SQLite file path. Defaults to `file:./data/flamette-money.db`.
- `EXCHANGE_RATE_API_KEY`: Optional, enables live FX refreshes.
- `EXCHANGE_RATE_CACHE_HOURS`: Optional FX cache TTL in hours.
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: Optional Google OAuth credentials.
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`: Optional GitHub OAuth credentials.

The SQLite schema is created and kept up to date automatically on startup by applying the SQL files in `migrations/` (tracked in a `_migrations` table).

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (Latest LTS)
- [pnpm](https://pnpm.io/)

### Launching the Application

1. **Configure**: Copy `.env.example` to `.env` and set the values you need (at minimum `BETTER_AUTH_SECRET`).
2. **Run**:
   ```bash
   pnpm install
   pnpm dev
   ```
3. **Explore**: Open the local URL shown by Vite.

### Production (self-hosted Node)

```bash
pnpm build
pnpm start   # serves dist/server/server.js via srvx; honors PORT/HOST
```

## Home Assistant add-on

Flamette Money ships as a Home Assistant add-on so it can run on a Raspberry Pi / Home
Assistant OS with no Cloudflare dependency. Add this repository under
**Settings → Add-ons → Add-on Store → ⋮ → Repositories** and install the add-on.

See [`docs/home-assistant-addon.md`](docs/home-assistant-addon.md) for full setup, exposing
the app via Cloudflare Tunnel, and migrating existing data.

## Demo Data

You can seed the database with demo data directly from the **User Settings** page in the application UI. This will populate the app with common categories, multi-currency accounts, and sample transactions to help you explore the features.
