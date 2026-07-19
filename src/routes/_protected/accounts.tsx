import * as React from "react"

import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { type ColumnDef, type Table as TanstackTable } from "@tanstack/react-table"
import { Delete02Icon, Edit01Icon, MoreHorizontalCircle01Icon, PlusSignIcon, TransactionIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { DataTable } from "@/components/data-table"
import { EmptyState } from "@/components/empty-state"
import { CardSkeleton } from "@/components/page-skeletons"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NumberInput } from "@/components/ui/number-input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { accountIconOptions, getAccountIconDefinition, resolveAccountIconName } from "@/lib/account-icons"
import { getApiErrorMessage } from "@/features/shared/errors"
import { useAppInfo } from "@/features/app/hooks"
import { useAccounts, useCreateAccount, useDeleteAccount, useUpdateAccount } from "@/features/accounts/hooks"
import { pageActionTypes, usePageAction } from "@/lib/page-actions"
import { accountTypeMeta, accountTypeOptions } from "@/features/accounts/types"
import type { AccountListItem, AccountType } from "@/features/accounts/types"
import { formatCurrency, normalizeHexColor, toNumber } from "@/lib/finance"
import { useTransactionsFilters } from "@/lib/state/transactionsFilters"

export const Route = createFileRoute("/_protected/accounts")({
  head: () => ({ meta: [{ title: "Accounts — Flamette Money" }] }),
  component: AccountsPage,
})

const fallbackCurrencies = ["USD", "EUR", "GBP", "PLN", "CAD"]

type AccountFormState = {
  name: string
  description: string
  currency: string
  color: string
  icon: string
  type: AccountType
  currentBalance: number
  bankAccountHint: string
}

const defaultAccountForm: AccountFormState = {
  name: "",
  description: "",
  currency: "USD",
  color: "#B9A88A",
  icon: "Wallet01Icon",
  type: "Cash",
  currentBalance: 0,
  bankAccountHint: "",
}

