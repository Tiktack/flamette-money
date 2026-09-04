import * as React from "react"

import { Edit01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NumberInput } from "@/components/ui/number-input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useAccounts } from "@/features/accounts/hooks"
import { useAppInfo } from "@/features/app/hooks"
import { useCategories } from "@/features/categories/hooks"
import { getApiErrorMessage } from "@/features/shared/errors"
import { useCreateTransaction, useTransaction, useTransactionsSearch, useUpdateTransaction } from "@/features/transactions/hooks"
import { useTrips } from "@/features/trips/hooks"
import type { CategoryHierarchy } from "@/features/categories/types"
import type { TransactionCreateRequest, TransactionDetail, TransactionType, TransactionUpdateRequest } from "@/features/transactions/types"
import { CategoryIconBadge } from "@/lib/category-icons"
import { formatDateInput, toNumber } from "@/lib/finance"

// Pre-fills the "new" form from an external draft (e.g. an email-import review item).
// Every field is optional; missing values fall back to the normal defaults.
export type TransactionEditorDraft = {
  date?: string | null
  type?: TransactionType
  amount?: number | null
  currency?: string | null
  accountId?: string | null
  categoryId?: string | null
  subCategoryId?: string | null
  merchantName?: string | null
  location?: string | null
  note?: string | null
}

export type TransactionEditorDialogProps = {
  open: boolean
  mode: "new" | "edit"
  transactionId?: string
  onOpenChange: (open: boolean) => void
  presetCategoryId?: string
  presetTripId?: string
  presetType?: TransactionType
  initialDraft?: TransactionEditorDraft
  // Replaces the default create mutation in "new" mode (e.g. the email-import approve flow
  // creates the transaction and links the review item atomically in one server call). It
  // throws on failure so the dialog surfaces the error like any other save.
  submitNewOverride?: (request: TransactionCreateRequest) => Promise<unknown>
}

type TransactionFormState = {
  date: string
  type: TransactionType
  amount: number | null
  amount2: number | null
  currency: string
  currency2: string
  accountId: string
  tripId: string | null
  categoryId: string | null
  subCategoryId: string | null
  targetAccountId: string | null
  originalTransactionId: string
  note: string
  merchantName: string
  location: string
}

const defaultType: TransactionType = "Expense"

function buildCategoryMap(categories: CategoryHierarchy[]) {
  const map = new Map<string, CategoryHierarchy>()
  for (const category of categories) {
    map.set(category.id, category)
    for (const subcategory of category.subcategories) {
      map.set(subcategory.id, subcategory)
    }
  }
  return map
}

function buildDefaultState(type: TransactionType): TransactionFormState {
  return {
    date: formatDateInput(new Date()),
    type,
    amount: null,
    amount2: null,
    currency: "USD",
    currency2: "USD",
    accountId: "",
    tripId: null,
    categoryId: null,
    subCategoryId: null,
    targetAccountId: null,
    originalTransactionId: "",
    note: "",
    merchantName: "",
    location: "",
  }
}

function fillFromTransaction(transaction: TransactionDetail): TransactionFormState {
  return {
    date: transaction.date ? transaction.date.slice(0, 10) : formatDateInput(new Date()),
    type: transaction.type,
    amount: toNumber(transaction.amount),
    amount2: transaction.amount2 == null ? null : toNumber(transaction.amount2),
    currency: (transaction.currency ?? "USD").toUpperCase(),
    currency2: (transaction.currency2 ?? transaction.currency ?? "USD").toUpperCase(),
    accountId: transaction.accountId,
    tripId: transaction.tripId,
    categoryId: transaction.categoryId,
    subCategoryId: transaction.subCategoryId,
    targetAccountId: transaction.targetAccountId,
    originalTransactionId: transaction.originalTransactionId ?? "",
    note: transaction.note ?? "",
    merchantName: transaction.merchantName ?? "",
    location: transaction.location ?? "",
  }
}

