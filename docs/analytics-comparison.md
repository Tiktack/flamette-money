# Analytics — Compare

The Compare page (`/analytics/compare`) puts two periods side by side and explains
the difference between them. It complements the single-range Cashflow, Categories,
and Portfolio pages, which each answer "what happened in this window"; Compare
answers "how does period A stack up against period B".

## Period selection

Two periods (A = primary, B = baseline) are chosen with `ComparePeriodToolbar`,
backed by the pure resolver in `src/lib/compare-periods.ts`:

- **Month** — pick a month (A); compare against the **previous month** or the
  **same month last year**.
- **Year** — pick a year (A); B is the preceding year.
- **Custom** — two independent date ranges.

The resolver returns concrete `{ start, end, label }` for A and B. The page sends
them to the server as `PeriodAStart/End` and `PeriodBStart/End`.

## Server

`getComparisonReportData` (`src/features/reports/server/service.server.ts`,
exposed via `getComparisonReport`) reuses the existing report primitives
(`buildBuckets`, `resolveBucketKey`, `convertAmount`, `getSignedAmount`,
`calculateSavingsRate`). It returns:

- `periodA` / `periodB` summaries — income, spending, net, savings rate, day count.
- `series` — per-bucket income/spending/net for both periods, **aligned by ordinal
  position** (bucket index), not absolute date, so day 1 lines up with day 1 and
  month 1 with month 1 regardless of the calendar gap. Both periods share one
  interval (resolved from period A) to keep buckets comparable.
- `categoryMovers` — top-level category totals for the selected `Type`
  (Expense/Income) in each period, with `delta` and `deltaPercent`, sorted by the
  size of the change.

## Conventions inherited from the other reports

- All values are converted to the user's base currency at **current** FX rates, so
  a year-over-year comparison is constant-currency (it reflects behaviour, not
  exchange-rate drift).
- Refunds reduce spending (`getSignedAmount` / `getSpendingAmount`).
- `deltaPercent` is `null` when the baseline (period B) is zero; the UI shows
  "New" in that case. The savings-rate card reports its delta in percentage
  **points** rather than a percentage of a percentage.
