import * as React from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { getApiErrorMessage } from "@/lib/api/errors"
import {
  useAccounts,
  useAppInfo,
  useCategories,
  useCreateTransaction,
  useScanReceipt,
  useTransaction,
  useTransactionsSearch,
  useTrips,
  useUpdateTransaction,
} from "@/lib/api/hooks"
import type {
  CategoryHierarchy,
  ReceiptScanResult,
  TransactionCreateRequest,
  TransactionDetail,
  TransactionType,
  TransactionUpdateRequest,
} from "@/lib/api/types"
import { formatDateInput, normalizeHexColor, toNumber } from "@/lib/finance"

type TransactionEditorDialogProps = {
  open: boolean
  mode: "new" | "edit"
  transactionId?: string
  onOpenChange: (open: boolean) => void
  presetCategoryId?: string
  presetType?: TransactionType
}

type TransactionItemFormState = {
  name: string
  quantity: number
  unit: string
  unitPrice: number
  promotionAmount: number
  categoryId: string | null
  subCategoryId: string | null
}

type TransactionFormState = {
  date: string
  type: TransactionType
  amount: number | ""
  amount2: number | ""
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
  items: TransactionItemFormState[]
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
    amount: "",
    amount2: "",
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
    items: [],
  }
}

function fillFromTransaction(transaction: TransactionDetail): TransactionFormState {
  return {
    date: transaction.date ? transaction.date.slice(0, 10) : formatDateInput(new Date()),
    type: transaction.type,
    amount: toNumber(transaction.amount),
    amount2: transaction.amount2 == null ? "" : toNumber(transaction.amount2),
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
    items: (transaction.items ?? []).map((item) => ({
      name: item.name,
      quantity: toNumber(item.quantity),
      unit: item.unit ?? "",
      unitPrice: toNumber(item.unitPrice),
      promotionAmount: toNumber(item.promotionAmount),
      categoryId: item.categoryId,
      subCategoryId: item.subCategoryId,
    })),
  }
}

