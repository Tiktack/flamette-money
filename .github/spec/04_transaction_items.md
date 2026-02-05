# Spec: Transaction Items

## 1. Overview
Transactions often consist of multiple items (e.g., a grocery receipt). This spec adds detailed itemization, allowing granular categorization and price tracking per item.

## 2. Data Models

### 2.1 TransactionItem Entity
Represents a single line item in a transaction.
- `Id` (GUID)
- `TransactionId` (GUID): Parent.
- `Name` (string): e.g., "Milk", "Bananas".
- `Quantity` (decimal): Count or weight.
- `Unit` (string?): "kg", "pcs", "L", "lb".
- `UnitPrice` (decimal): Price per unit.
- `PromotionAmount` (decimal): Discount applied to this line (stored as positive value usually, subtracted in formula).
- `FinalAmount` (decimal): Computed or stored explicitly. 
    - Formula: `(UnitPrice * Quantity) - PromotionAmount`.
- `CategoryId` (GUID?): Optional override. If null, inherits Parent Transaction's category.
- `SubCategoryId` (GUID?): Optional override.

### 2.2 Transaction Update
- `Transaction` entity relates to `List<TransactionItem>`.
- **Validation**: Sum of `TransactionItem.FinalAmount` should equal (or be close to) `Transaction.Amount`. 
    - *Decision*: Does the logical sum drive the Transaction Amount, or are they independent?
    - *Policy*: `Transaction.Amount` is the source of truth (what hit the bank). Items are breakdown. If they don't match, it's a "Split Mismatch" or the remainder goes to "Uncategorized". Ideally, enforce equality during creation/update.

## 3. API Changes

### 3.1 Create/Update Transaction
- **Body** extends to include `Items` array.
- `{ ..., Items: [{ Name, Quantity, Unit, UnitPrice, PromotionAmount }] }`

### 3.2 Logic
- When Items are provided, Validate: `Sum(Items.FinalAmount) == Transaction.Amount`.
- Save Items to `TransactionItems` table.

## 4. Implementation Steps
1. Create `TransactionItem` table.
2. Update `Transaction` aggregate to include Items.
3. Update POST/PUT endpoints to handle deep insert/update of items.
4. Add logic to handle Category overrides on items (e.g., Receipt has Food, but one item is Cleaning supplies).

## 5. Acceptance Criteria
- Can create a transaction with 2 items:
    1. "Apples", 2kg, $3/kg, No promo. Total $6.
    2. "Bread", 1pc, $2/pc, $0.50 promo. Total $1.50.
- Transaction Amount must be $7.50.
- Report queries can now aggregate by `TransactionItem.CategoryId` if present, offering more precision.
