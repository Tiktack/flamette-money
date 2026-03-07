import * as React from "react"

import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { Line, LineChart, ResponsiveContainer } from "recharts"

import { EmptyState } from "@/components/empty-state"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getApiErrorMessage } from "@/lib/api/errors"
import {
  useAccounts,
  useAppInfo,
  useCreateAccount,
  useDeleteAccount,
  useUpdateAccount,
} from "@/lib/api/hooks"
import { PAGE_ACTION_EVENT, pageActionTypes, type PageActionType } from "@/lib/page-actions"
import type { AccountListItem, AccountType } from "@/lib/api/types"
import { buildSeed, buildTrendSeries, formatCurrency, normalizeHexColor, toNumber } from "@/lib/finance"
import { useTransactionsFilters } from "@/lib/state/transactionsFilters"

export const Route = createFileRoute("/accounts")({
  component: AccountsPage,
})

const accountTypeOptions: AccountType[] = ["Cash", "DebitCard", "CreditCard", "Savings"]
const fallbackCurrencies = ["USD", "EUR", "GBP", "PLN", "CAD"]
const iconOptions = ["IconWallet", "IconCard", "IconPigMoney", "IconCashBanknote"]

type AccountFormState = {
  name: string
  currency: string
  color: string
  icon: string
  type: AccountType
  currentBalance: number
}

const defaultAccountForm: AccountFormState = {
  name: "",
  currency: "USD",
  color: "#B9A88A",
  icon: "IconWallet",
  type: "Cash",
  currentBalance: 0,
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

  React.useEffect(() => {
    const handlePageAction = (event: Event) => {
      const customEvent = event as CustomEvent<PageActionType>

      if (customEvent.detail === pageActionTypes.createAccount) {
        setCreateOpen(true)
      }
    }

    window.addEventListener(PAGE_ACTION_EVENT, handlePageAction)
    return () => window.removeEventListener(PAGE_ACTION_EVENT, handlePageAction)
  }, [])

  const currencyOptions = React.useMemo(() => {
    const values = appInfoQuery.data?.supportedCurrencies?.map((item) => item.code.toUpperCase()) ?? fallbackCurrencies
    return Array.from(new Set(values))
  }, [appInfoQuery.data?.supportedCurrencies])

  const accounts = accountsQuery.data ?? []
  const topAccount = React.useMemo(
    () =>
      [...accounts].sort(
        (left, right) => toNumber(right.currentBalance) - toNumber(left.currentBalance),
      )[0] ?? null,
    [accounts],
  )

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

  const openEdit = (account: AccountListItem) => {
    setEditAccount(account)
    setEditForm({
      name: account.name,
      currency: account.currency,
      color: normalizeHexColor(account.color),
      icon: account.icon,
      type: account.type,
      currentBalance: toNumber(account.currentBalance),
    })
  }

  const openTransactions = async (accountId: string) => {
    setAccountIds([accountId])
    await navigate({ to: "/transactions" })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Accounts" value={String(accounts.length)} helper="Total money buckets connected to the workspace" />
        <MetricCard label="Currencies" value={String(new Set(accounts.map((account) => account.currency)).size)} helper="Distinct currencies tracked across accounts" />
        <MetricCard label="Top balance" value={topAccount ? formatCurrency(topAccount.currentBalance, topAccount.currency) : "-"} helper={topAccount ? topAccount.name : "No accounts yet"} />
      </div>

      <Card className="border-border/60 bg-card/80 shadow-sm">
        <CardContent className="p-0">
          {accountsQuery.isPending ? (
            <div className="h-56 animate-pulse rounded-[1.75rem] bg-muted" />
          ) : accountsQuery.isError ? (
            <div className="p-6">
              <Alert variant="destructive">
                <AlertTitle>Unable to load accounts</AlertTitle>
                <AlertDescription>{getApiErrorMessage(accountsQuery.error, "Try again in a moment.")}</AlertDescription>
              </Alert>
            </div>
          ) : accounts.length === 0 ? (
            <div className="p-6">
              <EmptyState
                eyebrow="Accounts"
                title="No accounts yet"
                description="Create your first account to start recording balances, transfers, and transaction history."
                action={<Button onClick={() => setCreateOpen(true)}>Create account</Button>}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Activity</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((account) => {
                    const color = normalizeHexColor(account.color)
                    const sparkline = buildTrendSeries(buildSeed(account.id))

                    return (
                      <TableRow key={account.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex size-10 items-center justify-center rounded-2xl text-sm font-semibold text-white" style={{ backgroundColor: color }}>
                              {account.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{account.name}</p>
                              <p className="text-sm text-muted-foreground">{account.type}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{account.currency}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{formatCurrency(account.currentBalance, account.currency)}</TableCell>
                        <TableCell>
                          <div className="h-10 w-28">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={sparkline}>
                                <Line dataKey="value" dot={false} stroke={color} strokeWidth={2} type="monotone" />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => openTransactions(account.id)}>
                              Ledger
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => openEdit(account)}>
                              Edit
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(account)}>
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

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
        onOpenChange={setCreateOpen}
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
            <DialogDescription>This removes the account from the workspace. Existing transactions may prevent deletion if the backend rejects it.</DialogDescription>
          </DialogHeader>
          {deleteAccount.isError ? (
            <Alert variant="destructive">
              <AlertTitle>Delete failed</AlertTitle>
              <AlertDescription>{getApiErrorMessage(deleteAccount.error, "Unable to delete account.")}</AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
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
            <Select value={value.currency} onValueChange={(next) => onChange((state) => ({ ...state, currency: next }))}>
              <SelectTrigger>
                <SelectValue placeholder="Currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {currencies.map((currency) => (
                    <SelectItem key={currency} value={currency}>{currency}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel>Account type</FieldLabel>
            <Select value={value.type} onValueChange={(next) => onChange((state) => ({ ...state, type: next as AccountType }))}>
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {accountTypeOptions.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor={`${title}-balance`}>Current balance</FieldLabel>
            <Input id={`${title}-balance`} type="number" value={value.currentBalance} onChange={(event) => onChange((state) => ({ ...state, currentBalance: Number(event.target.value) || 0 }))} />
          </Field>
          <Field>
            <FieldLabel>Accent color</FieldLabel>
            <Input type="color" value={value.color} onChange={(event) => onChange((state) => ({ ...state, color: event.target.value }))} className="h-11 p-1" />
          </Field>
          <Field>
            <FieldLabel>Icon token</FieldLabel>
            <Select value={value.icon} onValueChange={(next) => onChange((state) => ({ ...state, icon: next }))}>
              <SelectTrigger>
                <SelectValue placeholder="Icon" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {iconOptions.map((icon) => (
                    <SelectItem key={icon} value={icon}>{icon}</SelectItem>
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSubmit} disabled={pending || !value.name.trim()}>{pending ? "Saving" : submitLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function MetricCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <Card className="border-border/60 bg-card/80 shadow-sm">
      <CardContent className="space-y-2 p-5">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold tracking-tight text-foreground">{value}</p>
        <p className="text-xs leading-5 text-muted-foreground">{helper}</p>
      </CardContent>
    </Card>
  )
}
