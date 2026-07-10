# Codebase review and remediation plan — July 2026

Full review of the app code (features, routes, lib, shared components). Vendored UI (`src/components/ui/`, `src/components/charts/`) was checked for reachability and obvious defects only.

Baseline at review time: `pnpm typecheck` and `pnpm lint` clean; working tree clean at commit `206a594`.

Each item lists a status: **fixed** (done in this pass), **deferred** (documented, needs product decision or larger effort).

---

## 1. Critical — data safety (server)

### 1.1 No multi-write operation runs in a DB transaction — status: fixed

`runWithDb` (`src/lib/db/client.server.ts`) is a plain passthrough; nothing in `src/` opens a SQLite transaction. Affected: transaction create/update/delete (balance update + row write), backup import (**wipes all user data, then inserts**), settings reset, demo seed. A mid-sequence failure permanently desyncs account balances, or in the import case destroys the user's data with nothing restored.

Fix: added `runDbTransaction()` using Drizzle's synchronous better-sqlite3 transaction; all multi-write paths now run inside it. Balance updates use SQL-side arithmetic (`current_balance = current_balance + ?`), which also removes the read-modify-write race and the stale-refresh choreography in `updateTransactionData`.

### 1.2 Backup import trusts client-supplied primary keys — status: fixed

`importFlametteBackup` inserted `row.id` verbatim from the uploaded XLSX. IDs are global TEXT PKs, so a file containing an existing ID (yours or another user's) threw `UNIQUE constraint` _after_ the wipe. Fix: all imported rows get freshly generated IDs with an old→new mapping for references (account/category/trip/related/original). Combined with 1.1, imports are now atomic.

### 1.3 Deleting a refunded expense corrupts balances — status: fixed

`deleteTransactionData` reverted balances before the row delete; the `original_transaction_id` FK (RESTRICT) then aborted the delete, leaving balances wrong. Fix: friendly pre-check for dependent refunds + the whole operation is atomic now.

### 1.4 Missing guards that let invariants break — status: fixed

- Updating an expense referenced by refunds could change its type/account/category (and a transaction could become a refund of _itself_).
- Refund creation didn't inherit the original expense's currency (recorded in account currency → wrong FX in reports).
- Re-parenting a category with children created >1 nesting level, which reports and import assume is impossible.
- Account delete only checked `accountId`, not `targetAccountId` (raw FK error for transfer targets); category delete didn't check transaction items or child categories.

### 1.5 Transaction item categories not scoped to the user — status: fixed

`buildTransactionItems` copied `item.categoryId`/`subCategoryId` into inserts without ownership checks — another user's category IDs could be attached (ID-existence oracle). Now validated with the same lookups as transaction-level categories.

### 1.6 No upload size limits — status: fixed

Backup import buffered the whole file into memory and into `XLSX.read` (zip amplification); receipt scan base64-encoded unbounded images. Added size caps (backup 25 MB, receipt image 10 MB).

---

## 2. High — correctness bugs

### 2.1 Report day-buckets are wrong on non-UTC servers — status: fixed

Day bucket keys were built from **local** midnights serialized via UTC `toISOString()`, while transactions were keyed by their UTC date — on a UTC+2 server, amounts land in the previous day's bucket and last-day transactions vanish from the series (series sum ≠ total). `startOfDay`/`endOfDay` in `parsing.server.ts` were local while demo-seed used UTC. Fixed by using UTC day semantics consistently in report bucketing and day-range parsing.

### 2.2 Portfolio report leaks phantom balances for filtered-out accounts — status: fixed

`rollbackBalanceDelta` inserted map entries for unselected transfer endpoints, which were then summed into `totalBalance` and returned in the payload. Rollback now only touches selected accounts.

### 2.3 `reports-comparison` cache never invalidated — status: fixed

The query key existed but appeared in no invalidation list — the compare page stayed stale after any transaction/settings/import/reset mutation. Added to `reportInvalidations`; also added `authMe` to `fullDataRefreshInvalidations` (backup import can change base currency) and routed category mutations through a shared list that includes category reports (renames/recolors now refresh analytics).

### 2.4 Logout doesn't clear the query cache — status: fixed

`_protected.tsx` called `authClient.signOut` directly; the `useLogout` hook that does `queryClient.clear()` was dead code. On shared machines the next login could see the previous user's cached data for up to 60 s. The layout now uses the hook.

### 2.5 Transactions page summary disagrees with analytics on refunds — status: fixed

`searchTransactionsSummaryData` ignored refunds entirely while all reports treat them as expense-reducing — page totals never matched analytics for users with refunds. The summary now subtracts refunds from expenses.

### 2.6 Document `<title>` never rendered — status: fixed

`__root.tsx` put `title:` at the top level of `head()`, which TanStack Router ignores (only `meta`/`links`/`scripts`/`styles` are read). Moved to `meta: [{ title }]` and added per-page titles.

### 2.7 Transaction editor bugs — status: fixed

- Line-item **name input lost focus on every keystroke** (React key derived from the typed value).
- Default date used UTC (`toISOString`), so near midnight in UTC+ timezones new transactions defaulted to _yesterday_.
- Background refetches (window refocus, other mutations) silently reset an **open** dialog's unsaved edits — the reset effect now only runs when the dialog opens.
- Transfer-to-self was possible by changing the source after picking a target.

### 2.8 Other page bugs — status: fixed

- Breadcrumb "Analytics" linked to `/analytics`, which had no index route (not-found outlet). Added an index redirect to `/analytics/cashflow`.
- Compare month-mode select and account-type select showed raw enum values (`previousMonth`, `DebitCard`) — missing Base UI `items` prop / labels.
- Compare chart drew non-monotonic dates (fell back to period B's bucket keys) — x-values now come from period A's timeline only, extrapolated by the report interval when A is shorter. Missing values still render as 0 (the vendored line chart maps null to the top of the plot, which is worse); tooltips correctly show "—" for missing data.
- Portfolio fired the report twice (first with hardcoded `"USD"` before user settings loaded); now gated and sourced from settings like other pages.
- Failed delete errors persisted when reopening dialogs for other rows (mutations never `reset()`); trips create dialog kept stale input on cancel.
- Transactions summary error rendered "$0" metrics with no error signal.
- OAuth sign-in errors were silently stripped by `validateSearch`; now surfaced.
- Faceted range filters clamped on each keystroke (couldn't type "50" when min=10) — clamp moved to blur/commit.

---

## 3. Style/UX alignment across pages

House style (kept): page root `flex flex-col gap-6`; title lives in `SiteHeader`; optional `SharedDateRangeToolbar`; `MetricCard` row; default `Card`; `EmptyState` for empty data; destructive `Alert` for errors; CRUD via `Dialog`.

Fixed misalignments:

- **Settings** was the only page with an on-page `<h1>`, its own width (`max-w-4xl`), `gap-4`, and custom card borders — aligned to house style.
- **Error states** unified: destructive `Alert` (analytics pages previously used `EmptyState` for errors), consistently guarded so stale data keeps rendering while refetching fails.
- **Loading skeletons**: five ad-hoc `animate-pulse` styles with mismatched radii/heights replaced by shared skeleton components using the `Skeleton` primitive and card radius (`rounded-[1.25rem]`). Trips no longer renders real "$0" metric cards while loading.
- **Transactions empty state** added (was the only list page without one); empty-state action labels now match header actions ("Add account", "Add category").
- **Card overrides** removed: three different ad-hoc border/background/shadow combos (settings, categories, trips) and redundant re-declarations of the default on analytics pages.
- **Expense/Income switcher** unified on `ToggleGroup` (categories page used `Tabs` for the same binary switch).
- **Interval selector** extracted to one shared component (was styled three ways).
- **Tabular numbers** added to the accounts Balance and transactions Amount columns.
- **Icon buttons** on trips aligned to `size="icon-sm"` + `sr-only` labels.
- Copy: "Colour" → "Color"; consistent page-size options; fixed broken indentation in `transactions.tsx`.

---

## 4. Duplication reduced / code removed

- Three identical copies of `HttpError` + `fail()` + `requireUserForRequest` (profile-backup, receipt-scan, demo-seed) → `src/lib/server/http.server.ts`. 500 responses no longer leak internal error messages.
- Two data-wipe implementations (`clearUserScopedData` vs `resetUserData`) → one helper.
- Duplicate `convertAmountToBase`/`convertAmount` and the repeated "load accounts → currency map → FX fallback" idiom → shared server helper.
- Reports' private `requireUser`/`parseDate` → shared versions.
- Per-module normalizers in profile-backup that re-implemented `shared/server/normalizers.server.ts` → reuse.
- 4 copies of the `PAGE_ACTION_EVENT` listener effect → `usePageAction()`; 3 near-identical trend badges → `TrendBadge`; 4 copies of the shared-date-range → query-params block → one hook; duplicated `categoryIconById` builder, `accountTypeMeta`, `toDateOrUndefined`, range-label formatters → shared.
- Three `YYYY-MM-DD` date formatters (one buggy UTC) → one local-time helper.
- Four definitions of the `HugeIcon` type → one shared alias.
- `shared/types.ts`: ~800 dead lines of old codegen (endpoint envelopes, `ClientOptions`, `IFormFile`), `number | string` fiction narrowed to `number`, phantom `| null` widenings removed, duplicate summary/facets types deduped.
- Dead files/exports deleted: `nav-documents`, `nav-projects`, `nav-secondary`, `section-cards` (template scaffolding), `ui/drawer.tsx`, `ui/sonner.tsx` + unused `Toaster`, dead chart files (`bar-chart`, `line-chart`, `*-chart-loading`, `bar.tsx`, `bar-x/y-axis`, `bar-depth-geometry`, `pie-center-shell`), `useLogout`'s dead siblings (`useTransactions` chain, `accountQueryOptions`/`getAccount`), `ALPHA2_TO_ALPHA3`/`NUMERIC_TO_ALPHA2`/`TOTAL_COUNTRIES`, `formatMonthLabel`/`formatShortMonth`, `forEachChunkSync`, `googleSubject`, stray `"use client"` directives.
- Unused dependencies removed: `vaul`, `sonner`, `web-vitals`.
- `cache-invalidations.ts` now builds keys from `queryKeys` prefix helpers instead of duplicated string literals.

---

## 5. Performance

- `_protected.tsx` `beforeLoad` awaited an uncached server round-trip on **every** navigation and link hover (`defaultPreload: "intent"`). Now served through `queryClient.ensureQueryData` with the existing 60 s `authMe` cache; sign-in/out clear it. — **fixed**
- Transactions search text was un-debounced (a server query per keystroke, ×3 with summary/facets). Debounced. — **fixed**
- Exchange-rate fetch failures cached hardcoded fallback rates for the full 5 h TTL; fallback snapshots now use a short TTL. — **fixed**
- Migration runner: each migration file now runs inside a transaction. — **fixed**
- Reports load the user's full transaction history per call and the transactions page fetches unpaginated result sets (client-side pagination). Acceptable at personal scale. — **deferred** (needs server-side pagination + query rework)

---

## 6. Deferred items (need product decisions or bigger effort)

| Item                                                                                                                              | Why deferred                                                                          |
| --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Trips cannot be deleted (no `deleteTrip` anywhere; FK RESTRICT makes them permanent)                                              | Product decision — likely add delete with "no transactions" guard, mirroring accounts |
| Refund amount not capped at the original expense (cumulative over-refund possible)                                                | Product rule needs defining (partial refunds across multiple refunds)                 |
| Manual account-balance edits silently rewrite portfolio _history_ (balance is a snapshot; portfolio back-derives)                 | Needs an "adjustment transaction" concept                                             |
| Filter state lives in module-scope Zustand, not URL search params (not shareable, lost on refresh; compare page uses local state) | Behavioral redesign across all pages                                                  |
| `users_email_idx` is case-sensitive (Better Auth lowercases, DB doesn't enforce)                                                  | Needs a migration; no active bug                                                      |
| Income/expense colors are raw `emerald`/`rose` classes rather than theme tokens                                                   | Centralized in `transactionTone`/`TrendBadge` now; token swap is cosmetic             |
| Trip world map fetches topology from jsdelivr CDN at runtime (blank when offline)                                                 | Vendor ~100 KB topojson later; added no-data handling only                            |
| Server-side pagination for transactions search                                                                                    | See §5                                                                                |
| `ensureUserBootstrap` called on some paths but not `requireUser()`                                                                | Practically covered by the protected-layout auth call; unifying adds per-request cost |

---

## 7. Outcome

All "fixed" items above were applied in this pass. Final verification: `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, and `pnpm build` all pass. Net diff: 98 files changed, +1,868 / −5,848 lines (~4,000 lines removed). `src/features/shared/types.ts` went from 1,395 to ~600 lines; the old `GetApi*` endpoint-envelope types were replaced with standalone query types (`TransactionSearchQuery`, `CashflowSeriesReportQuery`, `CategorySeriesReportQuery`, `PortfolioBalanceSeriesQuery`, `ComparisonReportQuery`), and the `number | string` codegen unions were narrowed to `number` (zod validators now coerce inputs).

## 8. Notes for docs

- `AGENTS.md` referenced `src/features/shared/server/finance-data.server.ts`, which no longer exists — updated to the real shared server modules, and the toast mention removed (no toasts in the app).