function applyPresetCategory(state: TransactionFormState, presetCategoryId: string, categories: CategoryHierarchy[]): TransactionFormState {
  const map = buildCategoryMap(categories)
  const category = map.get(presetCategoryId)
  if (!category) {
    return state
  }

  if (category.parentId) {
    return {
      ...state,
      type: category.type === "Income" ? "Income" : "Expense",
      categoryId: category.parentId,
      subCategoryId: category.id,
    }
  }

  return {
    ...state,
    type: category.type === "Income" ? "Income" : "Expense",
    categoryId: category.id,
    subCategoryId: null,
  }
}

function applyEditorDraft(state: TransactionFormState, draft: TransactionEditorDraft): TransactionFormState {
  const currency = draft.currency?.toUpperCase()

  return {
    ...state,
    date: draft.date ?? state.date,
    type: draft.type ?? state.type,
    amount: draft.amount != null && draft.amount > 0 ? draft.amount : state.amount,
    currency: currency ?? state.currency,
    currency2: currency ?? state.currency2,
    accountId: draft.accountId ?? state.accountId,
    categoryId: draft.categoryId ?? state.categoryId,
    subCategoryId: draft.subCategoryId ?? state.subCategoryId,
    merchantName: draft.merchantName ?? state.merchantName,
    location: draft.location ?? state.location,
    note: draft.note ?? state.note,
  }
}

// ─── Transaction form fields ────────────────────────────────────────────

