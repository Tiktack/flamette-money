import * as React from "react"

import { Alert02Icon, ArrowDown01Icon, ArrowUp01Icon, Delete02Icon, Edit01Icon, PlusSignIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { createFileRoute } from "@tanstack/react-router"

import { RuleEditorDialog } from "@/components/email-import/rule-editor-dialog"
import { EmptyState } from "@/components/empty-state"
import { CardSkeleton } from "@/components/page-skeletons"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { useAccounts } from "@/features/accounts/hooks"
import { useCategories } from "@/features/categories/hooks"
import {
  useDeleteEmailImportRule,
  useEmailConnections,
  useEmailImportRules,
  useReorderEmailImportRules,
  useUpdateEmailImportRule,
} from "@/features/email-import/hooks"
import type { EmailRuleCondition } from "@/features/email-import/rules"
import type { EmailImportRuleResponse } from "@/features/email-import/types"
import { getApiErrorMessage } from "@/features/shared/errors"

export const Route = createFileRoute("/_protected/email-import/rules")({
  head: () => ({ meta: [{ title: "Import rules — Flamette Money" }] }),
  component: EmailImportRulesPage,
})

function conditionLabel(condition: EmailRuleCondition, connectionNameById: Map<string, string>) {
  switch (condition.field) {
    case "description":
    case "merchant":
    case "accountHint": {
      const fieldLabel = condition.field === "accountHint" ? "account hint" : condition.field
      return `${fieldLabel} ${condition.operator === "contains" ? "contains" : "is"} “${condition.value}”`
    }
    case "currency":
      return `currency is ${condition.value.toUpperCase()}`
    case "direction":
      return condition.value === "income" ? "money in" : "money out"
    case "connectionId":
      return `from ${connectionNameById.get(condition.value) ?? "deleted connection"}`
    case "amount": {
      if (condition.operator === "between") {
        return `amount ${condition.value}–${condition.value2 ?? condition.value}`
      }
      return `amount ${condition.operator === "gte" ? "≥" : "≤"} ${condition.value}`
    }
  }
}

function EmailImportRulesPage() {
  const rulesQuery = useEmailImportRules()
  const connectionsQuery = useEmailConnections()
  const accountsQuery = useAccounts()
  const categoriesQuery = useCategories()
  const updateRule = useUpdateEmailImportRule()
  const deleteRule = useDeleteEmailImportRule()
  const reorderRules = useReorderEmailImportRules()
  const [editor, setEditor] = React.useState<{ rule: EmailImportRuleResponse | null } | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<EmailImportRuleResponse | null>(null)

  const rules = React.useMemo(() => rulesQuery.data ?? [], [rulesQuery.data])
  const connections = React.useMemo(() => connectionsQuery.data?.connections ?? [], [connectionsQuery.data?.connections])

  const connectionNameById = React.useMemo(() => new Map(connections.map((connection) => [connection.id, connection.name])), [connections])

  const accountNameById = React.useMemo(() => new Map((accountsQuery.data ?? []).map((account) => [account.id, account.name])), [accountsQuery.data])

  const categoryNameById = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const category of categoriesQuery.data ?? []) {
      map.set(category.id, category.name)
      for (const subcategory of category.subcategories ?? []) {
        map.set(subcategory.id, subcategory.name)
      }
    }
    return map
  }, [categoriesQuery.data])

  const handleToggleEnabled = (rule: EmailImportRuleResponse, enabled: boolean) => {
    updateRule.mutate({
      id: rule.id,
      request: {
        name: rule.name,
        enabled,
        matchMode: rule.matchMode,
        conditions: rule.conditions,
        action: rule.action,
      },
    })
  }

  const handleMove = (index: number, delta: -1 | 1) => {
    const target = index + delta
    if (target < 0 || target >= rules.length) {
      return
    }

    const orderedIds = rules.map((rule) => rule.id)
    ;[orderedIds[index], orderedIds[target]] = [orderedIds[target], orderedIds[index]]
    reorderRules.mutate(orderedIds)
  }

  const handleDelete = async () => {
    if (!deleteTarget) {
      return
    }

    try {
      await deleteRule.mutateAsync(deleteTarget.id)
      setDeleteTarget(null)
    } catch {
      // rendered below
    }
  }

  const renderActionSummary = (rule: EmailImportRuleResponse) => {
    if (rule.action.type === "ignore") {
      return <Badge variant="destructive">Ignore email</Badge>
    }

    const { accountId, categoryId, subCategoryId, note } = rule.action
    const accountMissing = accountId !== null && !accountNameById.has(accountId)
    const categoryMissing = (categoryId !== null && !categoryNameById.has(categoryId)) || (subCategoryId !== null && !categoryNameById.has(subCategoryId))
    const parts: string[] = []
    if (accountId) parts.push(accountNameById.get(accountId) ?? "?")
    if (categoryId) {
      const categoryLabel = categoryNameById.get(categoryId) ?? "?"
      parts.push(subCategoryId ? `${categoryLabel} / ${categoryNameById.get(subCategoryId) ?? "?"}` : categoryLabel)
    }
    if (note) parts.push(`“${note}”`)

    return (
      <span className="flex flex-wrap items-center gap-1.5">
        <span className="text-sm text-muted-foreground">→ {parts.length > 0 ? parts.join(" · ") : "no details assigned"}</span>
        {accountMissing || categoryMissing ? (
          <Badge variant="outline" className="text-amber-600 dark:text-amber-400">
            <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} data-icon="inline-start" />
            Broken reference
          </Badge>
        ) : null}
      </span>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Import rules</h1>
          <p className="text-sm text-muted-foreground">
            Rules run top to bottom on every parsed email — the first match decides the account, category, and note. Emails that resolve to an account
            and category become transactions automatically.
          </p>
        </div>
        <Button onClick={() => setEditor({ rule: null })}>
          <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} data-icon="inline-start" />
          Add rule
        </Button>
      </div>

      {rulesQuery.isPending ? (
        <CardSkeleton className="h-64" />
      ) : rulesQuery.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load rules</AlertTitle>
          <AlertDescription>{getApiErrorMessage(rulesQuery.error, "Try again in a moment.")}</AlertDescription>
        </Alert>
      ) : rules.length === 0 ? (
        <EmptyState
          eyebrow="Rules"
          title="No rules yet"
          description="Create rules like “merchant contains ŻABKA → Groceries on PKO Card”. Emails matched by a rule are categorized — and imported automatically when the rule resolves an account and category."
          action={
            <Button onClick={() => setEditor({ rule: null })}>
              <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} data-icon="inline-start" />
              Create your first rule
            </Button>
          }
        />
      ) : (
        <Card className="border-border/60 py-2">
          <CardContent className="flex flex-col px-4">
            {rules.map((rule, index) => (
              <React.Fragment key={rule.id}>
                {index > 0 ? <Separator /> : null}
                <div className="flex items-center gap-3 py-3">
                  <div className="flex flex-col">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="size-6 text-muted-foreground"
                      disabled={index === 0 || reorderRules.isPending}
                      onClick={() => handleMove(index, -1)}
                    >
                      <HugeiconsIcon icon={ArrowUp01Icon} strokeWidth={2} />
                      <span className="sr-only">Move rule up</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="size-6 text-muted-foreground"
                      disabled={index === rules.length - 1 || reorderRules.isPending}
                      onClick={() => handleMove(index, 1)}
                    >
                      <HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={2} />
                      <span className="sr-only">Move rule down</span>
                    </Button>
                  </div>

                  <Switch checked={rule.enabled} onCheckedChange={(enabled) => handleToggleEnabled(rule, enabled)} aria-label="Enable rule" />

                  <div className={`min-w-0 flex-1 space-y-1.5 ${rule.enabled ? "" : "opacity-50"}`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-foreground">{rule.name}</span>
                      {rule.conditions.length > 1 ? (
                        <span className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                          {rule.matchMode === "all" ? "all" : "any"}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {rule.conditions.length === 0 ? (
                        <Badge variant="outline" className="text-muted-foreground">
                          Matches every email
                        </Badge>
                      ) : (
                        rule.conditions.map((condition, conditionIndex) => (
                          <Badge key={conditionIndex} variant="secondary" className="font-normal normal-case tracking-normal">
                            {conditionLabel(condition, connectionNameById)}
                          </Badge>
                        ))
                      )}
                    </div>
                    {renderActionSummary(rule)}
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => setEditor({ rule })}>
                      <HugeiconsIcon icon={Edit01Icon} strokeWidth={2} />
                      <span className="sr-only">Edit rule</span>
                    </Button>
                    <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteTarget(rule)}>
                      <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
                      <span className="sr-only">Delete rule</span>
                    </Button>
                  </div>
                </div>
              </React.Fragment>
            ))}
          </CardContent>
        </Card>
      )}

      <RuleEditorDialog open={Boolean(editor)} onOpenChange={(open) => !open && setEditor(null)} rule={editor?.rule ?? null} connections={connections} />

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete rule</DialogTitle>
            <DialogDescription>“{deleteTarget?.name}” will stop matching new emails. Already-imported transactions are not affected.</DialogDescription>
          </DialogHeader>
          {deleteRule.isError ? (
            <Alert variant="destructive">
              <AlertTitle>Delete failed</AlertTitle>
              <AlertDescription>{getApiErrorMessage(deleteRule.error, "Unable to delete rule.")}</AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteRule.isPending}>
              {deleteRule.isPending ? "Deleting" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