function applyPresetCategory(state: TransactionFormState, presetCategoryId: string, categories: CategoryHierarchy[]) {
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

function applyReceiptScanToForm(state: TransactionFormState, scanResult: ReceiptScanResult): TransactionFormState {
  const parsedDate = scanResult.date ? new Date(scanResult.date) : null
  const items: TransactionItemFormState[] = (scanResult.items ?? []).map((item) => ({
    name: item.name ?? "",
    quantity: toNumber(item.quantity) || 1,
    unit: item.unit ?? "",
    unitPrice: toNumber(item.unitPrice),
    promotionAmount: toNumber(item.promotionAmount),
    categoryId: item.categoryId,
    subCategoryId: item.subCategoryId,
  }))

  const firstCategorized = items.find((item) => item.categoryId || item.subCategoryId)

  return {
    ...state,
    type: "Expense",
    date: parsedDate && !Number.isNaN(parsedDate.getTime()) ? formatDateInput(parsedDate) : state.date,
    amount: toNumber(scanResult.amount) > 0 ? toNumber(scanResult.amount) : state.amount,
    amount2: "",
    currency: scanResult.currency ? scanResult.currency.toUpperCase() : state.currency,
    currency2: scanResult.currency ? scanResult.currency.toUpperCase() : state.currency2,
    merchantName: scanResult.merchant?.trim() || state.merchantName,
    categoryId: firstCategorized?.categoryId ?? state.categoryId,
    subCategoryId: firstCategorized?.subCategoryId ?? state.subCategoryId,
    items,
  }
}

export function TransactionEditorDialog({
  open,
  mode,
  transactionId,
  onOpenChange,
  presetCategoryId,
  presetType,
}: TransactionEditorDialogProps) {
  const accountsQuery = useAccounts()
  const appInfoQuery = useAppInfo()
  const categoriesQuery = useCategories()
  const tripsQuery = useTrips()
  const recentTransactionsQuery = useTransactionsSearch()
  const transactionQuery = useTransaction(mode === "edit" ? transactionId : undefined)
  const createTransaction = useCreateTransaction()
  const updateTransaction = useUpdateTransaction()
  const scanReceipt = useScanReceipt()
  const [form, setForm] = React.useState<TransactionFormState>(() => buildDefaultState(presetType ?? defaultType))
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [scanPreview, setScanPreview] = React.useState<string | null>(null)
  const [scanResult, setScanResult] = React.useState<ReceiptScanResult | null>(null)
  const [scanError, setScanError] = React.useState<string | null>(null)

  const categories = categoriesQuery.data ?? []
  const categoryMap = React.useMemo(() => buildCategoryMap(categories), [categories])
  const accountMap = React.useMemo(() => {
    const map = new Map<string, { name: string; currency: string; color: string }>()
    for (const account of accountsQuery.data ?? []) {
      map.set(account.id, {
        name: account.name,
        currency: account.currency.toUpperCase(),
        color: normalizeHexColor(account.color),
      })
    }
    return map
  }, [accountsQuery.data])

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

  const selectedParent = React.useMemo(
    () => (form.categoryId ? categories.find((category) => category.id === form.categoryId) ?? null : null),
    [categories, form.categoryId],
  )

  const allowedParents = React.useMemo(() => {
    if (form.type === "Transfer") {
      return []
    }

    const allowedType = form.type === "Income" ? "Income" : "Expense"
    return categories.filter((category) => category.type === allowedType && category.parentId === null)
  }, [categories, form.type])

  React.useEffect(() => {
    if (!open) {
      return
    }

    setErrorMessage(null)
    setScanError(null)
    setScanResult(null)

    if (mode === "edit" && transactionQuery.data) {
      setForm(fillFromTransaction(transactionQuery.data))
      return
    }

    if (mode === "new") {
      const baseState = buildDefaultState(presetType ?? defaultType)
      const withPreset = presetCategoryId ? applyPresetCategory(baseState, presetCategoryId, categories) : baseState
      const defaultAccount = accountsQuery.data?.[0]
      const defaultCurrency = defaultAccount?.currency?.toUpperCase() ?? withPreset.currency
      setForm({
        ...withPreset,
        accountId: defaultAccount?.id ?? "",
        currency: defaultCurrency,
        currency2: defaultCurrency,
      })
    }
  }, [accountsQuery.data, categories, mode, open, presetCategoryId, presetType, transactionQuery.data])

  React.useEffect(() => {
    return () => {
      if (scanPreview) {
        URL.revokeObjectURL(scanPreview)
      }
    }
  }, [scanPreview])

  const requiresTarget = form.type === "Transfer"
  const requiresOriginal = form.type === "Refund"
  const showCategoryFields = form.type !== "Transfer"

  const handleScanFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null

    if (scanPreview) {
      URL.revokeObjectURL(scanPreview)
    }

    setScanResult(null)
    setScanError(null)

    if (!file) {
      setScanPreview(null)
      return
    }

    setScanPreview(URL.createObjectURL(file))

    if (!form.accountId) {
      setScanError("Select an account before scanning a receipt.")
      return
    }

    try {
      const result = await scanReceipt.mutateAsync({ file, accountId: form.accountId })
      setScanResult(result)
      setForm((state) => applyReceiptScanToForm(state, result))
    } catch (error) {
      setScanError(getApiErrorMessage(error, "Failed to scan receipt."))
    }
  }

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

    if (requiresTarget && !form.targetAccountId) {
      setErrorMessage("Target account is required for transfers.")
      return
    }

    if (requiresOriginal && !form.originalTransactionId) {
      setErrorMessage("Select the original transaction for refunds.")
      return
    }

    const request: TransactionCreateRequest | TransactionUpdateRequest = {
      date: new Date(`${form.date}T00:00:00`).toISOString(),
      type: form.type,
      amount: toNumber(form.amount),
      amount2: requiresTarget ? (form.amount2 === "" ? toNumber(form.amount) : toNumber(form.amount2)) : form.amount2 === "" ? null : toNumber(form.amount2),
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
      items: form.items.length
        ? form.items.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            unit: item.unit.trim() || null,
            unitPrice: item.unitPrice,
            promotionAmount: item.promotionAmount,
            categoryId: item.categoryId,
            subCategoryId: item.subCategoryId,
          }))
        : null,
    }

    try {
      if (mode === "edit" && transactionId) {
        await updateTransaction.mutateAsync({ id: transactionId, request })
      } else {
        await createTransaction.mutateAsync(request)
      }
      onOpenChange(false)
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Unable to save transaction."))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Edit transaction" : "New transaction"}</DialogTitle>
          <DialogDescription>Capture everything from simple expenses to transfers, refunds, receipt scans, and itemized lines.</DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[72vh] gap-6 overflow-y-auto pr-1">
          {mode === "new" ? (
            <Card className="border-border/60 bg-muted/30">
              <CardHeader>
                <CardTitle className="text-base">Receipt scan</CardTitle>
                <CardDescription>Upload an image to draft an expense before you review and save it.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <Input accept="image/jpeg,image/png,image/webp" onChange={handleScanFileChange} type="file" />
                {scanPreview ? <img alt="Receipt preview" className="max-h-52 rounded-2xl object-contain" src={scanPreview} /> : null}
                {scanResult ? (
                  <p className="text-sm text-muted-foreground">
                    Draft applied from {scanResult.merchant ?? "receipt"}. {scanResult.items?.length ?? 0} items detected.
                  </p>
                ) : null}
                {scanError ? (
                  <Alert variant="destructive">
                    <AlertTitle>Scan failed</AlertTitle>
                    <AlertDescription>{scanError}</AlertDescription>
                  </Alert>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {transactionQuery.isLoading && mode === "edit" ? (
            <div className="h-32 animate-pulse rounded-2xl bg-muted" />
          ) : null}
          {transactionQuery.isError && mode === "edit" ? (
            <Alert variant="destructive">
              <AlertTitle>Unable to load transaction</AlertTitle>
              <AlertDescription>{getApiErrorMessage(transactionQuery.error, "Try reopening the editor.")}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {(["Expense", "Income", "Transfer", "Refund"] as const).map((type) => (
              <Button
                key={type}
                type="button"
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
                      amount2: type === "Transfer" ? state.amount2 : "",
                    }
                  })
                }
              >
                {type}
              </Button>
            ))}
          </div>

          <FieldGroup className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field>
              <FieldLabel>Date</FieldLabel>
              <Input type="date" value={form.date} onChange={(event) => setForm((state) => ({ ...state, date: event.target.value }))} />
            </Field>

            <Field>
              <FieldLabel>{requiresTarget ? "Source account" : "Account"}</FieldLabel>
              <Select
                value={form.accountId}
                onValueChange={(value) =>
                  setForm((state) => ({
                    ...state,
                    accountId: value,
                    currency: accountMap.get(value)?.currency ?? state.currency,
                    currency2: requiresTarget ? state.currency2 : accountMap.get(value)?.currency ?? state.currency2,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {(accountsQuery.data ?? []).map((account) => (
                      <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel>Amount</FieldLabel>
              <Input type="number" min={0} value={form.amount} onChange={(event) => setForm((state) => ({ ...state, amount: event.target.value === "" ? "" : Number(event.target.value) }))} />
            </Field>

            <Field>
              <FieldLabel>Currency</FieldLabel>
              <Select value={form.currency} onValueChange={(value) => setForm((state) => ({ ...state, currency: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {currencyOptions.map((currency) => (
                      <SelectItem key={currency} value={currency}>{currency}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>

            {requiresTarget ? (
              <>
                <Field>
                  <FieldLabel>Target account</FieldLabel>
                  <Select value={form.targetAccountId ?? ""} onValueChange={(value) => setForm((state) => ({ ...state, targetAccountId: value, currency2: accountMap.get(value)?.currency ?? state.currency2 }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select target account" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {(accountsQuery.data ?? []).filter((account) => account.id !== form.accountId).map((account) => (
                          <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Target amount</FieldLabel>
                  <Input type="number" min={0} value={form.amount2} onChange={(event) => setForm((state) => ({ ...state, amount2: event.target.value === "" ? "" : Number(event.target.value) }))} />
                </Field>
                <Field>
                  <FieldLabel>Target currency</FieldLabel>
                  <Select value={form.currency2} onValueChange={(value) => setForm((state) => ({ ...state, currency2: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Target currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {currencyOptions.map((currency) => (
                          <SelectItem key={currency} value={currency}>{currency}</SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              </>
            ) : null}

            {showCategoryFields ? (
              <>
                <Field>
                  <FieldLabel>Category</FieldLabel>
                  <Select value={form.categoryId ?? ""} onValueChange={(value) => setForm((state) => ({ ...state, categoryId: value, subCategoryId: null }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {allowedParents.map((category) => (
                          <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>

                {form.type === "Expense" ? (
                  <Field>
                    <FieldLabel>Trip</FieldLabel>
                    <Select value={form.tripId ?? "none"} onValueChange={(value) => setForm((state) => ({ ...state, tripId: value === "none" ? null : value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Trip" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="none">No trip</SelectItem>
                          {(tripsQuery.data ?? []).map((trip) => (
                            <SelectItem key={trip.id} value={trip.id}>{trip.name}</SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                ) : null}

                {selectedParent?.subcategories.length ? (
                  <Field className="xl:col-span-2">
                    <FieldLabel>Subcategory</FieldLabel>
                    <div className="flex flex-wrap gap-2">
                      {selectedParent.subcategories.map((subcategory) => (
                        <Button key={subcategory.id} type="button" variant={form.subCategoryId === subcategory.id ? "default" : "outline"} onClick={() => setForm((state) => ({ ...state, subCategoryId: state.subCategoryId === subcategory.id ? null : subcategory.id }))}>
                          {subcategory.name}
                        </Button>
                      ))}
                    </div>
                  </Field>
                ) : null}
              </>
            ) : null}

            {requiresOriginal ? (
              <Field className="xl:col-span-2">
                <FieldLabel>Original transaction</FieldLabel>
                <Select value={form.originalTransactionId || ""} onValueChange={(value) => setForm((state) => ({ ...state, originalTransactionId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select original transaction" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {(recentTransactionsQuery.data ?? [])
                        .filter((transaction) => transaction.type !== "Refund")
                        .slice(0, 100)
                        .map((transaction) => (
                          <SelectItem key={transaction.id} value={transaction.id}>
                            {transaction.date.slice(0, 10)} · {accountMap.get(transaction.accountId)?.name ?? "Account"} · {toNumber(transaction.amount).toFixed(2)}
                          </SelectItem>
                        ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            ) : null}

            <Field className="md:col-span-2 xl:col-span-4">
              <FieldLabel>Note</FieldLabel>
              <Textarea value={form.note} onChange={(event) => setForm((state) => ({ ...state, note: event.target.value }))} placeholder="Optional notes about this transaction" />
            </Field>

            <Field>
              <FieldLabel>Merchant</FieldLabel>
              <Input value={form.merchantName} onChange={(event) => setForm((state) => ({ ...state, merchantName: event.target.value }))} />
            </Field>
            <Field>
              <FieldLabel>Location</FieldLabel>
              <Input value={form.location} onChange={(event) => setForm((state) => ({ ...state, location: event.target.value }))} />
            </Field>
          </FieldGroup>

          <Card className="border-border/60 bg-card/80">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base">Items</CardTitle>
                <CardDescription>Optional line items for receipt-style transactions.</CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setForm((state) => ({
                    ...state,
                    items: [
                      ...state.items,
                      {
                        name: "",
                        quantity: 1,
                        unit: "",
                        unitPrice: 0,
                        promotionAmount: 0,
                        categoryId: state.categoryId,
                        subCategoryId: state.subCategoryId,
                      },
                    ],
                  }))
                }
              >
                Add item
              </Button>
            </CardHeader>
            <CardContent className="grid gap-4">
              {form.items.length === 0 ? (
                <p className="text-sm text-muted-foreground">No itemized lines yet.</p>
              ) : (
                form.items.map((item, index) => {
                  const itemParent = item.categoryId ? categories.find((category) => category.id === item.categoryId) ?? null : null
                  return (
                    <div key={`${index}-${item.name}`} className="grid gap-4 rounded-2xl border border-border/60 bg-background/70 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-foreground">Item {index + 1}</p>
                        <Button type="button" variant="destructive" size="sm" onClick={() => setForm((state) => ({ ...state, items: state.items.filter((_, itemIndex) => itemIndex !== index) }))}>
                          Remove
                        </Button>
                      </div>
                      <FieldGroup className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <Field className="xl:col-span-2">
                          <FieldLabel>Name</FieldLabel>
                          <Input value={item.name} onChange={(event) => setForm((state) => ({ ...state, items: state.items.map((entry, itemIndex) => itemIndex === index ? { ...entry, name: event.target.value } : entry) }))} />
                        </Field>
                        <Field>
                          <FieldLabel>Quantity</FieldLabel>
                          <Input type="number" min={0} value={item.quantity} onChange={(event) => setForm((state) => ({ ...state, items: state.items.map((entry, itemIndex) => itemIndex === index ? { ...entry, quantity: Number(event.target.value) || 0 } : entry) }))} />
                        </Field>
                        <Field>
                          <FieldLabel>Unit</FieldLabel>
                          <Input value={item.unit} onChange={(event) => setForm((state) => ({ ...state, items: state.items.map((entry, itemIndex) => itemIndex === index ? { ...entry, unit: event.target.value } : entry) }))} />
                        </Field>
                        <Field>
                          <FieldLabel>Unit price</FieldLabel>
                          <Input type="number" min={0} value={item.unitPrice} onChange={(event) => setForm((state) => ({ ...state, items: state.items.map((entry, itemIndex) => itemIndex === index ? { ...entry, unitPrice: Number(event.target.value) || 0 } : entry) }))} />
                        </Field>
                        <Field>
                          <FieldLabel>Promotion amount</FieldLabel>
                          <Input type="number" min={0} value={item.promotionAmount} onChange={(event) => setForm((state) => ({ ...state, items: state.items.map((entry, itemIndex) => itemIndex === index ? { ...entry, promotionAmount: Number(event.target.value) || 0 } : entry) }))} />
                        </Field>
                        <Field>
                          <FieldLabel>Category</FieldLabel>
                          <Select value={item.categoryId ?? ""} onValueChange={(value) => setForm((state) => ({ ...state, items: state.items.map((entry, itemIndex) => itemIndex === index ? { ...entry, categoryId: value, subCategoryId: null } : entry) }))}>
                            <SelectTrigger>
                              <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                {allowedParents.map((category) => (
                                  <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        </Field>
                        {itemParent?.subcategories.length ? (
                          <Field className="xl:col-span-2">
                            <FieldLabel>Subcategory</FieldLabel>
                            <div className="flex flex-wrap gap-2">
                              {itemParent.subcategories.map((subcategory) => (
                                <Button key={subcategory.id} type="button" variant={item.subCategoryId === subcategory.id ? "default" : "outline"} onClick={() => setForm((state) => ({ ...state, items: state.items.map((entry, itemIndex) => itemIndex === index ? { ...entry, subCategoryId: entry.subCategoryId === subcategory.id ? null : subcategory.id } : entry) }))}>
                                  {subcategory.name}
                                </Button>
                              ))}
                            </div>
                          </Field>
                        ) : null}
                      </FieldGroup>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>

          {errorMessage ? (
            <Alert variant="destructive">
              <AlertTitle>Save failed</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createTransaction.isPending || updateTransaction.isPending}>
            {createTransaction.isPending || updateTransaction.isPending ? "Saving" : mode === "edit" ? "Save changes" : "Create transaction"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
