# Flamette Money

Flamette Money is a sophisticated personal finance application designed to help users track their multi-currency accounts, categorize transactions with precision, and gain insights through detailed reports.

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
- **Receipt Scanning**: AI-assisted receipt parsing (powered by Gemini Flash) to draft transactions from images.
- **Search**: Powerful multi-filter transaction search.
- **Multi-currency**: Integration with exchange rate APIs for accurate cross-currency reporting.
- **Trip Tracking**: Organize transactions by trips for better travel expense management.

## Architecture

### Backend
- **Framework**: `.NET 10` (Minimal APIs).
- **Orchestration**: `.NET Aspire` for local development.
- **Organization**: `Carter` modules for clean endpoint separation.
- **Database**: `SQLite` with `Entity Framework Core`.
- **Validation**: `FluentValidation` with automatic mapping to `TypedResults`.
- **Documentation**: `OpenAPI` (scalar) at `/openapi/v1`.

### Frontend
- **Framework**: `React 19` + `Vite` + `TypeScript`.
- **UI Library**: `Mantine UI` (v8) with `@tabler/icons-react`.
- **Data Fetching**: `@tanstack/react-query`.
- **Routing**: `@tanstack/react-router` (file-based routing).
- **API Client**: Type-safe client generated via `openapi-ts`.

## Project Structure

- `backend/FlametteMoney.AppHost`: Aspire orchestration project.
- `backend/FlametteMoney.Web`: Main API project.
- `frontend/src`: React application sources.

## Configuration

To run the application with all features enabled, you need to configure the following in `backend/FlametteMoney.Web/appsettings.json` (or use user-secrets):

- **Google Authentication**: Required for user login.
    - `Authentication:Google:ClientId`
    - `Authentication:Google:ClientSecret`
- **Gemini AI**: Required for receipt scanning features.
    - `Gemini:ApiKey`
- **ExchangeRate-API**: Required for accurate multi-currency conversions.
    - `ExchangeRateApi:ApiKey` (obtain from [v6.exchangerate-api.com](https://v6.exchangerate-api.com))

## Getting Started

### Prerequisites
- [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) or Podman (required for Aspire)
- [Node.js](https://nodejs.org/) (Latest LTS)

### Launching the Application

The project is fully orchestrated with [.NET Aspire](https://learn.microsoft.com/en-us/dotnet/aspire/get-started/aspire-overview). Aspire manages the backend, the frontend dependencies (`npm install`), and the development server lifecycle.

1. **Configure**: Ensure you have configured the [API keys](#configuration).
2. **Run**:
   ```bash
   cd backend/FlametteMoney.AppHost
   dotnet run
   ```
3. **Explore**: Open the **Aspire Dashboard** link provided in the terminal to access the API and Frontend.

## Demo Data


You can seed the database with demo data directly from the **User Settings** page in the application UI. This will populate the app with common categories, multi-currency accounts, and sample transactions to help you explore the features.

