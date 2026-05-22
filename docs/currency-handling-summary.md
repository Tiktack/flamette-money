# Currency Handling Summary

Last updated: 2026-02-15

## Scope implemented

This summary covers the currency and FX implementation for account transfers, analytics/report conversions, and receipt scan behavior.

## Product rules implemented

1. Transfer currency locking

- For transfer transactions, source currency is locked to source account currency.
- Target currency is locked to target account currency.
- User can still edit source and target amounts.
- Backend validates and rejects transfer requests if provided currencies do not match account currencies.

2. Base currency conversion for analytics/reporting

- Analytics/report endpoints now return values converted to user base currency.
- Accounts and transaction page semantics remain account/transaction currency oriented (no conversion there).

3. Exchange rates integration

- Uses ExchangeRate API standard latest endpoint response shape with `base_code` and `conversion_rates`.
- FX data is cached in memory for 5 hours.
- Retries are implemented via Polly with short backoff.
- If live API cannot be used, predefined fallback rates are used.

4. Receipt scan behavior

- Receipt scan now returns draft data only.
- No transaction is auto-created and no account balance is mutated by scan endpoint.

## Backend architecture changes

### New shared currency source

- Added supported currency catalog in Infrastructure.
- Current supported list: PLN, USD, EUR, GBP, CAD.
- Used as the single source for validating API request currency fields.

### New app metadata endpoint

- Added `GET /api/app-info`.
- Returns supported currencies for frontend configuration and future shared app metadata.

### FX service

- Added exchange rate options section (`ExchangeRateApi`) for API key/base URL/cache hours.
- Added centralized exchange rate service in Infrastructure:
  - Uses `IHttpClientFactory`.
  - Uses Polly retry policy.
  - Uses memory cache.
  - Exposes normalized rates-to-base for reporting services.

### Reports and trips

- Category series, monthly YoY, and portfolio balance series use backend FX conversion.
- Trips totals are computed in base currency on backend.

### Validation strategy

- API request payloads that include currency are validated against supported currencies.
- Read path and DB currency usage assume persisted data is valid and trusted.

## Frontend integration changes

1. Supported currency source

- Settings and transaction editor currency options consume `GET /api/app-info`.
- Removed local hardcoded currency assumptions as the primary source.
- Settings base-currency changes now save immediately on selection without a separate save button.

2. Transfer UX behavior

- Transfer currency selectors are effectively locked to account currencies.
- Amount and amount2 remain user-editable.

3. Formatting in converted views

- Categories, analytics comparison, analytics portfolio, and trips display currency-formatted values based on backend base-currency response context.

4. Receipt scan UX

- Updated from “transaction created” flow to draft/pre-fill flow.
- No immediate transaction persistence side effects from scan.

## Configuration

`backend/FlametteMoney.Web/appsettings.Development.json` should include:

```json
"ExchangeRateApi": {
  "ApiKey": "<your-api-key>",
  "BaseUrl": "https://v6.exchangerate-api.com",
  "CacheHours": 5
}
```

## Operational notes

- If ExchangeRate API is unavailable, fallback rates are used to keep reports operational.
- OpenAPI is regenerated during frontend build pipeline and reflects report contract changes.

## Follow-up recommendations

- Add focused API tests for:
  - transfer currency mismatch validation,
  - FX conversion consistency in reports,
  - receipt scan draft-only behavior.
- Consider moving sensitive keys to user secrets/environment variables for local and production safety.
