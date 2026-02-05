# Spec: Reports & Analytics

## 1. Overview
Provide visual insights into financial habits using charts and summaries.

## 2. API Endpoints

### 2.1 Aggregated Data
- **GET** `/api/reports/category-breakdown`
    - **Params**: `StartDate`, `EndDate`, `Type` (Income/Expense).
    - **Logic**: Sum `Amount` grouped by `Category`.
    - **Output**: `[{ CategoryName, Amount, Percentage, Color }]`.

### 2.2 Time Series Data
- **GET** `/api/reports/time-series`
    - **Params**: `StartDate`, `EndDate`, `Interval` (Day, Week, Month).
    - **Output**: `[{ DateLabel, IncomeAmount, ExpenseAmount }]`.
    - **Use Case**: Bar Chart showing net flow over time.

### 2.3 Stacked Reports (Deep Dive)
- **GET** `/api/reports/stacked-categories`
    - **Params**: `StartDate`, `EndDate`, `Interval`.
    - **Logic**: Group by Date Interval AND Category.
    - **Output**: Complex structure for Stacked Bar Charts in UI.

## 3. Implementation Details
- **Performance**:
    - Use efficient EF Core `GroupBy` queries.
    - If data grows large, consider pre-calculating monthly statistics in a separate table (Materialized View pattern), but for personal finance, live queries are usually fine.
- **Refund Handling**:
    - Ensure Refunds are subtracted from Expenses in these reports.
    - *Formula*: `Sum(Expense) - Sum(Refunds linked to Expenses)`.

## 4. Acceptance Criteria
- "Expenses per Category" chart data is accurate.
- "Income vs Expense" over last 6 months returns correct monthly buckets.
- Refunds correctly reduce the report totals, so I don't see inflated spending.
