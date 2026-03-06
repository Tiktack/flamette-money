import * as React from "react"

import { createFileRoute } from "@tanstack/react-router"

import { PageHeader } from "@/components/page-header"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
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
import { Switch } from "@/components/ui/switch"
import { getApiErrorMessage } from "@/lib/api/errors"
import {
  type BackupImportType,
  useAppInfo,
  useCurrentUser,
  useExportBackup,
  useImportBackup,
  useResetData,
  useSeedDemo,
  useSettings,
  useUpdateSettings,
} from "@/lib/api/hooks"

export const Route = createFileRoute("/settings")({
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
  const [importType, setImportType] = React.useState<BackupImportType>("flamette")
  const [backupFile, setBackupFile] = React.useState<File | null>(null)
  const [resetOpen, setResetOpen] = React.useState(false)

  React.useEffect(() => {
    const currency = settingsQuery.data?.baseCurrency ?? currentUserQuery.data?.baseCurrency
    if (currency) {
      setBaseCurrency(currency)
    }
  }, [currentUserQuery.data?.baseCurrency, settingsQuery.data?.baseCurrency])

  const currencyOptions = appInfoQuery.data?.supportedCurrencies?.map((item) => item.code.toUpperCase()) ?? ["USD", "EUR", "GBP", "PLN", "CAD"]
  const importFileAccept = importType === "flamette" ? ".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : ".csv,text/csv"

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
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Settings"
        description="Control the base currency, move backups in and out, seed demo data, and reset the workspace when needed."
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Card className="border-border/60 bg-card/80 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Profile & preferences</CardTitle>
                <CardDescription>Workspace-level defaults for your finance setup.</CardDescription>
              </div>
              <Badge variant="secondary">Settings</Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
              <p className="font-medium text-foreground">{currentUserQuery.data?.name ?? "User"}</p>
              <p className="text-sm text-muted-foreground">{currentUserQuery.data?.email ?? ""}</p>
            </div>

            <FieldGroup>
              <Field>
                <FieldLabel>Base currency</FieldLabel>
                <Select value={baseCurrency} onValueChange={setBaseCurrency}>
                  <SelectTrigger>
                    <SelectValue placeholder="Base currency" />
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

            {updateSettings.isError ? (
              <Alert variant="destructive">
                <AlertTitle>Save failed</AlertTitle>
                <AlertDescription>{getApiErrorMessage(updateSettings.error, "Unable to save settings.")}</AlertDescription>
              </Alert>
            ) : null}
            {updateSettings.isSuccess ? (
              <Alert>
                <AlertTitle>Settings saved</AlertTitle>
                <AlertDescription>Your base currency preference has been updated.</AlertDescription>
              </Alert>
            ) : null}

            <Button onClick={handleSaveSettings} disabled={updateSettings.isPending}>
              {updateSettings.isPending ? "Saving" : "Save settings"}
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card className="border-border/60 bg-card/80 shadow-sm">
            <CardHeader>
              <CardTitle>Backup center</CardTitle>
              <CardDescription>Export native backups and import supported backup formats.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5">
              <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-background/70 p-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="font-medium text-foreground">Export backup</p>
                  <p className="text-sm text-muted-foreground">Download a complete Flamette backup as an XLSX file.</p>
                </div>
                <Button variant="outline" onClick={() => exportBackup.mutate({ type: "flamette" })} disabled={exportBackup.isPending}>
                  {exportBackup.isPending ? "Preparing" : "Export .xlsx"}
                </Button>
              </div>

              <FieldGroup className="grid gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel>Backup type</FieldLabel>
                  <Select value={importType} onValueChange={(value) => setImportType((value as BackupImportType) ?? "flamette")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Backup type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="flamette">Flamette backup (.xlsx)</SelectItem>
                        <SelectItem value="one-money">1Money backup (.csv)</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Backup file</FieldLabel>
                  <Input type="file" accept={importFileAccept} onChange={(event) => setBackupFile(event.target.files?.[0] ?? null)} />
                </Field>
              </FieldGroup>

              {importBackup.isError ? (
                <Alert variant="destructive">
                  <AlertTitle>Import failed</AlertTitle>
                  <AlertDescription>{getApiErrorMessage(importBackup.error, "Unable to import the selected backup.")}</AlertDescription>
                </Alert>
              ) : null}

              <Button onClick={handleImport} disabled={!backupFile || importBackup.isPending}>
                {importBackup.isPending ? "Importing" : "Import selected backup"}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/80 shadow-sm">
            <CardHeader>
              <CardTitle>Demo data</CardTitle>
              <CardDescription>Generate synthetic history for testing reports and workflows.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5">
              <FieldGroup className="grid gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel>Years</FieldLabel>
                  <Input type="number" min={1} max={20} value={years} onChange={(event) => setYears(Number(event.target.value) || 1)} />
                </Field>
                <Field>
                  <FieldLabel>Seed</FieldLabel>
                  <Input type="number" value={seedValue} onChange={(event) => setSeedValue(event.target.value)} placeholder="Optional deterministic seed" />
                </Field>
              </FieldGroup>

              <label className="flex items-center gap-3 text-sm text-muted-foreground">
                <Switch checked={downloadAfterSeed} onCheckedChange={setDownloadAfterSeed} />
                Download a backup after seeding
              </label>

              {seedDemo.isError ? (
                <Alert variant="destructive">
                  <AlertTitle>Seeding failed</AlertTitle>
                  <AlertDescription>{getApiErrorMessage(seedDemo.error, "Unable to seed demo data.")}</AlertDescription>
                </Alert>
              ) : null}

              <Button onClick={handleSeed} disabled={seedDemo.isPending || exportBackup.isPending}>
                {seedDemo.isPending ? "Seeding" : "Generate demo data"}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-destructive/30 bg-card/80 shadow-sm">
            <CardHeader>
              <CardTitle>Danger zone</CardTitle>
              <CardDescription>Reset the workspace while keeping your settings profile intact.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {resetData.isError ? (
                <Alert variant="destructive">
                  <AlertTitle>Reset failed</AlertTitle>
                  <AlertDescription>{getApiErrorMessage(resetData.error, "Unable to reset data.")}</AlertDescription>
                </Alert>
              ) : null}
              <Button variant="destructive" onClick={() => setResetOpen(true)}>Reset all data</Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset all data</DialogTitle>
            <DialogDescription>This permanently deletes transactions, accounts, categories, trips, and item lines while keeping core settings.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReset} disabled={resetData.isPending}>{resetData.isPending ? "Resetting" : "Reset data"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}