function AccountsPage() {
  const navigate = useNavigate()
  const accountsQuery = useAccounts()
  const appInfoQuery = useAppInfo()
  const createAccount = useCreateAccount()
  const updateAccount = useUpdateAccount()
  const deleteAccount = useDeleteAccount()
  const setAccountIds = useTransactionsFilters((state) => state.setAccountIds)
  const [createOpen, setCreateOpen] = React.useState(false)
  const [editAccount, setEditAccount] = React.useState<AccountListItem | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<AccountListItem | null>(null)
  const [createForm, setCreateForm] = React.useState<AccountFormState>(defaultAccountForm)
  const [editForm, setEditForm] = React.useState<AccountFormState>(defaultAccountForm)
  // mutation.reset is a stable reference; destructured so the callbacks below stay stable too.
  const { reset: resetCreateAccount } = createAccount
  const { reset: resetUpdateAccount } = updateAccount
  const { reset: resetDeleteAccount } = deleteAccount

  const openCreate = React.useCallback(() => {
    setCreateForm(defaultAccountForm)
    resetCreateAccount()
    setCreateOpen(true)
  }, [resetCreateAccount])

  usePageAction(pageActionTypes.createAccount, openCreate)

  const currencyOptions = React.useMemo(() => {
    const values = appInfoQuery.data?.supportedCurrencies?.map((item) => item.code.toUpperCase()) ?? fallbackCurrencies
    return Array.from(new Set(values))
  }, [appInfoQuery.data?.supportedCurrencies])

  const accounts = accountsQuery.data ?? []

  const handleCreate = async () => {
    try {
      await createAccount.mutateAsync(createForm)
      setCreateOpen(false)
      setCreateForm(defaultAccountForm)
    } catch {
      // rendered below
    }
  }

  const handleEdit = async () => {
    if (!editAccount) {
      return
    }

    try {
      await updateAccount.mutateAsync({ id: editAccount.id, request: editForm })
      setEditAccount(null)
    } catch {
      // rendered below
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) {
      return
    }

    try {
      await deleteAccount.mutateAsync(deleteTarget.id)
      setDeleteTarget(null)
    } catch {
      // rendered below
    }
  }

  const openEdit = React.useCallback(
    (account: AccountListItem) => {
      resetUpdateAccount()
      setEditAccount(account)
      setEditForm({
        name: account.name,
        description: account.description ?? "",
        currency: account.currency,
        color: normalizeHexColor(account.color),
        icon: resolveAccountIconName(account.icon),
        type: account.type,
        currentBalance: toNumber(account.currentBalance),
        bankAccountHint: account.bankAccountHint ?? "",
      })
    },
    [resetUpdateAccount]
  )

  const openDelete = React.useCallback(
    (account: AccountListItem) => {
      resetDeleteAccount()
      setDeleteTarget(account)
    },
    [resetDeleteAccount]
  )

  const openTransactions = React.useCallback(
    async (accountId: string) => {
      setAccountIds([accountId])
      await navigate({ to: "/transactions" })
    },
    [navigate, setAccountIds]
  )

  const columns = React.useMemo<ColumnDef<AccountListItem>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Account",
        enableHiding: false,
        cell: ({ row }) => {
          const account = row.original
          const color = normalizeHexColor(account.color)
          const iconDefinition = getAccountIconDefinition(account.icon)
          const description = account.description?.trim()

          return (
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-2xl text-sm font-semibold text-white" style={{ backgroundColor: color }}>
                <HugeiconsIcon icon={iconDefinition.icon} strokeWidth={2} className="size-5" />
              </div>
              <div className={description ? "min-w-0" : "flex min-h-10 min-w-0 items-center"}>
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{account.name}</p>
                  {description ? <p className="truncate text-sm text-muted-foreground">{description}</p> : null}
                </div>
              </div>
            </div>
          )
        },
      },
      {
        accessorKey: "type",
        header: "Type",
        filterFn: "equalsString",
        cell: ({ row }) => <Badge variant="outline">{accountTypeMeta[row.original.type].label}</Badge>,
      },
      {
        accessorKey: "currency",
        header: "Currency",
        filterFn: "equalsString",
        cell: ({ row }) => <Badge variant="secondary">{row.original.currency}</Badge>,
      },
      {
        accessorFn: (row) => toNumber(row.currentBalance),
        id: "balance",
        header: () => <div className="text-right">Balance</div>,
        cell: ({ row }) => {
          const amount = toNumber(row.original.currentBalance)

          return (
            <div className={amount < 0 ? "text-right font-medium text-destructive tabular-nums" : "text-right font-medium text-foreground tabular-nums"}>
              {formatCurrency(row.original.currentBalance, row.original.currency)}
            </div>
          )
        },
      },
      {
        id: "actions",
        enableSorting: false,
        enableHiding: false,
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => {
          const account = row.original

          return (
            <div className="flex justify-end gap-1">
              <Button variant="ghost" size="icon-sm" onClick={() => openEdit(account)}>
                <HugeiconsIcon icon={Edit01Icon} strokeWidth={2} />
                <span className="sr-only">Edit {account.name}</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" className="text-muted-foreground data-open:bg-muted" />}>
                  <HugeiconsIcon icon={MoreHorizontalCircle01Icon} strokeWidth={2} />
                  <span className="sr-only">More actions</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={() => void openTransactions(account.id)}>
                    <HugeiconsIcon icon={TransactionIcon} strokeWidth={2} className="text-muted-foreground" />
                    <span>Show transactions</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => openDelete(account)}>
                    <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} className="text-destructive" />
                    <span>Remove account</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      },
    ],
    [openDelete, openEdit, openTransactions]
  )

  return (
    <div className="flex flex-col gap-6">
      {accountsQuery.isPending ? (
        <CardSkeleton className="h-[540px]" />
      ) : accountsQuery.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load accounts</AlertTitle>
          <AlertDescription>{getApiErrorMessage(accountsQuery.error, "Try again in a moment.")}</AlertDescription>
        </Alert>
      ) : accounts.length === 0 ? (
        <EmptyState
          eyebrow="Accounts"
          title="No accounts yet"
          description="Create your first account to start recording balances, transfers, and transaction history."
          action={
            <Button onClick={openCreate}>
              <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} />
              Add account
            </Button>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={accounts}
          searchColumn="name"
          searchPlaceholder="Search accounts"
          emptyMessage="No accounts match the current filters."
          filters={(table: TanstackTable<AccountListItem>) => {
            const typeValue = (table.getColumn("type")?.getFilterValue() as string) ?? "all-types"
            const currencyValue = (table.getColumn("currency")?.getFilterValue() as string) ?? "all-currencies"
            const hasFilters = typeValue !== "all-types" || currencyValue !== "all-currencies"

            return (
              <>
                <Select
                  value={typeValue}
                  items={[
                    { value: "all-types", label: "All types" },
                    ...accountTypeOptions.map((type) => ({ value: type, label: accountTypeMeta[type].label })),
                  ]}
                  onValueChange={(value) => table.getColumn("type")?.setFilterValue(value === "all-types" ? undefined : value)}
                >
                  <SelectTrigger size="sm" className="w-[148px]">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="all-types">All types</SelectItem>
                      {accountTypeOptions.map((type) => (
                        <SelectItem key={type} value={type}>
                          {accountTypeMeta[type].label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>

                <Select
                  value={currencyValue}
                  items={[{ value: "all-currencies", label: "All currencies" }, ...currencyOptions.map((currency) => ({ value: currency, label: currency }))]}
                  onValueChange={(value) => table.getColumn("currency")?.setFilterValue(value === "all-currencies" ? undefined : value)}
                >
                  <SelectTrigger size="sm" className="w-[148px]">
                    <SelectValue placeholder="All currencies" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="all-currencies">All currencies</SelectItem>
                      {currencyOptions.map((currency) => (
                        <SelectItem key={currency} value={currency}>
                          {currency}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>

                {hasFilters ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      table.getColumn("type")?.setFilterValue(undefined)
                      table.getColumn("currency")?.setFilterValue(undefined)
                    }}
                  >
                    Clear filters
                  </Button>
                ) : null}
              </>
            )
          }}
        />
      )}

      <AccountDialog
        open={createOpen}
        title="Create account"
        description="Set the account identity, currency, and current balance."
        submitLabel="Create account"
        value={createForm}
        onChange={setCreateForm}
        currencies={currencyOptions}
        pending={createAccount.isPending}
        error={createAccount.isError ? getApiErrorMessage(createAccount.error, "Unable to create account.") : null}
        onOpenChange={(open) => {
          setCreateOpen(open)
          if (!open) {
            setCreateForm(defaultAccountForm)
          }
        }}
        onSubmit={handleCreate}
      />

      <AccountDialog
        open={Boolean(editAccount)}
        title="Edit account"
        description="Update display details and keep the running balance aligned."
        submitLabel="Save changes"
        value={editForm}
        onChange={setEditForm}
        currencies={currencyOptions}
        pending={updateAccount.isPending}
        error={updateAccount.isError ? getApiErrorMessage(updateAccount.error, "Unable to update account.") : null}
        onOpenChange={(open) => {
          if (!open) {
            setEditAccount(null)
          }
        }}
        onSubmit={handleEdit}
      />

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete account</DialogTitle>
            <DialogDescription>
              This removes the account from the workspace. Existing transactions may prevent deletion if the backend rejects it.
            </DialogDescription>
          </DialogHeader>
          {deleteAccount.isError ? (
            <Alert variant="destructive">
              <AlertTitle>Delete failed</AlertTitle>
              <AlertDescription>{getApiErrorMessage(deleteAccount.error, "Unable to delete account.")}</AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteAccount.isPending}>
              {deleteAccount.isPending ? "Deleting" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function AccountDialog({
  open,
  title,
  description,
  submitLabel,
  value,
  onChange,
  currencies,
  pending,
  error,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  title: string
  description: string
  submitLabel: string
  value: AccountFormState
  onChange: React.Dispatch<React.SetStateAction<AccountFormState>>
  currencies: string[]
  pending: boolean
  error: string | null
  onOpenChange: (open: boolean) => void
  onSubmit: () => void
}) {
  const selectedIcon = getAccountIconDefinition(value.icon)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <FieldGroup className="grid gap-4 md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor={`${title}-name`}>Name</FieldLabel>
            <Input id={`${title}-name`} value={value.name} onChange={(event) => onChange((state) => ({ ...state, name: event.target.value }))} />
          </Field>
          <Field>
            <FieldLabel>Currency</FieldLabel>
            <Select
              value={value.currency}
              onValueChange={(next) =>
                onChange((state) => ({
                  ...state,
                  currency: next ?? state.currency,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {currencies.map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      {currency}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel>Account type</FieldLabel>
            <Select
              value={value.type}
              items={accountTypeOptions.map((type) => ({ value: type, label: accountTypeMeta[type].label }))}
              onValueChange={(next) => onChange((state) => ({ ...state, type: next as AccountType }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {accountTypeOptions.map((type) => (
                    <SelectItem key={type} value={type}>
                      {accountTypeMeta[type].label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor={`${title}-balance`}>Current balance</FieldLabel>
            <NumberInput
              id={`${title}-balance`}
              decimalScale={2}
              value={value.currentBalance}
              onValueChange={(nextBalance) =>
                onChange((state) => ({
                  ...state,
                  currentBalance: nextBalance ?? 0,
                }))
              }
            />
          </Field>
          <Field className="md:col-span-2">
            <FieldLabel htmlFor={`${title}-description`}>Description</FieldLabel>
            <Textarea
              id={`${title}-description`}
              value={value.description}
              onChange={(event) =>
                onChange((state) => ({
                  ...state,
                  description: event.target.value,
                }))
              }
              placeholder="Add a short note about how you use this account"
              rows={3}
            />
          </Field>
          <Field className="md:col-span-2">
            <FieldLabel htmlFor={`${title}-bank-hint`}>Bank account number (for email import)</FieldLabel>
            <Input
              id={`${title}-bank-hint`}
              value={value.bankAccountHint}
              onChange={(event) =>
                onChange((state) => ({
                  ...state,
                  bankAccountHint: event.target.value,
                }))
              }
              placeholder="e.g. 6630 — a unique fragment of the account or card number"
            />
            <p className="text-xs text-muted-foreground">
              Bank notification emails mention a masked account number (like "15..6630"). When it matches this fragment, imported transactions land
              on this account automatically. Leave empty if unused.
            </p>
          </Field>
          <Field>
            <FieldLabel>Accent color</FieldLabel>
            <Input type="color" value={value.color} onChange={(event) => onChange((state) => ({ ...state, color: event.target.value }))} className="h-11 p-1" />
          </Field>
          <Field>
            <FieldLabel>Account icon</FieldLabel>
            <Select
              value={value.icon}
              items={accountIconOptions.map((icon) => ({ value: icon.name, label: icon.label }))}
              onValueChange={(next) => onChange((state) => ({ ...state, icon: next ?? state.icon }))}
            >
              <SelectTrigger>
                <HugeiconsIcon icon={selectedIcon.icon} strokeWidth={2} className="text-muted-foreground" />
                <SelectValue placeholder="Icon" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {accountIconOptions.map((icon) => (
                    <SelectItem key={icon.name} value={icon.name}>
                      <HugeiconsIcon icon={icon.icon} strokeWidth={2} className="text-muted-foreground" />
                      <span>{icon.label}</span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        </FieldGroup>
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Save failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={pending || !value.name.trim()}>
            {pending ? "Saving" : submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
