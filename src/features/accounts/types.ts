import type { AccountType } from "@/features/shared/types"

export type {
  AccountListItemResponse as AccountListItem,
  AccountType,
  CreateAccountRequest as AccountCreateRequest,
  CreateAccountResponse as Account,
  GetAccountResponse as AccountDetail,
  UpdateAccountRequest as AccountUpdateRequest,
} from "@/features/shared/types"

export const accountTypeOptions: AccountType[] = ["Cash", "DebitCard", "CreditCard", "Savings"]

export const accountTypeMeta: Record<AccountType, { label: string }> = {
  Cash: { label: "Cash" },
  DebitCard: { label: "Debit card" },
  CreditCard: { label: "Credit card" },
  Savings: { label: "Savings" },
}
