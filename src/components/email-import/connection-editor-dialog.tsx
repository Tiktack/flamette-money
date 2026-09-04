import * as React from "react"

import { CheckmarkCircle02Icon, Loading03Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAccounts } from "@/features/accounts/hooks"
import { useCreateEmailConnection, useTestEmailConnection, useUpdateEmailConnection } from "@/features/email-import/hooks"
import type { EmailConnectionSummary, EmailConnectionTestResult, ParserOption } from "@/features/email-import/types"
import { getApiErrorMessage } from "@/features/shared/errors"

const NO_ACCOUNT_VALUE = "none"

const pollIntervalOptions = [
  { value: 15, label: "Every 15 minutes" },
  { value: 30, label: "Every 30 minutes" },
  { value: 60, label: "Every hour" },
  { value: 180, label: "Every 3 hours" },
  { value: 360, label: "Every 6 hours" },
  { value: 720, label: "Every 12 hours" },
  { value: 1440, label: "Once a day" },
]

type ConnectionFormState = {
  name: string
  username: string
  password: string
  folder: string
  parserKey: string
  defaultAccountId: string | null
  pollIntervalMinutes: number
}

function buildFormState(connection: EmailConnectionSummary | null, fallbackParserKey: string): ConnectionFormState {
  return {
    name: connection?.name ?? "",
    username: connection?.username ?? "",
    password: "",
    folder: connection?.folder ?? "",
    parserKey: connection?.parserKey ?? fallbackParserKey,
    defaultAccountId: connection?.defaultAccountId ?? null,
    pollIntervalMinutes: connection?.pollIntervalMinutes ?? 60,
  }
}

