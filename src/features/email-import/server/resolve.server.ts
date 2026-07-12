import { format } from "date-fns"
import { and, eq } from "drizzle-orm"

import { matchAccountIdByBankHint } from "@/features/email-import/account-hint"
import { evaluateEmailImportRules, type EmailImportRuleDefinition, type EmailRuleAction } from "@/features/email-import/rules"
import { emailRuleActionSchema, emailRuleConditionSchema } from "@/features/shared/server/validators"
import type { CreateTransactionRequest } from "@/features/shared/types"
import { createTransactionForUser, TransactionCommittedButNotReadError } from "@/features/transactions/server/service.server"
import { normalizeCurrencyOrNull } from "@/lib/currency"
import { db } from "@/lib/db/client.server"
import { accounts, categories, emailConnections, emailImportRules, users } from "@/lib/db/schema"
import { z } from "zod"

import type { ParsedEmailTransaction } from "../types"
import type { BankEmailInput } from "./parsers/types"
import { getBankEmailParser } from "./parsers/registry"

type UserRecord = typeof users.$inferSelect
type EmailConnectionRecord = typeof emailConnections.$inferSelect
type AccountRecord = typeof accounts.$inferSelect
type CategoryRecord = typeof categories.$inferSelect

export type EmailResolutionContext = {
  user: UserRecord
  connection: EmailConnectionRecord
  rules: EmailImportRuleDefinition[]
  accountById: Map<string, AccountRecord>
  categoryById: Map<string, CategoryRecord>
}

export type EmailResolutionOutcome =
  | { status: "unparsed"; parseError: string }
  | { status: "ignored"; parsed: ParsedEmailTransaction; matchedRuleId: string }
  | { status: "pending"; parsed: ParsedEmailTransaction; matchedRuleId: string | null }
  | { status: "imported"; parsed: ParsedEmailTransaction; matchedRuleId: string | null; transactionId: string }
  | { status: "error"; parsed: ParsedEmailTransaction; matchedRuleId: string | null; error: string }

const conditionsReadSchema = z.array(emailRuleConditionSchema)

// Rules are stored as JSON text; a rule that no longer validates is skipped (never let a
// corrupt row break the whole sync).
export function parseRuleRows(rows: (typeof emailImportRules.$inferSelect)[]): EmailImportRuleDefinition[] {
  const definitions: EmailImportRuleDefinition[] = []

  for (const row of rows) {
    try {
      const conditions = conditionsReadSchema.parse(JSON.parse(row.conditions))
      const action = emailRuleActionSchema.parse(JSON.parse(row.action))
      definitions.push({
        id: row.id,
        enabled: row.enabled,
        priority: row.priority,
        matchMode: row.matchMode,
        conditions,
        action,
      })
    } catch (error) {
      console.error(`[email-import] skipping invalid rule ${row.id}`, error)
    }
  }

  return definitions
}

export async function buildEmailResolutionContext(connection: EmailConnectionRecord): Promise<EmailResolutionContext> {
  const user = await db.query.users.findFirst({ where: eq(users.id, connection.userId) })
  if (!user) {
    throw new Error("The user that owns this connection was not found.")
  }

  const [ruleRows, accountRows, categoryRows] = await Promise.all([
    db.query.emailImportRules.findMany({ where: and(eq(emailImportRules.userId, user.id), eq(emailImportRules.enabled, true)) }),
    db.query.accounts.findMany({ where: eq(accounts.userId, user.id) }),
    db.query.categories.findMany({ where: eq(categories.userId, user.id) }),
  ])

  return {
    user,
    connection,
    rules: parseRuleRows(ruleRows),
    accountById: new Map(accountRows.map((account) => [account.id, account])),
    categoryById: new Map(categoryRows.map((category) => [category.id, category])),
  }
}

// Account resolution order: explicit rule assignment → account matched by the email's
// masked account number (bankAccountHint on accounts) → connection default.
function resolveAssignment(action: EmailRuleAction | null, parsed: ParsedEmailTransaction, context: EmailResolutionContext) {
  const assign = action?.type === "assign" ? action : null
  return {
    accountId: assign?.accountId ?? matchAccountIdByBankHint(parsed.accountHint, context.accountById.values()) ?? context.connection.defaultAccountId ?? null,
    categoryId: assign?.categoryId ?? null,
    subCategoryId: assign?.subCategoryId ?? null,
    note: assign?.note ?? null,
  }
}

