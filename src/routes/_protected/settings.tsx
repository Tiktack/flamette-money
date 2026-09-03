import * as React from "react"

import { CheckmarkCircle02Icon, Loading03Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { createFileRoute } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldContent, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NumberInput } from "@/components/ui/number-input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { useAppInfo, useCurrentUser } from "@/features/app/hooks"
import { useSeedDemo } from "@/features/demo-seed/hooks"
import { useExportBackup, useImportBackup } from "@/features/profile-backup/hooks"
import type { BackupImportType } from "@/features/profile-backup/types"
import { getApiErrorMessage } from "@/features/shared/errors"
import { useResetData, useSettings, useUpdateSettings } from "@/features/settings/hooks"

const fileAcceptByImportType: Record<BackupImportType, string> = {
  flamette: ".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "one-money": ".csv,text/csv",
}

const importFormatLabels: Record<BackupImportType, string> = {
  flamette: "Flamette backup (.xlsx)",
  "one-money": "1Money backup (.csv)",
}

export const Route = createFileRoute("/_protected/settings")({
  head: () => ({ meta: [{ title: "Settings — Flamette Money" }] }),
  component: SettingsPage,
})

function SettingsPage() {
  const currentUserQuery = useCurrentUser()
  const appInfoQuery = useAppInfo()
  const settingsQuery = useSettings()
  const updateSettings = useUpdateSettings()
  const seedDemo = useSeedDemo()
  const importBackup = useImportBackup()
  const exportBackup = useExportBackup()
  const resetData = useResetData()
  const [years, setYears] = React.useState(3)
  const [seedValue, setSeedValue] = React.useState<number | null>(null)
  const [downloadAfterSeed, setDownloadAfterSeed] = React.useState(true)
  const [importOpen, setImportOpen] = React.useState(false)
  const [seedOpen, setSeedOpen] = React.useState(false)
  const [resetOpen, setResetOpen] = React.useState(false)
  const [importType, setImportType] = React.useState<BackupImportType>("flamette")
  const [importFile, setImportFile] = React.useState<File | null>(null)
  const [importConfirmed, setImportConfirmed] = React.useState(false)
  const [resetConfirmed, setResetConfirmed] = React.useState(false)
  const [saveError, setSaveError] = React.useState<string | null>(null)
  const [exportError, setExportError] = React.useState<string | null>(null)
  const [importError, setImportError] = React.useState<string | null>(null)
  const [seedError, setSeedError] = React.useState<string | null>(null)
  const [resetError, setResetError] = React.useState<string | null>(null)
  const currentBaseCurrency = settingsQuery.data?.baseCurrency ?? currentUserQuery.data?.baseCurrency ?? "USD"
  const exportFeedback = useTransientFeedback()
  const importFeedback = useTransientFeedback()
  const seedFeedback = useTransientFeedback()
  const resetFeedback = useTransientFeedback()

  const currencyOptions = appInfoQuery.data?.supportedCurrencies?.map((item) => item.code.toUpperCase()) ?? ["USD", "EUR", "GBP", "PLN", "CAD"]
  const isPageLoading = currentUserQuery.isPending
  const seedButtonBusy = seedDemo.isPending || exportBackup.isPending
  const importRequiresConfirmation = importType === "flamette"
  const importAccept = fileAcceptByImportType[importType]
  const importHint = importType === "flamette" ? "Full workspace restore." : "Import from a 1Money CSV export."

  const resetImportState = () => {
    setImportOpen(false)
    setImportType("flamette")
    setImportFile(null)
    setImportConfirmed(false)
    setImportError(null)
  }

  const resetResetState = () => {
    setResetOpen(false)
    setResetConfirmed(false)
    setResetError(null)
  }

  const handleBaseCurrencyChange = (value: string | null) => {
    if (!value || value === currentBaseCurrency) {
      return
    }

    setSaveError(null)
    updateSettings.mutate(
      { baseCurrency: value },
      {
        onError: (error) => {
          setSaveError(getApiErrorMessage(error, "Unable to save settings."))
        },
      }
    )
  }

  const handleExportBackup = async () => {
    try {
      await exportBackup.mutateAsync({ type: "flamette" })
      setExportError(null)
      exportFeedback.show("success")
    } catch (error) {
      setExportError(getApiErrorMessage(error, "Unable to export backup."))
      exportFeedback.show("error")
    }
  }

  const handleImportData = async () => {
    if (!importFile) {
      return
    }

    if (importRequiresConfirmation && !importConfirmed) {
      return
    }

    try {
      await importBackup.mutateAsync({
        file: importFile,
        type: importType,
      })
      setImportError(null)
      importFeedback.show("success")
      resetImportState()
    } catch (error) {
      setImportError(getApiErrorMessage(error, "Unable to import data."))
      importFeedback.show("error")
    }
  }

  const handleSeed = async () => {
    try {
      await seedDemo.mutateAsync({
        years,
        seed: seedValue ?? undefined,
      })

      if (downloadAfterSeed) {
        await exportBackup.mutateAsync({ type: "flamette" })
      }

      setSeedError(null)
      seedFeedback.show("success")
      setSeedOpen(false)
    } catch (error) {
      setSeedError(getApiErrorMessage(error, "Unable to generate sample data."))
      seedFeedback.show("error")
    }
  }

  const handleReset = async () => {
    if (!resetConfirmed) {
      return
    }

    try {
      await resetData.mutateAsync()
      setResetError(null)
      resetFeedback.show("success")
      resetResetState()
    } catch (error) {
      setResetError(getApiErrorMessage(error, "Unable to reset data."))
      resetFeedback.show("error")
    }
  }

  if (isPageLoading) {
    return <SettingsPageSkeleton />
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-foreground">Base currency</p>
              {saveError ? <p className="text-sm text-destructive">{saveError}</p> : null}
            </div>

            <Select value={currentBaseCurrency} onValueChange={handleBaseCurrencyChange}>
              <SelectTrigger aria-label="Base currency" className="w-full sm:w-32">
                <SelectValue placeholder="Base currency" />
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
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-1">
          <CardTitle>Data</CardTitle>
          <CardDescription>Backup, import and sample data.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <ActionRow
            title="Export backup"
            description={exportError ?? "Full workspace .xlsx"}
            action={
              <Button size="sm" variant="outline" onClick={handleExportBackup} disabled={exportBackup.isPending}>
                {exportBackup.isPending ? <StatusIcon /> : null}
                {!exportBackup.isPending && exportFeedback.state === "success" ? <StatusIcon success /> : null}
                {exportBackup.isPending ? "Preparing" : exportFeedback.state === "success" ? "Exported" : exportFeedback.state === "error" ? "Retry" : "Export"}
              </Button>
            }
          />

          <Separator />

          <ActionRow
            title="Import data"
            description={importError ?? "All formats in one dialog."}
            action={
              <Button size="sm" variant="outline" onClick={() => setImportOpen(true)} disabled={importBackup.isPending}>
                {importFeedback.state === "success" ? <StatusIcon success /> : null}
                {importFeedback.state === "success" ? "Imported" : importFeedback.state === "error" ? "Retry" : "Import"}
              </Button>
            }
          />

          <Separator />

          <ActionRow
            title="Sample data"
            description={seedError ?? `${formatYearSummary(years)}${downloadAfterSeed ? " · backup on" : ""}`}
            action={
              <Button size="sm" variant="outline" onClick={() => setSeedOpen(true)} disabled={seedDemo.isPending || exportBackup.isPending}>
                {seedFeedback.state === "success" ? <StatusIcon success /> : null}
                {seedFeedback.state === "success" ? "Generated" : seedFeedback.state === "error" ? "Retry" : "Configure"}
              </Button>
            }
          />
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader className="gap-1">
          <CardTitle>Danger zone</CardTitle>
          <CardDescription>Remove workspace data.</CardDescription>
        </CardHeader>
        <CardContent>
          <ActionRow
            title="Reset workspace"
            description={resetError ?? "Keeps your profile and preferences."}
            action={
              <Button size="sm" variant="destructive" onClick={() => setResetOpen(true)} disabled={resetData.isPending}>
                {resetFeedback.state === "success" ? <StatusIcon success /> : null}
                {resetFeedback.state === "success" ? "Cleared" : resetFeedback.state === "error" ? "Retry" : "Reset"}
              </Button>
            }
          />
        </CardContent>
      </Card>

      <Dialog
        open={importOpen}
        onOpenChange={(open) => {
          if (!open) {
            resetImportState()
            return
          }

          setImportOpen(true)
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Import data</DialogTitle>
            <DialogDescription>Choose a source and a file.</DialogDescription>
          </DialogHeader>

          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel>Source</FieldLabel>
              <Select
                value={importType}
                items={[
                  { value: "flamette", label: importFormatLabels.flamette },
                  { value: "one-money", label: importFormatLabels["one-money"] },
                ]}
                onValueChange={(value) => {
                  if (!value) {
                    return
                  }

                  setImportError(null)
                  importFeedback.reset()
                  setImportType(value as BackupImportType)
                  setImportFile(null)
                  setImportConfirmed(false)
                }}
                disabled={importBackup.isPending}
              >
                <SelectTrigger aria-label="Import source">
                  <SelectValue placeholder="Select a source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="flamette">{importFormatLabels.flamette}</SelectItem>
                    <SelectItem value="one-money">{importFormatLabels["one-money"]}</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel>File</FieldLabel>
              <Input
                key={`${importType}-${importFile?.name ?? "empty"}`}
                type="file"
                accept={importAccept}
                onChange={(event) => {
                  setImportError(null)
                  importFeedback.reset()
                  setImportFile(event.target.files?.[0] ?? null)
                }}
              />
              <p className="text-sm text-muted-foreground">{importFile ? importFile.name : importHint}</p>
            </Field>

            {importRequiresConfirmation ? (
              <Field orientation="horizontal">
                <Checkbox
                  id="import-confirmation"
                  checked={importConfirmed}
                  onCheckedChange={(checked) => {
                    setImportError(null)
                    importFeedback.reset()
                    setImportConfirmed(checked === true)
                  }}
                />
                <FieldContent>
                  <FieldLabel htmlFor="import-confirmation">Replace current workspace data</FieldLabel>
                </FieldContent>
              </Field>
            ) : null}

            {importError ? <p className="text-sm text-destructive">{importError}</p> : null}
          </FieldGroup>

          <DialogFooter>
            <Button variant="outline" onClick={resetImportState}>
              Cancel
            </Button>
            <Button
              variant={importRequiresConfirmation ? "destructive" : "default"}
              onClick={handleImportData}
              disabled={!importFile || (importRequiresConfirmation && !importConfirmed) || importBackup.isPending}
            >
              {importBackup.isPending ? <StatusIcon /> : null}
              {importBackup.isPending ? "Importing" : importFeedback.state === "error" ? "Retry" : importRequiresConfirmation ? "Restore" : "Import"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={seedOpen} onOpenChange={setSeedOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Sample data</DialogTitle>
            <DialogDescription>Generate a demo workspace.</DialogDescription>
          </DialogHeader>

          <FieldGroup className="gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="seed-years">Years</FieldLabel>
                <NumberInput
                  id="seed-years"
                  min={1}
                  max={20}
                  decimalScale={0}
                  showStepper
                  value={years}
                  onValueChange={(nextYears) => {
                    setSeedError(null)
                    seedFeedback.reset()
                    setYears(nextYears ?? 1)
                  }}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="seed-value">Seed</FieldLabel>
                <NumberInput
                  id="seed-value"
                  min={0}
                  decimalScale={0}
                  value={seedValue}
                  onValueChange={(nextSeed) => {
                    setSeedError(null)
                    seedFeedback.reset()
                    setSeedValue(nextSeed)
                  }}
                  placeholder="Optional"
                />
              </Field>
            </div>

            <Field orientation="horizontal">
              <Switch
                id="download-after-seed"
                checked={downloadAfterSeed}
                onCheckedChange={(checked) => {
                  setSeedError(null)
                  seedFeedback.reset()
                  setDownloadAfterSeed(checked)
                }}
              />
              <FieldContent>
                <FieldLabel htmlFor="download-after-seed">Download backup after generation</FieldLabel>
              </FieldContent>
            </Field>

            {seedError ? <p className="text-sm text-destructive">{seedError}</p> : null}
          </FieldGroup>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSeedOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSeed} disabled={seedButtonBusy}>
              {seedButtonBusy ? <StatusIcon /> : null}
              {seedButtonBusy ? "Working" : seedFeedback.state === "error" ? "Retry" : "Generate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={resetOpen}
        onOpenChange={(open) => {
          if (!open) {
            resetResetState()
            return
          }

          setResetOpen(true)
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Reset workspace</DialogTitle>
            <DialogDescription>This permanently deletes workspace data.</DialogDescription>
          </DialogHeader>

          <FieldGroup className="gap-4">
            <Field orientation="horizontal">
              <Checkbox
                id="reset-confirmation"
                checked={resetConfirmed}
                onCheckedChange={(checked) => {
                  setResetError(null)
                  resetFeedback.reset()
                  setResetConfirmed(checked === true)
                }}
              />
              <FieldContent>
                <FieldLabel htmlFor="reset-confirmation">I want to remove all workspace data</FieldLabel>
              </FieldContent>
            </Field>

            {resetError ? <p className="text-sm text-destructive">{resetError}</p> : null}
          </FieldGroup>

          <DialogFooter>
            <Button variant="outline" onClick={resetResetState}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReset} disabled={!resetConfirmed || resetData.isPending}>
              {resetData.isPending ? <StatusIcon /> : null}
              {resetData.isPending ? "Resetting" : resetFeedback.state === "error" ? "Retry" : "Reset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ActionRow({ title, description, action }: { title: string; description: string; action: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-0.5">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex shrink-0 items-center">{action}</div>
    </div>
  )
}

function StatusIcon({ success = false }: { success?: boolean }) {
  return success ? (
    <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} data-icon="inline-start" />
  ) : (
    <HugeiconsIcon icon={Loading03Icon} strokeWidth={2} data-icon="inline-start" className="animate-spin" />
  )
}

function SettingsPageSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="gap-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-28" />
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-9 w-20" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-2">
          <Skeleton className="h-5 w-14" />
          <Skeleton className="h-4 w-36" />
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-px w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-px w-full" />
          <Skeleton className="h-14 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}

function formatYearSummary(years: number) {
  return `${years} ${years === 1 ? "year" : "years"}`
}

function useTransientFeedback() {
  const [state, setState] = React.useState<"idle" | "success" | "error">("idle")
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimer = React.useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const reset = React.useCallback(() => {
    clearTimer()
    setState("idle")
  }, [clearTimer])

  const show = React.useCallback(
    (nextState: "success" | "error") => {
      clearTimer()
      setState(nextState)
      timeoutRef.current = setTimeout(() => {
        setState("idle")
        timeoutRef.current = null
      }, 2400)
    },
    [clearTimer]
  )

  React.useEffect(
    () => () => {
      clearTimer()
    },
    [clearTimer]
  )

  return { state, show, reset }
}