export function ConnectionEditorDialog({
  open,
  onOpenChange,
  connection,
  parserOptions,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  connection: EmailConnectionSummary | null
  parserOptions: ParserOption[]
}) {
  const accountsQuery = useAccounts()
  const createConnection = useCreateEmailConnection()
  const updateConnection = useUpdateEmailConnection()
  const testConnection = useTestEmailConnection()
  const fallbackParserKey = parserOptions[0]?.key ?? "pko-bank-polski"
  const [form, setForm] = React.useState<ConnectionFormState>(() => buildFormState(connection, fallbackParserKey))
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [testResult, setTestResult] = React.useState<EmailConnectionTestResult | null>(null)
  const isEdit = Boolean(connection)
  const isSaving = createConnection.isPending || updateConnection.isPending

  React.useEffect(() => {
    if (open) {
      setForm(buildFormState(connection, fallbackParserKey))
      setErrorMessage(null)
      setTestResult(null)
      testConnection.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when the dialog opens
  }, [open, connection, fallbackParserKey])

  const accounts = accountsQuery.data ?? []

  const validate = () => {
    if (!form.name.trim()) return "Name is required."
    if (!form.username.trim()) return "Gmail address is required."
    if (!isEdit && !form.password) return "App password is required."
    if (!form.folder.trim()) return "Folder is required."
    return null
  }

  const handleTest = async () => {
    setTestResult(null)
    setErrorMessage(null)

    if (!isEdit && (!form.username.trim() || !form.password || !form.folder.trim())) {
      setErrorMessage("Fill in the Gmail address, app password, and folder before testing.")
      return
    }

    try {
      const result = await testConnection.mutateAsync({
        connectionId: connection?.id ?? null,
        username: form.username.trim(),
        password: form.password || undefined,
        folder: form.folder.trim(),
      })
      setTestResult(result)
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Unable to test the connection."))
    }
  }

  const handleSubmit = async () => {
    setErrorMessage(null)
    const validationError = validate()
    if (validationError) {
      setErrorMessage(validationError)
      return
    }

    const baseRequest = {
      name: form.name.trim(),
      username: form.username.trim(),
      folder: form.folder.trim(),
      parserKey: form.parserKey,
      defaultAccountId: form.defaultAccountId,
      pollIntervalMinutes: form.pollIntervalMinutes,
    }

    try {
      if (isEdit && connection) {
        await updateConnection.mutateAsync({
          id: connection.id,
          request: { ...baseRequest, enabled: connection.enabled, password: form.password || null },
        })
      } else {
        await createConnection.mutateAsync({ ...baseRequest, password: form.password })
      }
      onOpenChange(false)
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Unable to save the connection."))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit connection" : "Connect a mailbox"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update how this mailbox is polled for bank notification emails."
              : "Poll a Gmail folder for bank notification emails and turn them into transactions."}
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel>Name</FieldLabel>
            <Input
              value={form.name}
              onChange={(event) => setForm((state) => ({ ...state, name: event.target.value }))}
              placeholder="e.g. My PKO notifications"
            />
          </Field>

          <Field>
            <FieldLabel>Gmail address</FieldLabel>
            <Input
              type="email"
              value={form.username}
              onChange={(event) => setForm((state) => ({ ...state, username: event.target.value }))}
              placeholder="name@gmail.com"
            />
          </Field>

          <Field>
            <FieldLabel>App password</FieldLabel>
            <Input
              type="password"
              value={form.password}
              onChange={(event) => setForm((state) => ({ ...state, password: event.target.value }))}
              placeholder={isEdit ? "Leave blank to keep the current password" : "16-character app password"}
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              Requires 2-Step Verification on the Google account. Create one at{" "}
              <a className="text-primary underline-offset-2 hover:underline" href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer">
                myaccount.google.com/apppasswords
              </a>
              . It is stored encrypted on your server.
            </p>
          </Field>

          <Field>
            <FieldLabel>Gmail folder (label)</FieldLabel>
            <Input value={form.folder} onChange={(event) => setForm((state) => ({ ...state, folder: event.target.value }))} placeholder="e.g. Bank/PKO" />
            <p className="text-xs text-muted-foreground">Create a Gmail filter that applies this label to the bank's notification emails.</p>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>Bank parser</FieldLabel>
              <Select
                value={form.parserKey}
                items={parserOptions.map((option) => ({ value: option.key, label: option.displayName }))}
                onValueChange={(value) => setForm((state) => ({ ...state, parserKey: value ?? state.parserKey }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select parser" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {parserOptions.map((option) => (
                      <SelectItem key={option.key} value={option.key}>
                        {option.displayName}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel>Check for new emails</FieldLabel>
              <Select
                value={String(form.pollIntervalMinutes)}
                items={pollIntervalOptions.map((option) => ({ value: String(option.value), label: option.label }))}
                onValueChange={(value) => setForm((state) => ({ ...state, pollIntervalMinutes: value ? Number(value) : state.pollIntervalMinutes }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Interval" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {pollIntervalOptions.map((option) => (
                      <SelectItem key={option.value} value={String(option.value)}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field>
            <FieldLabel>Default account</FieldLabel>
            <Select
              value={form.defaultAccountId ?? NO_ACCOUNT_VALUE}
              items={[{ value: NO_ACCOUNT_VALUE, label: "No default account" }, ...accounts.map((account) => ({ value: account.id, label: account.name }))]}
              onValueChange={(value) => setForm((state) => ({ ...state, defaultAccountId: value && value !== NO_ACCOUNT_VALUE ? value : null }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="No default account" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value={NO_ACCOUNT_VALUE}>No default account</SelectItem>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Fallback when no rule assigns an account and the email's account number doesn't match any account's "bank account number" field.
            </p>
          </Field>
        </FieldGroup>

        {testResult ? (
          testResult.ok ? (
            <Alert>
              <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} />
              <AlertTitle>Connection works</AlertTitle>
              <AlertDescription>
                Signed in and found the folder ({testResult.messageCount} {testResult.messageCount === 1 ? "email" : "emails"} inside).
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <AlertTitle>Connection test failed</AlertTitle>
              <AlertDescription>{testResult.message}</AlertDescription>
            </Alert>
          )
        ) : null}

        {errorMessage ? (
          <Alert variant="destructive">
            <AlertTitle>Something needs attention</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={handleTest} disabled={testConnection.isPending}>
            {testConnection.isPending ? <HugeiconsIcon icon={Loading03Icon} strokeWidth={2} className="animate-spin" data-icon="inline-start" /> : null}
            {testConnection.isPending ? "Testing" : "Test connection"}
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? <HugeiconsIcon icon={Loading03Icon} strokeWidth={2} className="animate-spin" data-icon="inline-start" /> : null}
            {isSaving ? "Saving" : isEdit ? "Save changes" : "Add connection"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
