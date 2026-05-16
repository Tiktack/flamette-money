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

### Active app
- **Frontend + server runtime**: `frontend-new` is now a `TanStack Start` full-stack app.
- **Authentication**: `Better Auth` with email/password sign-up and sign-in.
- **Database**: local `SQLite` shared by the app and auth, accessed through `Drizzle ORM`.
- **Routing and data**: `TanStack Router`, `TanStack React Query`, and TanStack Start server functions/routes.
- **UI**: the existing React UI and feature set are preserved, but the app is no longer wired to the .NET API.

### Legacy backend
- The original `.NET 10` backend under `backend/FlametteMoney.Web` is still in the repository during the migration.
- It remains useful as reference/source material, but `frontend-new` is intended to run independently of it.

## Project Structure

- `backend/FlametteMoney.AppHost`: Aspire orchestration project.
- `backend/FlametteMoney.Web`: Main API project.
- `frontend-new/src`: Active TanStack Start application sources.
- `frontend/src`: Older frontend kept in the repository during the migration.

## Configuration

To run `frontend-new` with the full local TanStack Start stack, configure these environment variables:

- `BETTER_AUTH_SECRET`: Better Auth signing secret.
- `BETTER_AUTH_URL`: App origin for auth callbacks/cookies. Defaults to `http://localhost:5174`.
- `DATABASE_URL`: SQLite path. Defaults to `file:./data/flamette-money.db`.
- `OPENROUTER_API_KEY`: Optional, enables AI receipt scanning.
- `OPENROUTER_MODEL`: Optional OpenRouter model override for receipt scanning.

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (Latest LTS)
- [pnpm](https://pnpm.io/)

### Launching the Application

The active app runs directly from `frontend-new` with `pnpm`.

1. **Configure**: Set the [environment variables](#configuration) you need.
2. **Run**:
   ```bash
   cd frontend-new
   pnpm install
   pnpm dev
   ```
3. **Explore**: Open `http://localhost:5174`.

## Demo Data


You can seed the database with demo data directly from the **User Settings** page in the application UI. This will populate the app with common categories, multi-currency accounts, and sample transactions to help you explore the features.

