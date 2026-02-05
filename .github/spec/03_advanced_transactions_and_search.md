# Spec: Advanced Transactions & Search

## 1. Overview
Enhance the Transaction model to support Transfers (Account to Account), Refunds (Positive Expenses), and robust search capabilities.

## 2. Advanced Transaction Types

### 2.1 Transfers
A transfer is moving money from Account A to Account B.
- **Model Changes**:
    - `Transaction` entity needs optional `RelatedAccountId` or we model it as two separate transactions linked together.
    - *Preferred Approach*: Single Transaction record with `Type=Transfer`, `AccountId` (Source), and `TargetAccountId` (Destination). Or a separate `Transfer` entity.
    - *Simpler Approach for Single Table*: `Transaction` has `RelatedTransactionId`. A Transfer consists of two rows:
        1. Outgoing from Account A (Type=TransferOut).
        2. Incoming to Account B (Type=TransferIn).
        - They share a `TraceId` or reference each other via `RelatedTransactionId`.
- **Logic**:
    - Creation: Create two records. Deduct from A, Add to B.
    - Display: Filter out one side or show as single logical item? Usually UI groups them or shows them per account.

### 2.2 Refunds
A refund returns money for a previous expense.
- **Goal**: Keep history explicitly. Do not just delete the expense.
- **Model Changes**:
    - `Transaction.Type` enum adds `Refund`.
    - `Transaction.IsRefund` bool.
    - `Transaction.OriginalTransactionId` (GUID?): Link to the expense being refunded.
- **Logic**:
    - `Amount` is positive (money comes in), but semantically it's an "Negative Expense" rather than "Income".
    - Affects Account Balance positively.
    - Reporting: Should offset the "Expense" category total, not add to "Income".

### 2.3 Optional Properties
Add fields to `Transaction`:
- `MerchantName` (string?)
- `Location` (string?) - Address or coords.

## 3. Search & Filtering

### 3.1 Advanced Filter Endpoint
- **GET** `/api/transactions/search`
- **Query Object**:
    - `StartDate`, `EndDate`
    - `AccountIds` (List)
    - `CategoryIds` (List)
    - `Types` (Income, Expense, Transfer, Refund)
    - `SearchText` (Matches Note, MerchantName)
    - `MinAmount`, `MaxAmount`

### 3.2 Implementation
- Use building EF Core `IQueryable` dynamically based on filters.
- Ensure performant indexing on `Date` and `AccountId`.

## 4. Implementation Steps
1. Update `Transaction` entity (RelatedTransactionId, OriginalTransactionId, MerchantName).
2. Implement Transfer logic (atomic creation of 2 records).
3. Implement Refund logic (validation that original transaction exists).
4. Implement Search Endpoint (Specification pattern or simple `Where` clauses).

## 5. Acceptance Criteria
- Can Transfer $100 from Bank to Cash.
- Bank balance -100, Cash balance +100.
- Can Refund $20 of a previous $50 expense.
- Account balance +20.
- Search for "Walmart" finds relevant transactions.
- Search for expenses > $100 works.
