import * as React from "react"

import { createFileRoute } from "@tanstack/react-router"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useAppInfo, useCurrentUser } from "@/features/app/hooks"
import { useSeedDemo } from "@/features/demo-seed/hooks"
import type { BackupImportType } from "@/features/profile-backup/types"
import { getApiErrorMessage } from "@/features/shared/errors"
import {
  useExportBackup,
  useImportBackup,
  useResetData,
  useSettings,
  useUpdateSettings,
} from "@/features/settings/hooks"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/_protected/settings")({
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
  const [baseCurrency, setBaseCurrency] = React.useState("USD")
  const [years, setYears] = React.useState(3)
  const [seedValue, setSeedValue] = React.useState("")
  const [downloadAfterSeed, setDownloadAfterSeed] = React.useState(true)
  const [importType, setImportType] =
    React.useState<BackupImportType>("flamette")
  const [backupFile, setBackupFile] = React.useState<File | null>(null)
  const [resetOpen, setResetOpen] = React.useState(false)

  React.useEffect(() => {
    const currency =
      settingsQuery.data?.baseCurrency ?? currentUserQuery.data?.baseCurrency
    if (currency) {
      setBaseCurrency(currency)
    }
  }, [currentUserQuery.data?.baseCurrency, settingsQuery.data?.baseCurrency])

  const currencyOptions = appInfoQuery.data?.supportedCurrencies?.map((item) =>
    item.code.toUpperCase()
  ) ?? ["USD", "EUR", "GBP", "PLN", "CAD"]
  const importFileAccept =
    importType === "flamette"
      ? ".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      : ".csv,text/csv"

  const handleSaveSettings = async () => {
    try {
      await updateSettings.mutateAsync({ baseCurrency })
    } catch {
      // rendered below
    }
  }

  const handleImport = async () => {
    if (!backupFile) {
      return
    }

    try {
      await importBackup.mutateAsync({ file: backupFile, type: importType })
      setBackupFile(null)
    } catch {
      // rendered below
    }
  }

  const handleSeed = async () => {
    try {
      await seedDemo.mutateAsync({
        years,
        seed: seedValue.trim() ? Number(seedValue) : undefined,
      })

      if (downloadAfterSeed) {
        await exportBackup.mutateAsync({ type: "flamette" })
      }
    } catch {
      // rendered below
    }
  }

  const handleReset = async () => {
    try {
      await resetData.mutateAsync()
      setResetOpen(false)
    } catch {
      // rendered below
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-3">
      <div className="flex flex-col gap-3">
        <SettingsSection title="Profile & preferences">
          <SettingsRow
            title="Profile"
            description="Signed-in account used for this workspace."
          >
            <div className="space-y-1 text-sm md:text-right">
              <p className="font-medium text-foreground">
                {currentUserQuery.data?.name ?? "User"}
              </p>
              {currentUserQuery.data?.email ? (
                <p className="text-muted-foreground">
                  {currentUserQuery.data.email}
                </p>
              ) : null}
            </div>
          </SettingsRow>

          <SettingsRow
            title="Base currency"
            description="Used when aggregating balances, totals, and analytics across multiple accounts."
            last
          >
            <div className="flex w-full flex-col gap-3 md:ml-auto md:max-w-sm">
              <Field>
                <FieldLabel>Currency</FieldLabel>
                <Select
                  value={baseCurrency}
                  onValueChange={(value) => {
                    if (value) {
                      setBaseCurrency(value)
                    }
                  }}
                >
                  <SelectTrigger aria-label="Base currency">
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
              </Field>

              {updateSettings.isError ? (
                <Alert variant="destructive">
                  <AlertTitle>Save failed</AlertTitle>
                  <AlertDescription>
                    {getApiErrorMessage(
                      updateSettings.error,
                      "Unable to save settings."
                    )}
                  </AlertDescription>
                </Alert>
              ) : null}

              {updateSettings.isSuccess ? (
                <Alert>
                  <AlertTitle>Settings saved</AlertTitle>
                  <AlertDescription>
                    Your base currency preference has been updated.
                  </AlertDescription>
                </Alert>
              ) : null}

              <div className="flex justify-start md:justify-end">
                <Button
                  onClick={handleSaveSettings}
                  disabled={updateSettings.isPending}
                >
                  {updateSettings.isPending ? "Saving" : "Save changes"}
                </Button>
              </div>
            </div>
          </SettingsRow>
        </SettingsSection>

        <SettingsSection title="Backups & import">
          <SettingsRow
            title="Export backup"
            description="Download a complete Flamette backup as an XLSX file."
          >
            <div className="flex w-full justify-start md:justify-end">
              <Button
                variant="outline"
                onClick={() => exportBackup.mutate({ type: "flamette" })}
                disabled={exportBackup.isPending}
              >
                {exportBackup.isPending ? "Preparing" : "Export .xlsx"}
              </Button>
            </div>
          </SettingsRow>

          <SettingsRow
            title="Import backup"
            description="Restore a Flamette backup or bring in a 1Money CSV export."
            last
          >
            <div className="flex w-full flex-col gap-4 md:ml-auto md:max-w-md">
              <Field>
                <FieldLabel>Backup type</FieldLabel>
                <Select
                  value={importType}
                  onValueChange={(value) =>
                    setImportType((value as BackupImportType) ?? "flamette")
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Backup type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="flamette">
                        Flamette backup (.xlsx)
                      </SelectItem>
                      <SelectItem value="one-money">
                        1Money backup (.csv)
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel>Backup file</FieldLabel>
                <Input
                  type="file"
                  accept={importFileAccept}
                  onChange={(event) =>
                    setBackupFile(event.target.files?.[0] ?? null)
                  }
                />
              </Field>

              {importBackup.isError ? (
                <Alert variant="destructive">
                  <AlertTitle>Import failed</AlertTitle>
                  <AlertDescription>
                    {getApiErrorMessage(
                      importBackup.error,
                      "Unable to import the selected backup."
                    )}
                  </AlertDescription>
                </Alert>
              ) : null}

              <div className="flex justify-start md:justify-end">
                <Button
                  onClick={handleImport}
                  disabled={!backupFile || importBackup.isPending}
                >
                  {importBackup.isPending
                    ? "Importing"
                    : "Import selected backup"}
                </Button>
              </div>
            </div>
          </SettingsRow>
        </SettingsSection>

        <SettingsSection title="Sample data">
          <SettingsRow
            title="Generate history"
            description="Create synthetic transactions for a chosen span and optional seed value."
          >
            <div className="flex w-full flex-col gap-4 md:ml-auto md:max-w-md">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel>Years</FieldLabel>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={years}
                    onChange={(event) =>
                      setYears(Number(event.target.value) || 1)
                    }
                  />
                </Field>

                <Field>
                  <FieldLabel>Seed</FieldLabel>
                  <Input
                    type="number"
                    value={seedValue}
                    onChange={(event) => setSeedValue(event.target.value)}
                    placeholder="Optional deterministic seed"
                  />
                </Field>
              </div>

              {seedDemo.isError ? (
                <Alert variant="destructive">
                  <AlertTitle>Seeding failed</AlertTitle>
                  <AlertDescription>
                    {getApiErrorMessage(
                      seedDemo.error,
                      "Unable to seed demo data."
                    )}
                  </AlertDescription>
                </Alert>
              ) : null}

              <div className="flex justify-start md:justify-end">
                <Button
                  onClick={handleSeed}
                  disabled={seedDemo.isPending || exportBackup.isPending}
                >
                  {seedDemo.isPending ? "Seeding" : "Generate demo data"}
                </Button>
              </div>
            </div>
          </SettingsRow>

          <SettingsRow
            title="Automatic backup"
            description="Download a native backup as soon as demo data finishes generating."
            last
          >
            <label className="flex items-center gap-3 text-sm text-muted-foreground md:ml-auto">
              <Switch
                checked={downloadAfterSeed}
                onCheckedChange={setDownloadAfterSeed}
              />
              <span>Download after seeding</span>
            </label>
          </SettingsRow>
        </SettingsSection>

        <SettingsSection title="Danger zone" tone="danger">
          <SettingsRow
            title="Reset workspace"
            description="Permanently remove transactions, accounts, categories, trips, and item lines."
            last
          >
            <div className="flex w-full flex-col gap-3 md:ml-auto md:max-w-md">
              {resetData.isError ? (
                <Alert variant="destructive">
                  <AlertTitle>Reset failed</AlertTitle>
                  <AlertDescription>
                    {getApiErrorMessage(
                      resetData.error,
                      "Unable to reset data."
                    )}
                  </AlertDescription>
                </Alert>
              ) : null}

              <div className="flex justify-start md:justify-end">
                <Button
                  variant="destructive"
                  onClick={() => setResetOpen(true)}
                >
                  Reset all data
                </Button>
              </div>
            </div>
          </SettingsRow>
        </SettingsSection>
      </div>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset all data</DialogTitle>
            <DialogDescription>
              This permanently deletes transactions, accounts, categories,
              trips, and item lines while keeping core settings.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReset}
              disabled={resetData.isPending}
            >
              {resetData.isPending ? "Resetting" : "Reset data"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

type SettingsSectionProps = {
  title: string
  children: React.ReactNode
  tone?: "default" | "danger"
}

function SettingsSection({
  title,
  children,
  tone = "default",
}: SettingsSectionProps) {
  return (
    <Card
      className={cn(
        "gap-0 overflow-hidden border-border/60 bg-card/90 py-0 shadow-sm",
        tone === "danger" && "border-destructive/30"
      )}
    >
      <CardHeader className="border-b border-border/60 px-5 pt-3 pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-0">{children}</CardContent>
    </Card>
  )
}

type SettingsRowProps = {
  title: string
  description: string
  children: React.ReactNode
  last?: boolean
}

function SettingsRow({
  title,
  description,
  children,
  last = false,
}: SettingsRowProps) {
  return (
    <div className={cn("px-5 py-4", !last && "border-b border-border/60")}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4">
        <div className="max-w-xl space-y-0.5">
          <h2 className="text-sm font-medium text-foreground">{title}</h2>
          <p className="text-sm leading-5 text-muted-foreground">
            {description}
          </p>
        </div>
        <div className="w-full md:max-w-md md:flex-shrink-0">{children}</div>
      </div>
    </div>
  )
}
