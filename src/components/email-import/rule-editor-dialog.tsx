import * as React from "react"

import { Cancel01Icon, Loading03Icon, PlusSignIcon, Tick01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NumberInput } from "@/components/ui/number-input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { useAccounts } from "@/features/accounts/hooks"
import { useAppInfo } from "@/features/app/hooks"
import { useCategories } from "@/features/categories/hooks"
import { useCreateEmailImportRule, usePreviewEmailImportRule, useUpdateEmailImportRule } from "@/features/email-import/hooks"
import type { EmailRuleAction, EmailRuleCondition } from "@/features/email-import/rules"
import type { EmailConnectionSummary, EmailImportRuleResponse, EmailRuleMatchMode, EmailRulePreviewEntry } from "@/features/email-import/types"
import { getApiErrorMessage } from "@/features/shared/errors"
import { CategoryIconBadge } from "@/lib/category-icons"
import { formatCurrency } from "@/lib/finance"

const NO_SELECTION_VALUE = "none"

type ConditionField = "description" | "merchant" | "accountHint" | "currency" | "direction" | "amount" | "connectionId"

const fieldOptions: { value: ConditionField; label: string }[] = [
  { value: "merchant", label: "Merchant" },
  { value: "description", label: "Description" },
  { value: "amount", label: "Amount" },
  { value: "currency", label: "Currency" },
  { value: "direction", label: "Direction" },
  { value: "accountHint", label: "Account hint" },
  { value: "connectionId", label: "Connection" },
]

const textOperatorOptions = [
  { value: "contains", label: "contains" },
  { value: "equals", label: "is exactly" },
]

const amountOperatorOptions = [
  { value: "gte", label: "is at least" },
  { value: "lte", label: "is at most" },
  { value: "between", label: "is between" },
]

const directionOptions = [
  { value: "expense", label: "Expense (money out)" },
  { value: "income", label: "Income (money in)" },
]

type ConditionDraft = {
  key: string
  field: ConditionField
  operator: string
  value: string
  amountMax: string
}

// Condition drafts keep amounts as strings (the same field holds text for other operators);
// NumberInput works with numbers, so convert at the boundary.
function amountDraftToNumber(text: string): number | null {
  if (!text.trim()) {
    return null
  }

  const parsed = Number(text)
  return Number.isFinite(parsed) ? parsed : null
}

function newConditionDraft(field: ConditionField = "merchant"): ConditionDraft {
  return {
    key: crypto.randomUUID(),
    field,
    operator: field === "amount" ? "gte" : field === "currency" || field === "direction" || field === "connectionId" ? "equals" : "contains",
    value: "",
    amountMax: "",
  }
}

function conditionToDraft(condition: EmailRuleCondition): ConditionDraft {
  if (condition.field === "amount") {
    return {
      key: crypto.randomUUID(),
      field: "amount",
      operator: condition.operator,
      value: String(condition.value),
      amountMax: condition.value2 != null ? String(condition.value2) : "",
    }
  }

  return {
    key: crypto.randomUUID(),
    field: condition.field,
    operator: condition.operator,
    value: String(condition.value),
    amountMax: "",
  }
}

function draftToCondition(draft: ConditionDraft): EmailRuleCondition | null {
  if (draft.field === "amount") {
    const value = Number.parseFloat(draft.value)
    if (!Number.isFinite(value) || value < 0) {
      return null
    }
    if (draft.operator === "between") {
      const value2 = Number.parseFloat(draft.amountMax)
      if (!Number.isFinite(value2) || value2 < value) {
        return null
      }
      return { field: "amount", operator: "between", value, value2 }
    }
    return { field: "amount", operator: draft.operator as "gte" | "lte", value }
  }

  const value = draft.value.trim()
  if (!value) {
    return null
  }

  if (draft.field === "direction") {
    return { field: "direction", operator: "equals", value: value as "income" | "expense" }
  }
  if (draft.field === "currency") {
    return { field: "currency", operator: "equals", value }
  }
  if (draft.field === "connectionId") {
    return { field: "connectionId", operator: "equals", value }
  }
  return { field: draft.field, operator: draft.operator as "contains" | "equals", value }
}

