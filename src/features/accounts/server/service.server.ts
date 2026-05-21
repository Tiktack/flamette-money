import { and, eq } from "drizzle-orm"

import { normalizeCurrencyOrDefault } from "@/lib/currency"
import { db } from "@/lib/db/client.server"
import { accounts, transactions } from "@/lib/db/schema"
import { getRatesToBase } from "@/lib/exchange-rate.server"
import { parseAmount } from "@/lib/server/parsing.server"

import { requireAccount, requireUser } from "@/features/shared/server/lookups.server"
import {
  normalizeAccountType,
  normalizeColor,
  normalizeDescription,
  normalizeIcon,
  normalizeRequiredName,
  normalizeSupportedCurrency,
} from "@/features/shared/server/normalizers.server"

import type {
  AccountListItemResponse,
  CreateAccountRequest,
  CreateAccountResponse,
  GetAccountResponse,
  UpdateAccountRequest,
  UpdateAccountResponse,
} from "@/features/shared/types"

export async function listAccountsData(): Promise<AccountListItemResponse[]> {
  const user = await requireUser()
  const baseCurrency = normalizeCurrencyOrDefault(user.baseCurrency, "USD")
  const fx = await getRatesToBase(baseCurrency)
  const rows = await db.query.accounts.findMany({
    where: eq(accounts.userId, user.id),
  })

  return rows
    .map((account) => ({
      id: account.id,
      name: account.name,
      description: account.description,
      currency: account.currency,
      color: account.color,
      icon: account.icon,
      type: account.type,
      currentBalance: account.currentBalance,
      sortBalance: account.currentBalance * (fx.ratesToBase[normalizeCurrencyOrDefault(account.currency, baseCurrency)] ?? 1),
    }))
    .sort((left, right) => {
      if (right.sortBalance !== left.sortBalance) {
        return right.sortBalance - left.sortBalance
      }

      return left.name.localeCompare(right.name)
    })
    .map(({ sortBalance: _ignoredSortBalance, ...account }) => account)
}

export async function getAccountData(accountId: string): Promise<GetAccountResponse> {
  const user = await requireUser()
  const account = await requireAccount(user.id, accountId)

  return {
    id: account.id,
    name: account.name,
    description: account.description,
    currency: account.currency,
    color: account.color,
    icon: account.icon,
    type: account.type,
    currentBalance: account.currentBalance,
  }
}

export async function createAccountData(request: CreateAccountRequest): Promise<CreateAccountResponse> {
  const user = await requireUser()
  const name = normalizeRequiredName(request.name)
  const description = normalizeDescription(request.description)
  const currency = normalizeSupportedCurrency(request.currency, "Currency")
  const color = normalizeColor(request.color)
  const icon = normalizeIcon(request.icon)
  const type = normalizeAccountType(request.type)
  const currentBalance = parseAmount(request.currentBalance, "CurrentBalance")
  const now = new Date()
  const id = crypto.randomUUID()

  await db.insert(accounts).values({
    id,
    userId: user.id,
    name,
    description,
    currency,
    color,
    icon,
    type,
    currentBalance,
    createdAt: now,
    updatedAt: now,
  })

  return {
    id,
    name,
    description,
    currency,
    color,
    icon,
    type,
    currentBalance,
  }
}

export async function updateAccountData(accountId: string, request: UpdateAccountRequest): Promise<UpdateAccountResponse> {
  const user = await requireUser()
  const account = await requireAccount(user.id, accountId)
  const name = normalizeRequiredName(request.name)
  const description = normalizeDescription(request.description)
  const color = normalizeColor(request.color)
  const icon = normalizeIcon(request.icon)
  const type = normalizeAccountType(request.type)
  const currentBalance = parseAmount(request.currentBalance, "CurrentBalance")
  const now = new Date()

  await db
    .update(accounts)
    .set({
      name,
      description,
      color,
      icon,
      type,
      currentBalance,
      updatedAt: now,
    })
    .where(and(eq(accounts.userId, user.id), eq(accounts.id, account.id)))

  return {
    id: account.id,
    name,
    description,
    currency: account.currency,
    color,
    icon,
    type,
    currentBalance,
  }
}

export async function deleteAccountData(accountId: string) {
  const user = await requireUser()
  await requireAccount(user.id, accountId)

  const hasTransactions = await db.query.transactions.findFirst({
    where: and(eq(transactions.userId, user.id), eq(transactions.accountId, accountId)),
    columns: { id: true },
  })

  if (hasTransactions) {
    throw new Error("Account cannot be deleted because it has transactions.")
  }

  await db.delete(accounts).where(and(eq(accounts.userId, user.id), eq(accounts.id, accountId)))
}
