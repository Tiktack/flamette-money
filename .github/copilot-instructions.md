# Copilot instructions for Flamette Money

You are working on a personal finance app with two projects:
- Backend: ASP.NET Core Minimal APIs with Carter modules in [FlametteMoney/FlametteMoney.Web](FlametteMoney/FlametteMoney.Web).
- Frontend: Vite + React 19 + TypeScript in [frontend](frontend) with Mantine UI, React Query, and TanStack Router (file-based).

Product goals from the specs:
- Foundation: account management with multi-currency accounts and accurate balances.
- Categories: single-table hierarchy with parent/child categories and strict type matching.
- Transactions: income/expense basics plus advanced transfers and refunds that adjust balances correctly.
- Search: multi-filter transactions search endpoint.
- Itemization: optional transaction items with per-item amounts and category overrides.
- Reports: category breakdowns and time-series analytics, with refunds reducing expense totals.
- Receipt scanning: AI-assisted receipt parsing to draft transactions (not auto-saved).

Backend architecture and conventions:
- Endpoints live under [FlametteMoney/FlametteMoney.Web/Features](FlametteMoney/FlametteMoney.Web/Features). Each endpoint class implements `ICarterModule` with a static handler and `Task<Results<...>>` return types (see [FlametteMoney/FlametteMoney.Web/Features/Transactions/CreateTransactionEndpoint.cs](FlametteMoney/FlametteMoney.Web/Features/Transactions/CreateTransactionEndpoint.cs)).
- Use `TypedResults` and `ProducesValidationProblem()`; validators live in the same feature folder and map errors via [FlametteMoney/FlametteMoney.Web/Infrastructure/Validation/ValidationResultExtensions.cs](FlametteMoney/FlametteMoney.Web/Infrastructure/Validation/ValidationResultExtensions.cs).
- EF Core uses SQLite and `AppDbContext`. Migrations run on startup in [FlametteMoney/FlametteMoney.Web/Program.cs](FlametteMoney/FlametteMoney.Web/Program.cs). Entity configs belong in [FlametteMoney/FlametteMoney.Web/Infrastructure/Database/Configurations](FlametteMoney/FlametteMoney.Web/Infrastructure/Database/Configurations).
- Domain rules live in transaction endpoints: transfers, refunds, and balance updates in [FlametteMoney/FlametteMoney.Web/Features/Transactions](FlametteMoney/FlametteMoney.Web/Features/Transactions).
- Demo data can be seeded at POST `/api/seed/demo` via [FlametteMoney/FlametteMoney.Web/Features/Seed/SeedDemoEndpoint.cs](FlametteMoney/FlametteMoney.Web/Features/Seed/SeedDemoEndpoint.cs).

Frontend architecture and conventions:
- Routes are file-based in [frontend/src/routes](frontend/src/routes); root layout is defined in [frontend/src/routes/__root.tsx](frontend/src/routes/__root.tsx).
- Global providers are set in [frontend/src/main.tsx](frontend/src/main.tsx) (Mantine, React Query, Router, devtools).
- API calls go through React Query hooks in [frontend/src/lib/api/hooks.ts](frontend/src/lib/api/hooks.ts) which call `apiGet` in [frontend/src/lib/api/client.ts](frontend/src/lib/api/client.ts). `VITE_API_BASE_URL` controls the host; add a Vite proxy for `/api` when needed.
- UI style intent: a dashboard shell with top nav, submenu actions, cards, and charts using Mantine defaults plus light CSS modules.

Developer workflows:
- Backend: `dotnet run` in [FlametteMoney/FlametteMoney.Web](FlametteMoney/FlametteMoney.Web). Ports are in [FlametteMoney/FlametteMoney.Web/Properties/launchSettings.json](FlametteMoney/FlametteMoney.Web/Properties/launchSettings.json).
- Frontend: `npm install` then `npm run dev` in [frontend](frontend).
- CORS dev policy is `FrontendDev` allowing http://localhost:5174 in [FlametteMoney/FlametteMoney.Web/Program.cs](FlametteMoney/FlametteMoney.Web/Program.cs); keep Vite and CORS aligned.

Upcoming features to align with specs (use these as guidance when extending code):
- Reports endpoints under `/api/reports/*` for category breakdowns and time series, with refund adjustments.
- Transaction items support in create/update payloads and storage.
- Receipt scanning endpoint `/api/receipts/scan` using Gemini Flash, returning draft transaction data only.