// Auto-create requires every referenced entity to be valid right now; anything stale or
// incomplete demotes the item to "pending" for manual review instead of failing.
function canAutoCreate(
  parsed: ParsedEmailTransaction,
  assignment: ReturnType<typeof resolveAssignment>,
  context: EmailResolutionContext
): assignment is ReturnType<typeof resolveAssignment> & { accountId: string; categoryId: string } {
  if (!assignment.accountId || !assignment.categoryId) {
    return false
  }

  const account = context.accountById.get(assignment.accountId)
  if (!account) {
    return false
  }

  const category = context.categoryById.get(assignment.categoryId)
  if (!category) {
    return false
  }

  const expectedCategoryType = parsed.direction === "income" ? "Income" : "Expense"
  if (category.type !== expectedCategoryType) {
    return false
  }

  if (assignment.subCategoryId) {
    const subCategory = context.categoryById.get(assignment.subCategoryId)
    if (!subCategory || subCategory.parentId !== assignment.categoryId) {
      return false
    }
  }

  const normalizedCurrency = normalizeCurrencyOrNull(parsed.currency)
  if (normalizedCurrency === null) {
    return false
  }

  // The email's currency must match the target account's currency. Auto-creating a foreign
  // amount would apply it raw to the account balance with no FX conversion (a EUR debit
  // hitting a PLN account), so currency mismatches go to the review inbox instead.
  return account.currency.trim().toUpperCase() === normalizedCurrency
}

function buildTransactionRequest(
  parsed: ParsedEmailTransaction,
  assignment: { accountId: string; categoryId: string; subCategoryId: string | null; note: string | null },
  emailDate: Date | null
): CreateTransactionRequest {
  const date = parsed.bookedAt ?? format(emailDate ?? new Date(), "yyyy-MM-dd")

  return {
    date,
    type: parsed.direction === "income" ? "Income" : "Expense",
    amount: parsed.amount,
    accountId: assignment.accountId,
    tripId: null,
    categoryId: assignment.categoryId,
    subCategoryId: assignment.subCategoryId,
    targetAccountId: null,
    originalTransactionId: null,
    note: assignment.note,
    merchantName: parsed.merchant ?? parsed.description,
    location: parsed.location,
    amount2: null,
    currency: normalizeCurrencyOrNull(parsed.currency),
    currency2: null,
    items: null,
  }
}

export async function resolveEmailItem(context: EmailResolutionContext, input: BankEmailInput): Promise<EmailResolutionOutcome> {
  const parser = getBankEmailParser(context.connection.parserKey)
  if (!parser) {
    return { status: "unparsed", parseError: `Unknown parser "${context.connection.parserKey}".` }
  }

  const parsed = parser.parse(input)
  if (!parsed) {
    return { status: "unparsed", parseError: `The email did not match the ${parser.displayName} template.` }
  }

  const matchedRule = evaluateEmailImportRules(context.rules, { ...parsed, connectionId: context.connection.id })

  if (matchedRule?.action.type === "ignore") {
    return { status: "ignored", parsed, matchedRuleId: matchedRule.id }
  }

  const assignment = resolveAssignment(matchedRule?.action ?? null, parsed, context)
  const matchedRuleId = matchedRule?.id ?? null

  if (!canAutoCreate(parsed, assignment, context)) {
    return { status: "pending", parsed, matchedRuleId }
  }

  try {
    const request = buildTransactionRequest(parsed, assignment, input.date)
    const created = await createTransactionForUser(context.user, request)
    return { status: "imported", parsed, matchedRuleId, transactionId: created.id }
  } catch (error) {
    if (error instanceof TransactionCommittedButNotReadError) {
      // The transaction was durably committed even though reading it back failed. Mark the
      // item imported with the known id so a later re-parse won't create a duplicate.
      return { status: "imported", parsed, matchedRuleId, transactionId: error.transactionId }
    }
    const message = error instanceof Error ? error.message : "Creating the transaction failed."
    return { status: "error", parsed, matchedRuleId, error: message }
  }
}
