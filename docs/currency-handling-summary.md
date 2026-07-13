# Currency Handling Summary

Last updated: 2026-07-04

## Scope

Currency and FX behavior for accounts, transfers, refunds, and analytics/report conversion in the TanStack Start server code.

## Product rules

1. Supported currencies

- `PLN`, `USD`, `EUR`, `GBP`, `CAD` — single source in `src/lib/currency.ts` (`supportedCurrencies`).
- Request payload currencies are validated against this list via `normalizeCurrencyOrDefault()` / `normalizeCurrencyOrNull()` and the shared normalizers.
- The client reads the list from `GET /api/app-info` (see `src/features/app/`), cached indefinitely on the client.

2. Transfers

- Source currency is locked to the source account currency; target currency to the target account currency.
- The server rejects transfer requests whose currencies do not match the account currencies (`validateTransactionRequest` in `src/features/transactions/server/service.server.ts`).
- Amounts (`amount`, `amount2`) remain user-editable.

3. Refunds

- A refund inherits the original expense's currency by default (falling back to the account currency), so reports subtract it at the same rate it was added.
- Refunds are treated as expense-reducing in all reports **and** in the transactions-page summary (`searchTransactionsSummaryData`), so page totals match analytics.

4. Base-currency conversion for analytics/reporting

- Report endpoints convert values into the user's base currency on the server.
- Accounts and the transactions list stay in account/transaction currency (no conversion there).
- Shared conversion helpers live in `src/features/shared/server/fx.server.ts`: `convertAmountToBase()`, `loadAccountCurrencyMap()`, `resolveTransactionCurrency()`. Reports, trips, and the transactions summary all use them.

## Exchange rates

- `src/lib/exchange-rate.server.ts` fetches `https://v6.exchangerate-api.com/v6/<key>/latest/<base>` and normalizes to rates-to-base.
- Snapshots are cached in memory for `EXCHANGE_RATE_CACHE_HOURS` (default 5 h).
- Without an API key, or when a fetch fails, hardcoded approximate fallback rates are used. Failure-path fallbacks are cached for at most 5 minutes so a transient outage does not pin stale rates for the full TTL.

## Configuration

`.env` (see `.env.example`):

```
EXCHANGE_RATE_API_KEY=<your-api-key>
EXCHANGE_RATE_CACHE_HOURS=5
```

## Operational notes

- If the ExchangeRate API is unavailable, fallback rates keep reports operational (marked internally via `usedFallback`).
- Balance updates run inside SQLite transactions with SQL-side arithmetic (`runDbTransaction` in `src/lib/db/client.server.ts`), so FX-related multi-write flows are atomic.
