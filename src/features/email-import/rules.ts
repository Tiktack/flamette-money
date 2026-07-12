import type { EmailDirection, EmailRuleMatchMode, ParsedEmailTransaction } from "./types"

// Pure rule types + evaluator shared by the server sync pipeline and the client rule
// builder (live preview / condition chips). Must stay free of server-only imports.

export const emailRuleTextFields = ["description", "merchant", "accountHint"] as const
export type EmailRuleTextField = (typeof emailRuleTextFields)[number]

export type EmailRuleCondition =
  | { field: EmailRuleTextField; operator: "contains" | "equals"; value: string }
  | { field: "currency"; operator: "equals"; value: string }
  | { field: "direction"; operator: "equals"; value: EmailDirection }
  | { field: "connectionId"; operator: "equals"; value: string }
  | { field: "amount"; operator: "gte" | "lte" | "between"; value: number; value2?: number | null }

export type EmailRuleAction =
  | { type: "ignore" }
  | {
      type: "assign"
      accountId: string | null
      categoryId: string | null
      subCategoryId: string | null
      note: string | null
    }

export type EmailImportRuleDefinition = {
  id: string
  enabled: boolean
  priority: number
  matchMode: EmailRuleMatchMode
  conditions: EmailRuleCondition[]
  action: EmailRuleAction
}

export type EmailRuleEvaluationInput = ParsedEmailTransaction & { connectionId: string }

function normalizeText(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase()
}

export function evaluateEmailRuleCondition(condition: EmailRuleCondition, input: EmailRuleEvaluationInput): boolean {
  switch (condition.field) {
    case "description":
    case "merchant":
    case "accountHint": {
      const subject = normalizeText(input[condition.field])
      const value = normalizeText(condition.value)
      if (!value) {
        return true
      }
      return condition.operator === "contains" ? subject.includes(value) : subject === value
    }
    case "currency":
      return input.currency.trim().toUpperCase() === condition.value.trim().toUpperCase()
    case "direction":
      return input.direction === condition.value
    case "connectionId":
      return input.connectionId === condition.value
    case "amount": {
      if (condition.operator === "gte") {
        return input.amount >= condition.value
      }
      if (condition.operator === "lte") {
        return input.amount <= condition.value
      }
      const upper = condition.value2 ?? condition.value
      return input.amount >= condition.value && input.amount <= upper
    }
  }
}

// An empty condition list matches every email (catch-all rule).
export function evaluateEmailRule(rule: Pick<EmailImportRuleDefinition, "matchMode" | "conditions">, input: EmailRuleEvaluationInput): boolean {
  if (rule.conditions.length === 0) {
    return true
  }

  if (rule.matchMode === "any") {
    return rule.conditions.some((condition) => evaluateEmailRuleCondition(condition, input))
  }

  return rule.conditions.every((condition) => evaluateEmailRuleCondition(condition, input))
}

// Rules are evaluated in priority order (lowest first); disabled rules are skipped and
// the first matching rule wins.
export function evaluateEmailImportRules<TRule extends EmailImportRuleDefinition>(rules: readonly TRule[], input: EmailRuleEvaluationInput): TRule | null {
  const ordered = [...rules].sort((a, b) => a.priority - b.priority)

  for (const rule of ordered) {
    if (!rule.enabled) {
      continue
    }
    if (evaluateEmailRule(rule, input)) {
      return rule
    }
  }

  return null
}
