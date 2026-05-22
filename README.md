# Flamette Money

Flamette Money is a sophisticated personal finance application designed to help users track their multi-currency accounts, categorize transactions with precision, and gain insights through detailed reports.

Demo video: [One drive recording](https://1drv.ms/v/c/8ba5588398ffdc42/IQAvCzSkEgudSps3ohrVdpR4AeyTaHfWgvvWkJfkYwKjHLY?e=7aCq8c)

## Features

- **Account Management**: Manage multi-currency accounts with accurate balances and visual customization (colors).
- **Categories**: Single-table hierarchy support for parent/child categories with strict type matching.
- **Advanced Transactions**:
  - Support for Income, Expense, Transfers, and Refunds.
  - Automatic balance adjustments.
  - Transaction itemization with category overrides.
- **Reporting**:
  - Category breakdowns.
  - Time-series analytics.
  - Refund-adjusted expense totals.
- **Receipt Scanning**: AI-assisted receipt parsing to draft transactions from images.
- **Search**: Powerful multi-filter transaction search.
- **Multi-currency**: Integration with exchange rate APIs for accurate cross-currency reporting.
- **Trip Tracking**: Organize transactions by trips for better travel expense management.

## Architecture

- **Frontend + server runtime**: TanStack Start full-stack app (source at `src/`).
- **Authentication**: Better Auth with email/password plus optional Google and GitHub social sign-in.
- **Database**: Cloudflare D1 shared by the app and auth, accessed through Drizzle ORM.
- **Routing and data**: TanStack Router, TanStack React Query, and TanStack Start server functions.
- **UI**: shadcn/ui components with Tailwind CSS 4.

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
- `EXCHANGE_RATE_API_KEY`: Optional, enables live FX refreshes.
- `EXCHANGE_RATE_CACHE_HOURS`: Optional FX cache TTL in hours.
- `OPENROUTER_API_KEY`: Optional, enables AI receipt scanning.
- `OPENROUTER_MODEL`: Optional OpenRouter model override for receipt scanning.
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: Optional Google OAuth credentials.
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`: Optional GitHub OAuth credentials.

The database itself is configured through the Cloudflare `DB` D1 binding in `wrangler.jsonc`, not through a `DATABASE_URL`.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (Latest LTS)
- [pnpm](https://pnpm.io/)

### Launching the Application

1. **Configure**: Set the [environment variables](#configuration) you need.
2. **Run**:
   ```bash
   pnpm install
   # Fill in .dev.vars and wrangler.jsonc first
   pnpm dev
   ```
3. **Explore**: Open the local URL shown by Vite.

## Cloudflare deployment

The app is configured for Cloudflare Workers + D1.

- Worker config: `wrangler.jsonc`
- Initial D1 schema: `migrations/0001_initial.sql`
- Local runtime secrets example: `.dev.vars.example`

See `docs/cloudflare-workers-deployment.md` for the full setup and Workers Builds instructions.

## Demo Data

You can seed the database with demo data directly from the **User Settings** page in the application UI. This will populate the app with common categories, multi-currency accounts, and sample transactions to help you explore the features.
