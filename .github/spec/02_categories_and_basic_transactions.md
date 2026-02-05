# Spec: Categories & Basic Transactions

## 1. Overview
This phase introduces the concept of money movement (Transactions) and their classification (Categories). We will support simple Income and Expense transactions.

## 2. Data Models

### 2.1 Category Entity
*Design Decision: Single Table vs. Split*
We will use a **Single Table** (`Categories`) with a self-referencing `ParentId`. This is preferred for personal finance apps as it simplifies queries (e.g., "Get all categories") and allows easy refactoring of hierarchy levels later without schema changes.

- `Id` (GUID)
- `Name` (string): e.g., "Food", "Salary", "Transport".
- `Color` (string): Hex code for UI representation.
- `Icon` (string): Icon identifier.
- `ParentId` (GUID?): Nullable. If null, it's a main category. If set, it's a subcategory.
- `Type` (Enum): `Income`, `Expense`. **Strictly Required**. A category cannot be both.
- **Validation**: 
    - A Subcategory MUST have the same `Type` as its Parent.
    - Max nesting level: 1 (Parent -> Child). No deep recursion needed for this scope.

### 2.2 Transaction Entity (Basic)
- `Id` (GUID)
- `Date` (DateTimeOffset): When transaction happened.
- `Type` (Enum): `Income`, `Expense`.
- `Amount` (decimal): Absolute value. 
- `AccountId` (GUID): FK to `Account`.
- `CategoryId` (GUID): FK to `Category`.
- `SubCategoryId` (GUID?): Optional FK to `Category` (must be child of `CategoryId`).
- `Note` (string?): Optional description.

## 3. Business Logic
- **Adding Expense**: 
    - Deduct `Amount` from `Account.CurrentBalance`.
- **Adding Income**: 
    - Add `Amount` to `Account.CurrentBalance`.
- **Validation**: 
    - Transaction currency is implied by the Account currency (or we need multi-currency transaction support later. For *Basic*, assume transaction is in Account currency).
    - Ensure `SubCategoryId` belongs to `CategoryId`.

## 4. API Endpoints

### 4.1 Feature: Categories
- **GET** `/api/categories`: Returns hierarchy (Categories with their Subcategories).
- **POST** `/api/categories`: Create category/subcategory.
- **PUT** `/api/categories/{id}`: Update name/color/parent.
- **DELETE** `/api/categories/{id}`: Prevent if used in transactions.

### 4.2 Feature: Transactions
- **POST** `/api/transactions`
    - Body: `{ Date, Type, Amount, AccountId, CategoryId, SubCategoryId, Note }`
    - Effect: Updates Account Balance.
- **GET** `/api/transactions`
    - Query Params: `page`, `pageSize`.
    - Returns sorted by Date Descending.
- **GET** `/api/transactions/{id}`
- **PUT** `/api/transactions/{id}`
    - Complex: If amount/type changes, must adjust Account Balance difference.
- **DELETE** `/api/transactions/{id}`
    - Reverts the balance change on the account.

## 5. Implementation Steps
1.  Create `Category` entity and relations.
2.  Seed default categories (Food, Housing, Transport, Salary, etc.).
3.  Create `Transaction` entity.
4.  Implement Balance Update Logic (could be a Domain Service or MediatR notification).
5.  Build Endpoints.

## 6. Acceptance Criteria
- Can create a "Food" category. 
- Can create "Groceries" subcategory under "Food".
- Can record $50 Expense on "Main Chase Bank".
- Account balance decreases by $50.
- Transactions list shows this entry.