function TransactionFormFields({
  form,
  setForm,
  categories,
  categoryMap,
  accountMap,
  accountsData,
  currencyOptions,
  tripsData,
  recentTransactions,
  allowedParents,
}: {
  form: TransactionFormState
  setForm: React.Dispatch<React.SetStateAction<TransactionFormState>>
  categories: CategoryHierarchy[]
  categoryMap: Map<string, CategoryHierarchy>
  accountMap: Map<string, { name: string; currency: string }>
  accountsData: { id: string; name: string; currency: string }[]
  currencyOptions: string[]
  tripsData: { id: string; name: string }[]
  recentTransactions: {
    id: string
    date: string
    accountId: string
    amount: number | string
    type: string
  }[]
  allowedParents: CategoryHierarchy[]
}) {
  const requiresTarget = form.type === "Transfer"
  const requiresOriginal = form.type === "Refund"
  const showCategoryFields = form.type !== "Transfer"

  const selectedParent = React.useMemo(
    () => (form.categoryId ? (categories.find((category) => category.id === form.categoryId) ?? null) : null),
    [categories, form.categoryId]
  )

  // The search already filters to expenses server-side.
  const originalTransactionOptions = recentTransactions.slice(0, 100).map((transaction) => ({
    value: transaction.id,
    label: `${transaction.date.slice(0, 10)} · ${accountMap.get(transaction.accountId)?.name ?? "Account"} · ${toNumber(transaction.amount).toFixed(2)}`,
  }))

  // In edit mode the linked expense may fall outside the fetched options — keep it selectable
  // so the select can render a value.
  if (form.originalTransactionId && !originalTransactionOptions.some((option) => option.value === form.originalTransactionId)) {
    originalTransactionOptions.unshift({ value: form.originalTransactionId, label: "Currently linked expense" })
  }

  return (
    <div className="grid gap-5">
      {/* Transaction type selector */}
      <div className="flex flex-wrap gap-1.5">
        {(["Expense", "Income", "Transfer", "Refund"] as const).map((type) => (
          <Button
            key={type}
            type="button"
            size="sm"
            variant={form.type === type ? "default" : "outline"}
            onClick={() =>
              setForm((state) => {
                const nextCategory = state.categoryId ? categoryMap.get(state.categoryId) : null
                const allowsExistingCategory = nextCategory && nextCategory.type === (type === "Income" ? "Income" : "Expense")
                return {
                  ...state,
                  type,
                  tripId: type === "Expense" ? state.tripId : null,
                  categoryId: type === "Transfer" || !allowsExistingCategory ? null : state.categoryId,
                  subCategoryId: type === "Transfer" || !allowsExistingCategory ? null : state.subCategoryId,
                  targetAccountId: type === "Transfer" ? state.targetAccountId : null,
                  originalTransactionId: type === "Refund" ? state.originalTransactionId : "",
                  amount2: type === "Transfer" ? state.amount2 : null,
                }
              })
            }
          >
            {type}
          </Button>
        ))}
      </div>

      {/* Core fields */}
      <FieldGroup className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Field>
          <FieldLabel>Date</FieldLabel>
          <DatePicker value={form.date} onValueChange={(date) => setForm((state) => ({ ...state, date }))} />
        </Field>

        <Field>
          <FieldLabel>{requiresTarget ? "Source account" : "Account"}</FieldLabel>
          <Select
            value={form.accountId}
            items={accountsData.map((account) => ({ value: account.id, label: account.name }))}
            onValueChange={(value) => {
              const nextAccountId = value ?? ""
              setForm((state) => ({
                ...state,
                accountId: nextAccountId,
                // Changing the source onto the current target would create a transfer-to-self.
                targetAccountId: state.targetAccountId === nextAccountId ? null : state.targetAccountId,
                currency: accountMap.get(nextAccountId)?.currency ?? state.currency,
                currency2: requiresTarget ? state.currency2 : (accountMap.get(nextAccountId)?.currency ?? state.currency2),
              }))
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {accountsData.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel>Amount</FieldLabel>
          <NumberInput min={0} decimalScale={2} placeholder="0.00" value={form.amount} onValueChange={(amount) => setForm((state) => ({ ...state, amount }))} />
        </Field>

        <Field>
          <FieldLabel>Currency</FieldLabel>
          <Select
            value={form.currency}
            onValueChange={(value) =>
              setForm((state) => ({
                ...state,
                currency: value ?? state.currency,
              }))
            }
          >
            <SelectTrigger>
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
        </Field>
      </FieldGroup>

      {/* Transfer-specific fields */}
      {requiresTarget ? (
        <FieldGroup className="grid gap-4 sm:grid-cols-3">
          <Field>
            <FieldLabel>Target account</FieldLabel>
            <Select
              value={form.targetAccountId ?? ""}
              items={accountsData.map((account) => ({ value: account.id, label: account.name }))}
              onValueChange={(value) => {
                const nextTargetAccountId = value ?? null
                setForm((state) => ({
                  ...state,
                  targetAccountId: nextTargetAccountId,
                  currency2: (nextTargetAccountId ? accountMap.get(nextTargetAccountId)?.currency : undefined) ?? state.currency2,
                }))
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select target account" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {accountsData
                    .filter((account) => account.id !== form.accountId)
                    .map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel>Target amount</FieldLabel>
            <NumberInput
              min={0}
              decimalScale={2}
              placeholder="Same as source"
              value={form.amount2}
              onValueChange={(amount2) => setForm((state) => ({ ...state, amount2 }))}
            />
          </Field>
          <Field>
            <FieldLabel>Target currency</FieldLabel>
            <Select
              value={form.currency2}
              onValueChange={(value) =>
                setForm((state) => ({
                  ...state,
                  currency2: value ?? state.currency2,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Target currency" />
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
          </Field>
        </FieldGroup>
      ) : null}

      {/* Category and trip */}
      {showCategoryFields ? (
        <FieldGroup className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel>Category</FieldLabel>
            <Select
              value={form.categoryId ?? ""}
              onValueChange={(value) =>
                setForm((state) => ({
                  ...state,
                  categoryId: value,
                  subCategoryId: null,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category">
                  {(value) => {
                    const selected = typeof value === "string" && value ? categoryMap.get(value) : null
                    if (!selected) {
                      return "Select category"
                    }
                    return (
                      <>
                        <CategoryIconBadge icon={selected.icon} color={selected.color} className="size-5 rounded-md" iconClassName="size-3" />
                        <span>{selected.name}</span>
                      </>
                    )
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {allowedParents.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <CategoryIconBadge icon={category.icon} color={category.color} className="size-5 rounded-md" iconClassName="size-3" />
                      <span>{category.name}</span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>

          {form.type === "Expense" ? (
            <Field>
              <FieldLabel>Trip</FieldLabel>
              <Select
                value={form.tripId ?? "none"}
                items={[{ value: "none", label: "No trip" }, ...tripsData.map((trip) => ({ value: trip.id, label: trip.name }))]}
                onValueChange={(value) =>
                  setForm((state) => ({
                    ...state,
                    tripId: value === "none" ? null : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Trip" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="none">No trip</SelectItem>
                    {tripsData.map((trip) => (
                      <SelectItem key={trip.id} value={trip.id}>
                        {trip.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          ) : null}

          {selectedParent?.subcategories.length ? (
            <Field className="sm:col-span-2">
              <FieldLabel>Subcategory</FieldLabel>
              <div className="flex flex-wrap gap-1.5">
                {selectedParent.subcategories.map((subcategory) => (
                  <Button
                    key={subcategory.id}
                    type="button"
                    size="sm"
                    variant={form.subCategoryId === subcategory.id ? "default" : "outline"}
                    onClick={() =>
                      setForm((state) => ({
                        ...state,
                        subCategoryId: state.subCategoryId === subcategory.id ? null : subcategory.id,
                      }))
                    }
                  >
                    <CategoryIconBadge icon={subcategory.icon} color={subcategory.color} className="size-4 rounded-[5px]" iconClassName="size-2.5" />
                    {subcategory.name}
                  </Button>
                ))}
              </div>
            </Field>
          ) : null}
        </FieldGroup>
      ) : null}

      {/* Refund original transaction */}
      {requiresOriginal ? (
        <Field>
          <FieldLabel>Original transaction</FieldLabel>
          <Select
            value={form.originalTransactionId || ""}
            items={originalTransactionOptions}
            onValueChange={(value) =>
              setForm((state) => ({
                ...state,
                originalTransactionId: value ?? "",
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select original transaction" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {originalTransactionOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
      ) : null}

      {/* Merchant, location, note */}
      <FieldGroup className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel>Merchant</FieldLabel>
          <Input
            placeholder="Store or payee name"
            value={form.merchantName}
            onChange={(event) =>
              setForm((state) => ({
                ...state,
                merchantName: event.target.value,
              }))
            }
          />
        </Field>
        <Field>
          <FieldLabel>Location</FieldLabel>
          <Input placeholder="City or address" value={form.location} onChange={(event) => setForm((state) => ({ ...state, location: event.target.value }))} />
        </Field>
        <Field className="sm:col-span-2">
          <FieldLabel>Note</FieldLabel>
          <Textarea
            rows={2}
            value={form.note}
            onChange={(event) => setForm((state) => ({ ...state, note: event.target.value }))}
            placeholder="Optional notes about this transaction"
          />
        </Field>
      </FieldGroup>
    </div>
  )
}

// ─── Main dialog ────────────────────────────────────────────────────────

export function TransactionEditorDialog({
  open,
  mode,
  transactionId,
  onOpenChange,
  presetCategoryId,
  presetTripId,
  presetType,
  initialDraft,
  submitNewOverride,
}: TransactionEditorDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <TransactionEditorContent
          open={open}
          mode={mode}
          transactionId={transactionId}
          onClose={() => onOpenChange(false)}
          presetCategoryId={presetCategoryId}
          presetTripId={presetTripId}
          presetType={presetType}
          initialDraft={initialDraft}
          submitNewOverride={submitNewOverride}
        />
      </DialogContent>
    </Dialog>
  )
}

function TransactionEditorContent({
  open,
  mode,
  transactionId,
  onClose,
  presetCategoryId,
  presetTripId,
  presetType,
  initialDraft,
  submitNewOverride,
}: Omit<TransactionEditorDialogProps, "onOpenChange"> & { onClose: () => void }) {
  const accountsQuery = useAccounts()
  const appInfoQuery = useAppInfo()
  const categoriesQuery = useCategories()
  const tripsQuery = useTrips()
  const transactionQuery = useTransaction(mode === "edit" ? transactionId : undefined)

  const currencyOptions = React.useMemo(() => {
    const values = new Set<string>()
    for (const currency of appInfoQuery.data?.supportedCurrencies ?? []) {
      values.add(currency.code.toUpperCase())
    }
    for (const account of accountsQuery.data ?? []) {
      values.add(account.currency.toUpperCase())
    }
    return Array.from(values)
  }, [accountsQuery.data, appInfoQuery.data?.supportedCurrencies])

  const accountsData = (accountsQuery.data ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    currency: a.currency.toUpperCase(),
  }))

  const tripsData = (tripsQuery.data ?? []).map((t) => ({
    id: t.id,
    name: t.name,
  }))

  const isLoading = mode === "edit" ? transactionQuery.isLoading : accountsQuery.isPending || categoriesQuery.isPending

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {mode === "edit" ? (
            <>
              <HugeiconsIcon icon={Edit01Icon} className="size-5" />
              Edit transaction
            </>
          ) : (
            "New transaction"
          )}
        </DialogTitle>
        <DialogDescription>{mode === "edit" ? "Update the transaction details below." : "Add a new transaction to your records."}</DialogDescription>
      </DialogHeader>

      {isLoading ? (
        <div className="h-32 animate-pulse rounded-2xl bg-muted" />
      ) : transactionQuery.isError && mode === "edit" ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load transaction</AlertTitle>
          <AlertDescription>{getApiErrorMessage(transactionQuery.error, "Try reopening the editor.")}</AlertDescription>
        </Alert>
      ) : (
        <TransactionEditorForm
          key={mode === "edit" ? transactionId : "new"}
          open={open}
          mode={mode}
          transactionId={transactionId}
          onClose={onClose}
          presetCategoryId={presetCategoryId}
          presetTripId={presetTripId}
          presetType={presetType}
          initialDraft={initialDraft}
          submitNewOverride={submitNewOverride}
          transaction={transactionQuery.data}
          categories={categoriesQuery.data ?? []}
          accountsData={accountsData}
          currencyOptions={currencyOptions}
          tripsData={tripsData}
        />
      )}
    </>
  )
}

function TransactionEditorForm({
  open,
  mode,
  transactionId,
  onClose,
  presetCategoryId,
  presetTripId,
  presetType,
  initialDraft,
  submitNewOverride,
  transaction,
  categories,
  accountsData,
  currencyOptions,
  tripsData,
}: Omit<TransactionEditorDialogProps, "onOpenChange"> & {
  onClose: () => void
  transaction?: TransactionDetail
  categories: CategoryHierarchy[]
  accountsData: { id: string; name: string; currency: string }[]
  currencyOptions: string[]
  tripsData: { id: string; name: string }[]
}) {
  const [form, setForm] = React.useState<TransactionFormState>(() => {
    if (mode === "edit" && transaction) {
      return fillFromTransaction(transaction)
    }

    const baseState = buildDefaultState(presetType ?? defaultType)
    const withPreset = presetCategoryId ? applyPresetCategory(baseState, presetCategoryId, categories) : baseState
    const defaultAccount = accountsData[0]
    const defaultCurrency = defaultAccount?.currency ?? withPreset.currency
    const withDefaults: TransactionFormState = {
      ...withPreset,
      accountId: defaultAccount?.id ?? "",
      currency: defaultCurrency,
      currency2: defaultCurrency,
      tripId: presetTripId ?? withPreset.tripId,
    }
    return initialDraft ? applyEditorDraft(withDefaults, initialDraft) : withDefaults
  })
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const recentTransactionsQuery = useTransactionsSearch(
    form.type === "Refund" && form.accountId
      ? {
          Types: ["Expense"],
          AccountIds: [form.accountId],
        }
      : undefined,
    {
      enabled: open && form.type === "Refund" && Boolean(form.accountId),
    }
  )
  const createTransaction = useCreateTransaction()
  const updateTransaction = useUpdateTransaction()

  const categoryMap = React.useMemo(() => buildCategoryMap(categories), [categories])
  const accountMap = React.useMemo(() => {
    const map = new Map<string, { name: string; currency: string }>()
    for (const account of accountsData) {
      map.set(account.id, {
        name: account.name,
        currency: account.currency,
      })
    }
    return map
  }, [accountsData])

  const allowedParents = React.useMemo(() => {
    if (form.type === "Transfer") return []
    const allowedType = form.type === "Income" ? "Income" : "Expense"
    return categories.filter((category) => category.type === allowedType && category.parentId === null)
  }, [categories, form.type])

  const recentTransactions =
    open && form.type === "Refund"
      ? (recentTransactionsQuery.data ?? []).map((t) => ({
          id: t.id,
          date: t.date,
          accountId: t.accountId,
          amount: t.amount,
          type: t.type,
        }))
      : []

  const handleSubmit = async () => {
    setErrorMessage(null)

    if (!form.date) {
      setErrorMessage("Date is required.")
      return
    }

    if (!form.accountId) {
      setErrorMessage("Account is required.")
      return
    }

    if (toNumber(form.amount) <= 0) {
      setErrorMessage("Amount must be greater than zero.")
      return
    }

    const requiresTarget = form.type === "Transfer"
    const requiresOriginal = form.type === "Refund"
    const showCategoryFields = form.type !== "Transfer"

    if (requiresTarget && !form.targetAccountId) {
      setErrorMessage("Target account is required for transfers.")
      return
    }

    if (requiresTarget && form.targetAccountId === form.accountId) {
      setErrorMessage("Target account must be different from the source account.")
      return
    }

    if (requiresOriginal && !form.originalTransactionId) {
      setErrorMessage("Select the original transaction for refunds.")
      return
    }

    const request: TransactionCreateRequest | TransactionUpdateRequest = {
      // Send the calendar day as-is; the server stores it at UTC midnight. Converting via
      // new Date(...).toISOString() would shift it to local-midnight-in-UTC (previous day
      // for UTC+ zones), breaking day-based filters and report buckets.
      date: form.date,
      type: form.type,
      amount: toNumber(form.amount),
      amount2: requiresTarget ? (form.amount2 == null ? toNumber(form.amount) : toNumber(form.amount2)) : form.amount2 == null ? null : toNumber(form.amount2),
      currency: form.currency ? form.currency.toUpperCase() : null,
      currency2: requiresTarget ? (form.currency2 || form.currency).toUpperCase() : form.currency2 ? form.currency2.toUpperCase() : null,
      accountId: form.accountId,
      tripId: form.type === "Expense" ? form.tripId : null,
      categoryId: showCategoryFields ? form.categoryId : null,
      subCategoryId: showCategoryFields ? form.subCategoryId : null,
      targetAccountId: requiresTarget ? form.targetAccountId : null,
      originalTransactionId: requiresOriginal ? form.originalTransactionId : null,
      note: form.note.trim() || null,
      merchantName: form.merchantName.trim() || null,
      location: form.location.trim() || null,
    }

    try {
      if (mode === "edit" && transactionId) {
        await updateTransaction.mutateAsync({ id: transactionId, request })
      } else if (submitNewOverride) {
        await submitNewOverride(request as TransactionCreateRequest)
      } else {
        await createTransaction.mutateAsync(request)
      }
      onClose()
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Unable to save transaction."))
    }
  }

  return (
    <>
      <div className="max-h-[72vh] overflow-y-auto pr-1">
        <TransactionFormFields
          form={form}
          setForm={setForm}
          categories={categories}
          categoryMap={categoryMap}
          accountMap={accountMap}
          accountsData={accountsData}
          currencyOptions={currencyOptions}
          tripsData={tripsData}
          recentTransactions={recentTransactions}
          allowedParents={allowedParents}
        />

        {errorMessage ? (
          <Alert variant="destructive" className="mt-4">
            <AlertTitle>Save failed</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={createTransaction.isPending || updateTransaction.isPending}>
          {createTransaction.isPending || updateTransaction.isPending ? "Saving..." : mode === "edit" ? "Save changes" : "Create transaction"}
        </Button>
      </DialogFooter>
    </>
  )
}