type ActionDraft = {
  type: "assign" | "ignore"
  accountId: string | null
  categoryId: string | null
  subCategoryId: string | null
  note: string
}

function actionToDraft(action: EmailRuleAction | null): ActionDraft {
  if (action && action.type === "assign") {
    return {
      type: "assign",
      accountId: action.accountId,
      categoryId: action.categoryId,
      subCategoryId: action.subCategoryId,
      note: action.note ?? "",
    }
  }

  return {
    type: action?.type === "ignore" ? "ignore" : "assign",
    accountId: null,
    categoryId: null,
    subCategoryId: null,
    note: "",
  }
}

export function RuleEditorDialog({
  open,
  onOpenChange,
  rule,
  connections,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  rule: EmailImportRuleResponse | null
  connections: EmailConnectionSummary[]
}) {
  const accountsQuery = useAccounts()
  const categoriesQuery = useCategories()
  const appInfoQuery = useAppInfo()
  const createRule = useCreateEmailImportRule()
  const updateRule = useUpdateEmailImportRule()
  const previewRule = usePreviewEmailImportRule()

  const [name, setName] = React.useState("")
  const [matchMode, setMatchMode] = React.useState<EmailRuleMatchMode>("all")
  const [conditions, setConditions] = React.useState<ConditionDraft[]>([])
  const [action, setAction] = React.useState<ActionDraft>(() => actionToDraft(null))
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [preview, setPreview] = React.useState<EmailRulePreviewEntry[] | null>(null)

  const isEdit = Boolean(rule)
  const isSaving = createRule.isPending || updateRule.isPending

  React.useEffect(() => {
    if (!open) {
      return
    }

    setName(rule?.name ?? "")
    setMatchMode(rule?.matchMode ?? "all")
    setConditions(rule ? rule.conditions.map(conditionToDraft) : [newConditionDraft()])
    setAction(actionToDraft(rule?.action ?? null))
    setErrorMessage(null)
    setPreview(null)
  }, [open, rule])

  const accounts = accountsQuery.data ?? []
  const categories = React.useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data])
  const parentCategories = React.useMemo(() => categories.filter((category) => category.parentId === null), [categories])
  const selectedCategory = React.useMemo(
    () => parentCategories.find((category) => category.id === action.categoryId) ?? null,
    [action.categoryId, parentCategories]
  )
  const currencyOptions = appInfoQuery.data?.supportedCurrencies?.map((item) => item.code.toUpperCase()) ?? ["PLN", "USD", "EUR", "GBP", "CAD"]

  const validConditions = React.useMemo(
    () => conditions.map(draftToCondition).filter((condition): condition is EmailRuleCondition => condition !== null),
    [conditions]
  )
  const hasInvalidConditions = validConditions.length !== conditions.length

  // Debounced live preview against the user's recently parsed emails.
  const previewMutate = previewRule.mutate
  React.useEffect(() => {
    if (!open) {
      return
    }

    const timeout = setTimeout(() => {
      previewMutate(
        { matchMode, conditions: validConditions },
        {
          onSuccess: (entries) => setPreview(entries),
        }
      )
    }, 500)

    return () => clearTimeout(timeout)
  }, [open, matchMode, validConditions, previewMutate])

  const updateCondition = (key: string, patch: Partial<ConditionDraft>) => {
    setConditions((drafts) => drafts.map((draft) => (draft.key === key ? { ...draft, ...patch } : draft)))
  }

  const changeConditionField = (key: string, field: ConditionField) => {
    setConditions((drafts) => drafts.map((draft) => (draft.key === key ? { ...newConditionDraft(field), key: draft.key } : draft)))
  }

  const handleSubmit = async () => {
    setErrorMessage(null)

    if (!name.trim()) {
      setErrorMessage("Give the rule a name.")
      return
    }

    if (hasInvalidConditions) {
      setErrorMessage("Some conditions are incomplete. Fill in their values or remove them.")
      return
    }

    const requestAction: EmailRuleAction =
      action.type === "ignore"
        ? { type: "ignore" }
        : {
            type: "assign",
            accountId: action.accountId,
            categoryId: action.categoryId,
            subCategoryId: action.subCategoryId,
            note: action.note.trim() || null,
          }

    const request = {
      name: name.trim(),
      enabled: rule?.enabled ?? true,
      matchMode,
      conditions: validConditions,
      action: requestAction,
    }

    try {
      if (isEdit && rule) {
        await updateRule.mutateAsync({ id: rule.id, request })
      } else {
        await createRule.mutateAsync(request)
      }
      onOpenChange(false)
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Unable to save the rule."))
    }
  }

  const matchedCount = preview?.filter((entry) => entry.matches).length ?? 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit rule" : "New rule"}</DialogTitle>
          <DialogDescription>When an imported email matches the conditions, the action is applied automatically.</DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
            <Field>
              <FieldLabel>Name</FieldLabel>
              <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Żabka groceries" />
            </Field>

            <Field>
              <FieldLabel>Match</FieldLabel>
              <div className="flex gap-1.5">
                <Button type="button" size="sm" variant={matchMode === "all" ? "default" : "outline"} onClick={() => setMatchMode("all")}>
                  All conditions
                </Button>
                <Button type="button" size="sm" variant={matchMode === "any" ? "default" : "outline"} onClick={() => setMatchMode("any")}>
                  Any condition
                </Button>
              </div>
            </Field>
          </div>

          <Field>
            <FieldLabel>Conditions</FieldLabel>
            <div className="flex flex-col gap-2">
              {conditions.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border/60 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                  No conditions — this rule matches every email.
                </p>
              ) : null}

              {conditions.map((condition) => (
                <div key={condition.key} className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-muted/10 p-2">
                  <Select
                    value={condition.field}
                    items={fieldOptions}
                    onValueChange={(value) => value && changeConditionField(condition.key, value as ConditionField)}
                  >
                    <SelectTrigger size="sm" className="w-36">
                      <SelectValue placeholder="Field" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {fieldOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>

                  {condition.field === "amount" ? (
                    <Select
                      value={condition.operator}
                      items={amountOperatorOptions}
                      onValueChange={(value) => value && updateCondition(condition.key, { operator: value })}
                    >
                      <SelectTrigger size="sm" className="w-32">
                        <SelectValue placeholder="Operator" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {amountOperatorOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  ) : condition.field === "description" || condition.field === "merchant" || condition.field === "accountHint" ? (
                    <Select
                      value={condition.operator}
                      items={textOperatorOptions}
                      onValueChange={(value) => value && updateCondition(condition.key, { operator: value })}
                    >
                      <SelectTrigger size="sm" className="w-32">
                        <SelectValue placeholder="Operator" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {textOperatorOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-sm text-muted-foreground">is</span>
                  )}

                  {condition.field === "amount" ? (
                    <div className="flex items-center gap-2">
                      <NumberInput
                        min={0}
                        decimalScale={2}
                        value={amountDraftToNumber(condition.value)}
                        onValueChange={(nextValue) => updateCondition(condition.key, { value: nextValue == null ? "" : String(nextValue) })}
                        placeholder="0.00"
                        className="h-8 w-28"
                      />
                      {condition.operator === "between" ? (
                        <>
                          <span className="text-sm text-muted-foreground">and</span>
                          <NumberInput
                            min={0}
                            decimalScale={2}
                            value={amountDraftToNumber(condition.amountMax)}
                            onValueChange={(nextValue) => updateCondition(condition.key, { amountMax: nextValue == null ? "" : String(nextValue) })}
                            placeholder="0.00"
                            className="h-8 w-28"
                          />
                        </>
                      ) : null}
                    </div>
                  ) : condition.field === "currency" ? (
                    <Select
                      value={condition.value}
                      items={currencyOptions.map((currency) => ({ value: currency, label: currency }))}
                      onValueChange={(value) => value && updateCondition(condition.key, { value })}
                    >
                      <SelectTrigger size="sm" className="w-28">
                        <SelectValue placeholder="Currency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {currencyOptions.map((currency) => (
                            <SelectItem key={currency} value={currency}>
                              {currency}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  ) : condition.field === "direction" ? (
                    <Select
                      value={condition.value}
                      items={directionOptions}
                      onValueChange={(value) => value && updateCondition(condition.key, { value })}
                    >
                      <SelectTrigger size="sm" className="w-48">
                        <SelectValue placeholder="Direction" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {directionOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  ) : condition.field === "connectionId" ? (
                    <Select
                      value={condition.value}
                      items={connections.map((connection) => ({ value: connection.id, label: connection.name }))}
                      onValueChange={(value) => value && updateCondition(condition.key, { value })}
                    >
                      <SelectTrigger size="sm" className="w-48">
                        <SelectValue placeholder="Connection" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {connections.map((connection) => (
                            <SelectItem key={connection.id} value={connection.id}>
                              {connection.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={condition.value}
                      onChange={(event) => updateCondition(condition.key, { value: event.target.value })}
                      placeholder={condition.field === "accountHint" ? "e.g. last card digits" : "e.g. ŻABKA"}
                      className="h-8 w-52 flex-1 sm:flex-none"
                    />
                  )}

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="ml-auto text-muted-foreground"
                    onClick={() => setConditions((drafts) => drafts.filter((draft) => draft.key !== condition.key))}
                  >
                    <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
                    <span className="sr-only">Remove condition</span>
                  </Button>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-fit"
                onClick={() => setConditions((drafts) => [...drafts, newConditionDraft()])}
              >
                <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} data-icon="inline-start" />
                Add condition
              </Button>
            </div>
          </Field>

          <Separator />

          <Field>
            <FieldLabel>Then</FieldLabel>
            <div className="flex gap-1.5">
              <Button
                type="button"
                size="sm"
                variant={action.type === "assign" ? "default" : "outline"}
                onClick={() => setAction((state) => ({ ...state, type: "assign" }))}
              >
                Assign details
              </Button>
              <Button
                type="button"
                size="sm"
                variant={action.type === "ignore" ? "destructive" : "outline"}
                onClick={() => setAction((state) => ({ ...state, type: "ignore" }))}
              >
                Ignore email
              </Button>
            </div>
          </Field>

          {action.type === "assign" ? (
            <div className="grid gap-4 rounded-xl border border-border/60 bg-muted/10 p-3 sm:grid-cols-2">
              <Field>
                <FieldLabel>Account</FieldLabel>
                <Select
                  value={action.accountId ?? NO_SELECTION_VALUE}
                  items={[
                    { value: NO_SELECTION_VALUE, label: "Automatic" },
                    ...accounts.map((account) => ({ value: account.id, label: account.name })),
                  ]}
                  onValueChange={(value) =>
                    setAction((state) => ({ ...state, accountId: value && value !== NO_SELECTION_VALUE ? value : null }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Automatic" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value={NO_SELECTION_VALUE}>Automatic</SelectItem>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Automatic = the account whose bank account number matches the email, else the connection's default.
                </p>
              </Field>

              <Field>
                <FieldLabel>Note</FieldLabel>
                <Input value={action.note} onChange={(event) => setAction((state) => ({ ...state, note: event.target.value }))} placeholder="Optional note" />
              </Field>

              <Field>
                <FieldLabel>Category</FieldLabel>
                <Select
                  value={action.categoryId ?? NO_SELECTION_VALUE}
                  items={[
                    { value: NO_SELECTION_VALUE, label: "No category" },
                    ...parentCategories.map((category) => ({ value: category.id, label: category.name })),
                  ]}
                  onValueChange={(value) =>
                    setAction((state) => ({
                      ...state,
                      categoryId: value && value !== NO_SELECTION_VALUE ? value : null,
                      subCategoryId: null,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value={NO_SELECTION_VALUE}>No category</SelectItem>
                      {parentCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          <span className="flex items-center gap-2">
                            <CategoryIconBadge icon={category.icon} color={category.color} className="size-5 rounded-md" iconClassName="size-3" />
                            {category.name}
                            <span className="text-xs text-muted-foreground">{category.type}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel>Subcategory</FieldLabel>
                <Select
                  value={action.subCategoryId ?? NO_SELECTION_VALUE}
                  items={[
                    { value: NO_SELECTION_VALUE, label: "No subcategory" },
                    ...(selectedCategory?.subcategories ?? []).map((subcategory) => ({ value: subcategory.id, label: subcategory.name })),
                  ]}
                  onValueChange={(value) =>
                    setAction((state) => ({ ...state, subCategoryId: value && value !== NO_SELECTION_VALUE ? value : null }))
                  }
                >
                  <SelectTrigger disabled={!selectedCategory || selectedCategory.subcategories.length === 0}>
                    <SelectValue placeholder="No subcategory" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value={NO_SELECTION_VALUE}>No subcategory</SelectItem>
                      {(selectedCategory?.subcategories ?? []).map((subcategory) => (
                        <SelectItem key={subcategory.id} value={subcategory.id}>
                          {subcategory.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              <p className="text-xs text-muted-foreground sm:col-span-2">
                A transaction is created automatically only when the email resolves to both an account and a category (either from this rule or the
                connection's default account). Otherwise it waits in the review inbox.
              </p>
            </div>
          ) : (
            <p className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-muted-foreground">
              Matching emails are marked as ignored and never create transactions. You can restore them from the review inbox.
            </p>
          )}

          <Separator />

          <Field>
            <div className="flex items-center justify-between">
              <FieldLabel>Preview against recent emails</FieldLabel>
              {previewRule.isPending ? (
                <HugeiconsIcon icon={Loading03Icon} strokeWidth={2} className="size-4 animate-spin text-muted-foreground" />
              ) : preview && preview.length > 0 ? (
                <span className="text-xs text-muted-foreground">
                  {matchedCount} of {preview.length} match
                </span>
              ) : null}
            </div>

            {preview === null ? (
              <p className="text-sm text-muted-foreground">Checking recent emails…</p>
            ) : preview.length === 0 ? (
              <p className="text-sm text-muted-foreground">No parsed emails yet — sync a connection first and the preview will light up here.</p>
            ) : (
              <div className="flex max-h-56 flex-col gap-1.5 overflow-y-auto pr-1">
                {preview.slice(0, 12).map((entry) => (
                  <div
                    key={entry.itemId}
                    className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-1.5 text-sm ${
                      entry.matches ? "border-primary/30 bg-primary/5" : "border-border/50 bg-muted/10 opacity-70"
                    }`}
                  >
                    <span className="min-w-0 truncate">{entry.merchant ?? entry.description ?? entry.subject ?? "Email"}</span>
                    <span className="flex shrink-0 items-center gap-2">
                      {entry.amount != null && entry.currency ? (
                        <span className="text-xs text-muted-foreground tabular-nums">{formatCurrency(entry.amount, entry.currency)}</span>
                      ) : null}
                      {entry.matches ? (
                        <Badge variant="secondary">
                          <HugeiconsIcon icon={Tick01Icon} strokeWidth={2} data-icon="inline-start" />
                          Match
                        </Badge>
                      ) : (
                        <Badge variant="ghost">No match</Badge>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Field>
        </FieldGroup>

        {errorMessage ? (
          <Alert variant="destructive">
            <AlertTitle>Unable to save</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? <HugeiconsIcon icon={Loading03Icon} strokeWidth={2} className="animate-spin" data-icon="inline-start" /> : null}
            {isSaving ? "Saving" : isEdit ? "Save rule" : "Create rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
