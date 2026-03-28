import * as React from "react"

import {
  Camera01Icon,
  Cancel01Icon,
  CloudUploadIcon,
  Edit01Icon,
  ImageUploadIcon,
  Loading03Icon,
  Tick01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  presetTripId?: string
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

// ─── Receipt drop zone ──────────────────────────────────────────────────

function ReceiptDropZone({
  scanning,
  scanPreview,
  scanResult,
  scanError,
  accountId,
  onScan,
}: {
  scanning: boolean
  scanPreview: string | null
  scanResult: ReceiptScanResult | null
  scanError: string | null
  accountId: string
  onScan: (file: File) => void
}) {
  const [dragOver, setDragOver] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    onScan(file)
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    setDragOver(false)
    handleFiles(event.dataTransfer.files)
  }

  if (scanning) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-border/40 bg-muted/10 py-10">
        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
          <div className="relative flex size-16 items-center justify-center rounded-full bg-primary/10">
            <HugeiconsIcon icon={Loading03Icon} className="size-8 animate-spin text-primary" />
          </div>
        </div>
        <div className="text-center">
          <p className="font-medium text-foreground">Analyzing receipt...</p>
          <p className="text-sm text-muted-foreground">AI is extracting items, amounts, and categories</p>
        </div>
      </div>
    )
  }

  if (scanResult && scanPreview) {
    return (
      <div className="grid gap-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
        <div className="flex items-start gap-4">
          <img
            alt="Receipt"
            className="h-28 w-20 shrink-0 rounded-xl border border-border/60 object-cover shadow-sm"
            src={scanPreview}
          />
          <div className="flex flex-1 flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={Tick01Icon} className="size-4 text-emerald-500" />
              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Scan complete</span>
            </div>
            {scanResult.merchant ? (
              <p className="text-base font-semibold text-foreground">{scanResult.merchant}</p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {scanResult.date ? (
                <Badge variant="secondary">{new Date(scanResult.date).toLocaleDateString()}</Badge>
              ) : null}
              {toNumber(scanResult.amount) > 0 ? (
                <Badge variant="secondary">
                  {toNumber(scanResult.amount).toFixed(2)} {scanResult.currency?.toUpperCase()}
                </Badge>
              ) : null}
              <Badge variant="outline">{scanResult.items?.length ?? 0} items</Badge>
            </div>
            <p className="text-xs text-muted-foreground">Draft applied to form below. Review and adjust before saving.</p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit"
          onClick={() => inputRef.current?.click()}
        >
          <HugeiconsIcon icon={Camera01Icon} className="size-4" />
          Scan different receipt
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(event) => handleFiles(event.target.files)}
        />
      </div>
    )
  }

  return (
    <div className="grid gap-3">
      {!accountId ? (
        <Alert>
          <AlertTitle>Select an account first</AlertTitle>
          <AlertDescription>Choose the account this expense will be charged to before scanning.</AlertDescription>
        </Alert>
      ) : (
        <button
          type="button"
          className={`group relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed transition-all ${
            dragOver
              ? "border-primary bg-primary/5 scale-[1.01]"
              : "border-border/60 bg-muted/20 hover:border-primary/40 hover:bg-muted/40"
          }`}
          onDragOver={(event) => {
            event.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <div
            className={`flex size-14 items-center justify-center rounded-2xl transition-colors ${
              dragOver ? "bg-primary/15 text-primary" : "bg-muted/60 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
            }`}
          >
            <HugeiconsIcon icon={dragOver ? CloudUploadIcon : ImageUploadIcon} className="size-7" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">
              {dragOver ? "Drop receipt image here" : "Upload receipt image"}
            </p>
            <p className="text-xs text-muted-foreground">
              Drag & drop or click to browse. Supports JPEG, PNG, and WebP.
            </p>
          </div>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => handleFiles(event.target.files)}
      />
      {scanError ? (
        <Alert variant="destructive">
          <AlertTitle>Scan failed</AlertTitle>
          <AlertDescription>{scanError}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  )
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
  accountMap: Map<string, { name: string; currency: string; color: string }>
  accountsData: { id: string; name: string; currency: string; color: string }[]
  currencyOptions: string[]
  tripsData: { id: string; name: string }[]
  recentTransactions: { id: string; date: string; accountId: string; amount: number | string; type: string }[]
  allowedParents: CategoryHierarchy[]
}) {
  const requiresTarget = form.type === "Transfer"
  const requiresOriginal = form.type === "Refund"
  const showCategoryFields = form.type !== "Transfer"

  const selectedParent = React.useMemo(
    () => (form.categoryId ? categories.find((category) => category.id === form.categoryId) ?? null : null),
    [categories, form.categoryId],
  )

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
                  amount2: type === "Transfer" ? state.amount2 : "",
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
                {accountsData.map((account) => (
                  <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel>Amount</FieldLabel>
          <Input
            type="number"
            min={0}
            step="0.01"
            placeholder="0.00"
            value={form.amount}
            onChange={(event) => setForm((state) => ({ ...state, amount: event.target.value === "" ? "" : Number(event.target.value) }))}
          />
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
      </FieldGroup>

      {/* Transfer-specific fields */}
      {requiresTarget ? (
        <FieldGroup className="grid gap-4 sm:grid-cols-3">
          <Field>
            <FieldLabel>Target account</FieldLabel>
            <Select value={form.targetAccountId ?? ""} onValueChange={(value) => setForm((state) => ({ ...state, targetAccountId: value, currency2: accountMap.get(value)?.currency ?? state.currency2 }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select target account" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {accountsData.filter((account) => account.id !== form.accountId).map((account) => (
                    <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel>Target amount</FieldLabel>
            <Input type="number" min={0} step="0.01" placeholder="Same as source" value={form.amount2} onChange={(event) => setForm((state) => ({ ...state, amount2: event.target.value === "" ? "" : Number(event.target.value) }))} />
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
        </FieldGroup>
      ) : null}

      {/* Category and trip */}
      {showCategoryFields ? (
        <FieldGroup className="grid gap-4 sm:grid-cols-2">
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
                    {tripsData.map((trip) => (
                      <SelectItem key={trip.id} value={trip.id}>{trip.name}</SelectItem>
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
                    onClick={() => setForm((state) => ({ ...state, subCategoryId: state.subCategoryId === subcategory.id ? null : subcategory.id }))}
                  >
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
          <Select value={form.originalTransactionId || ""} onValueChange={(value) => setForm((state) => ({ ...state, originalTransactionId: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Select original transaction" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {recentTransactions
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

      {/* Merchant, location, note */}
      <FieldGroup className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel>Merchant</FieldLabel>
          <Input placeholder="Store or payee name" value={form.merchantName} onChange={(event) => setForm((state) => ({ ...state, merchantName: event.target.value }))} />
        </Field>
        <Field>
          <FieldLabel>Location</FieldLabel>
          <Input placeholder="City or address" value={form.location} onChange={(event) => setForm((state) => ({ ...state, location: event.target.value }))} />
        </Field>
        <Field className="sm:col-span-2">
          <FieldLabel>Note</FieldLabel>
          <Textarea rows={2} value={form.note} onChange={(event) => setForm((state) => ({ ...state, note: event.target.value }))} placeholder="Optional notes about this transaction" />
        </Field>
      </FieldGroup>

      {/* Items section */}
      <Separator />
      <div className="grid gap-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Line items</p>
            <p className="text-xs text-muted-foreground">Optional itemized breakdown for receipt-style transactions.</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
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
        </div>
        {form.items.length === 0 ? (
          <p className="py-2 text-center text-xs text-muted-foreground">No itemized lines yet.</p>
        ) : (
          <div className="grid gap-3">
            {form.items.map((item, index) => {
              const itemParent = item.categoryId ? categories.find((category) => category.id === item.categoryId) ?? null : null
              const itemFinal = (item.unitPrice * item.quantity) - item.promotionAmount

              return (
                <div key={`${index}-${item.name}`} className="rounded-xl border border-border/60 bg-muted/15 p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex size-6 items-center justify-center rounded-md bg-muted text-xs font-medium text-muted-foreground">{index + 1}</span>
                      <span className="text-sm font-medium">{item.name || "Untitled item"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {itemFinal > 0 ? <Badge variant="secondary">{itemFinal.toFixed(2)}</Badge> : null}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setForm((state) => ({ ...state, items: state.items.filter((_, itemIndex) => itemIndex !== index) }))}
                      >
                        <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                  <FieldGroup className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    <Field className="lg:col-span-2">
                      <FieldLabel>Name</FieldLabel>
                      <Input value={item.name} onChange={(event) => setForm((state) => ({ ...state, items: state.items.map((entry, i) => i === index ? { ...entry, name: event.target.value } : entry) }))} />
                    </Field>
                    <Field>
                      <FieldLabel>Qty</FieldLabel>
                      <Input type="number" min={0} step="0.01" value={item.quantity} onChange={(event) => setForm((state) => ({ ...state, items: state.items.map((entry, i) => i === index ? { ...entry, quantity: Number(event.target.value) || 0 } : entry) }))} />
                    </Field>
                    <Field>
                      <FieldLabel>Unit price</FieldLabel>
                      <Input type="number" min={0} step="0.01" value={item.unitPrice} onChange={(event) => setForm((state) => ({ ...state, items: state.items.map((entry, i) => i === index ? { ...entry, unitPrice: Number(event.target.value) || 0 } : entry) }))} />
                    </Field>
                    <Field>
                      <FieldLabel>Discount</FieldLabel>
                      <Input type="number" min={0} step="0.01" value={item.promotionAmount} onChange={(event) => setForm((state) => ({ ...state, items: state.items.map((entry, i) => i === index ? { ...entry, promotionAmount: Number(event.target.value) || 0 } : entry) }))} />
                    </Field>
                  </FieldGroup>
                  <FieldGroup className="mt-3 grid gap-3 sm:grid-cols-2">
                    <Field>
                      <FieldLabel>Category</FieldLabel>
                      <Select value={item.categoryId ?? ""} onValueChange={(value) => setForm((state) => ({ ...state, items: state.items.map((entry, i) => i === index ? { ...entry, categoryId: value, subCategoryId: null } : entry) }))}>
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
                      <Field>
                        <FieldLabel>Subcategory</FieldLabel>
                        <div className="flex flex-wrap gap-1.5">
                          {itemParent.subcategories.map((subcategory) => (
                            <Button
                              key={subcategory.id}
                              type="button"
                              size="sm"
                              variant={item.subCategoryId === subcategory.id ? "default" : "outline"}
                              onClick={() => setForm((state) => ({ ...state, items: state.items.map((entry, i) => i === index ? { ...entry, subCategoryId: entry.subCategoryId === subcategory.id ? null : subcategory.id } : entry) }))}
                            >
                              {subcategory.name}
                            </Button>
                          ))}
                        </div>
                      </Field>
                    ) : null}
                  </FieldGroup>
                </div>
              )
            })}
          </div>
        )}
      </div>
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
  const [activeTab, setActiveTab] = React.useState<string | number | null>("manual")

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

  const allowedParents = React.useMemo(() => {
    if (form.type === "Transfer") return []
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
    setScanPreview(null)
    setActiveTab("manual")

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
        tripId: presetTripId ?? withPreset.tripId,
      })
    }
  }, [accountsQuery.data, categories, mode, open, presetCategoryId, presetTripId, presetType, transactionQuery.data])

  React.useEffect(() => {
    return () => {
      if (scanPreview) {
        URL.revokeObjectURL(scanPreview)
      }
    }
  }, [scanPreview])

  const handleScan = async (file: File) => {
    if (scanPreview) {
      URL.revokeObjectURL(scanPreview)
    }

    setScanResult(null)
    setScanError(null)
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

    const requiresTarget = form.type === "Transfer"
    const requiresOriginal = form.type === "Refund"
    const showCategoryFields = form.type !== "Transfer"

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

  const accountsData = (accountsQuery.data ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    currency: a.currency.toUpperCase(),
    color: normalizeHexColor(a.color),
  }))

  const tripsData = (tripsQuery.data ?? []).map((t) => ({ id: t.id, name: t.name }))

  const recentTransactions = (recentTransactionsQuery.data ?? []).map((t) => ({
    id: t.id,
    date: t.date,
    accountId: t.accountId,
    amount: t.amount,
    type: t.type,
  }))

  const formFields = (
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
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
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
          <DialogDescription>
            {mode === "edit"
              ? "Update the transaction details below."
              : "Add a transaction manually or scan a receipt to auto-fill the form."}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[72vh] overflow-y-auto pr-1">
          {transactionQuery.isLoading && mode === "edit" ? (
            <div className="h-32 animate-pulse rounded-2xl bg-muted" />
          ) : transactionQuery.isError && mode === "edit" ? (
            <Alert variant="destructive">
              <AlertTitle>Unable to load transaction</AlertTitle>
              <AlertDescription>{getApiErrorMessage(transactionQuery.error, "Try reopening the editor.")}</AlertDescription>
            </Alert>
          ) : mode === "new" ? (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList variant="line" className="mb-5 w-full">
                <TabsTrigger value="manual" className="gap-1.5">
                  <HugeiconsIcon icon={Edit01Icon} className="size-4" />
                  Manual entry
                </TabsTrigger>
                <TabsTrigger value="scan" className="gap-1.5">
                  <HugeiconsIcon icon={Camera01Icon} className="size-4" />
                  Scan receipt
                </TabsTrigger>
              </TabsList>

              <TabsContent value="manual">
                {formFields}
              </TabsContent>

              <TabsContent value="scan">
                <div className="grid gap-6">
                  {/* Step 1: Account selection for scan */}
                  <FieldGroup className="grid gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel>Account</FieldLabel>
                      <Select
                        value={form.accountId}
                        onValueChange={(value) =>
                          setForm((state) => ({
                            ...state,
                            accountId: value,
                            currency: accountMap.get(value)?.currency ?? state.currency,
                            currency2: accountMap.get(value)?.currency ?? state.currency2,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select account" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {accountsData.map((account) => (
                              <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>
                  </FieldGroup>

                  {/* Step 2: Upload area */}
                  <ReceiptDropZone
                    scanning={scanReceipt.isPending}
                    scanPreview={scanPreview}
                    scanResult={scanResult}
                    scanError={scanError}
                    accountId={form.accountId}
                    onScan={handleScan}
                  />

                  {/* Step 3: Review form (shown after scan completes) */}
                  {scanResult ? (
                    <>
                      <Separator />
                      <div className="grid gap-1">
                        <h3 className="text-sm font-medium text-foreground">Review & adjust</h3>
                        <p className="text-xs text-muted-foreground">
                          The scanned data has been filled in below. Make any corrections before saving.
                        </p>
                      </div>
                      {formFields}
                    </>
                  ) : null}
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            formFields
          )}

          {errorMessage ? (
            <Alert variant="destructive" className="mt-4">
              <AlertTitle>Save failed</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createTransaction.isPending || updateTransaction.isPending}>
            {createTransaction.isPending || updateTransaction.isPending ? "Saving..." : mode === "edit" ? "Save changes" : "Create transaction"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
