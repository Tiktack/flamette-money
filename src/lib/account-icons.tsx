import type { ComponentProps } from "react"
import {
  AddMoneyCircleIcon,
  BankIcon,
  Building01Icon,
  Cash01Icon,
  Coins01Icon,
  CreditCardIcon,
  MoneyBag01Icon,
  MoneyExchange01Icon,
  MoneySafeIcon,
  PiggyBankIcon,
  SafeBoxIcon,
  SafeIcon,
  Wallet01Icon,
  Wallet02Icon,
  WalletCardsIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

type HugeIcon = ComponentProps<typeof HugeiconsIcon>["icon"]

export type AccountIconDefinition = {
  name: string
  label: string
  icon: HugeIcon
}

export const accountIconOptions: AccountIconDefinition[] = [
  { name: "Wallet01Icon", label: "Wallet", icon: Wallet01Icon },
  { name: "Wallet02Icon", label: "Pocket wallet", icon: Wallet02Icon },
  {
    name: "WalletCardsIcon",
    label: "Wallet with cards",
    icon: WalletCardsIcon,
  },
  { name: "CreditCardIcon", label: "Credit card", icon: CreditCardIcon },
  { name: "BankIcon", label: "Bank", icon: BankIcon },
  { name: "Building01Icon", label: "Bank building", icon: Building01Icon },
  { name: "Cash01Icon", label: "Cash", icon: Cash01Icon },
  { name: "Coins01Icon", label: "Coins", icon: Coins01Icon },
  { name: "PiggyBankIcon", label: "Piggy bank", icon: PiggyBankIcon },
  { name: "MoneyBag01Icon", label: "Money bag", icon: MoneyBag01Icon },
  { name: "MoneySafeIcon", label: "Money safe", icon: MoneySafeIcon },
  { name: "SafeIcon", label: "Safe", icon: SafeIcon },
  { name: "SafeBoxIcon", label: "Safe box", icon: SafeBoxIcon },
  { name: "MoneyExchange01Icon", label: "Exchange", icon: MoneyExchange01Icon },
  { name: "AddMoneyCircleIcon", label: "Funding", icon: AddMoneyCircleIcon },
]

export type AccountIconName = (typeof accountIconOptions)[number]["name"]

const defaultAccountIcon = accountIconOptions[0]

const accountIconAliases: Record<string, AccountIconName> = {
  IconWallet: "Wallet01Icon",
  IconCard: "CreditCardIcon",
  IconPigMoney: "PiggyBankIcon",
  IconCashBanknote: "Cash01Icon",
}

const accountIconsByName = new Map(accountIconOptions.map((item) => [item.name, item]))

export function resolveAccountIconName(iconName?: string | null): AccountIconName {
  if (!iconName) {
    return defaultAccountIcon.name as AccountIconName
  }

  if (iconName in accountIconAliases) {
    return accountIconAliases[iconName]
  }

  if (accountIconsByName.has(iconName)) {
    return iconName as AccountIconName
  }

  return defaultAccountIcon.name as AccountIconName
}

export function getAccountIconDefinition(iconName?: string | null): AccountIconDefinition {
  return accountIconsByName.get(resolveAccountIconName(iconName)) ?? defaultAccountIcon
}
