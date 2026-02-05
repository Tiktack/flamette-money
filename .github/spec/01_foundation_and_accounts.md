# Spec: Foundation & Account Management

## 1. Overview
This is the foundational phase. We will set up the project structure, database connection, and the first feature slice: Account Management. This lays the groundwork for multi-currency support and tracking money locations.

## 2. Technical Stack
- **Framework**: ASP.NET Core 9/10 (Minimal APIs with Carter)
- **Database**: SQLite
- **ORM**: Entity Framework Core

## 3. Data Models

### 3.1 Account Entity
Represents a place where money is stored (Bank, Cash, Wallet).
- `Id` (GUID): Unique identifier.
- `Name` (string): User-friendly name (e.g., "Main Chase Bank", "Cash Wallet").
- `Currency` (string, ISO 4217): The currency this account holds (USD, PLN, EUR, CAD).
- `Type` (Enum): e.g., `Cash`, `DebitCard`, `CreditCard`, `Savings`.
- `InitialBalance` (decimal): Starting amount.
- `CurrentBalance` (decimal, computed/tracked): Current amount.

### 3.2 Database Context
- Configure `DbContext` with SQLite.
- Ensure proper decimal precision configuration for currency.

## 4. API Endpoints (Feature: Accounts)

Create a generic Carter module `Features/Accounts/AccountsEndpoints.cs`.

### 4.1 Create Account
- **POST** `/api/accounts`
- **Body**: `{ Name, Currency, Type, InitialBalance }`
- **Validation**: Name is required. Currency must be valid (USD, PLN, EUR, CAD).

### 4.2 List Accounts
- **GET** `/api/accounts`
- **Response**: List of all accounts with current balances.

### 4.3 Get Account Details
- **GET** `/api/accounts/{id}`
- **Response**: Details of specific account.

### 4.4 Update Account
- **PUT** `/api/accounts/{id}`
- **Body**: `{ Name, Type }` (Currency usually shouldn't change after creation).

### 4.5 Delete Account
- **DELETE** `/api/accounts/{id}`
- **Logic**: Soft delete or check for existing transactions before deletion.

## 5. Implementation Steps
1.  Install EF Core SQLite packages.
2.  Set up `AppDbContext` in `Infrastructure/Database`.
3.  Create `Account` entity in `Features/Accounts/Entities`.
4.  Implement `AccountsEndpoint` using Carter.
5.  Add MediatR handlers or Service logic if complex (Account logic is likely simple enough for direct EF calls in endpoints initially, otherwise use handlers).
6.  Create initial migration.

## 6. Acceptance Criteria
- Can create an account with "USD".
- Can create a second account with "EUR".
- Listing accounts shows both.
- Database file `.db` is created successfully.
