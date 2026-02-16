import { createFileRoute } from '@tanstack/react-router'
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Divider,
  FileInput,
  Grid,
  Group,
  NumberInput,
  Select,
  Stack,
  Text,
  ThemeIcon,
} from '@mantine/core'
import { IconDatabaseImport, IconDatabasePlus, IconDownload, IconSettings } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import {
  type BackupImportType,
  useAppInfo,
  useCurrentUser,
  useExportBackup,
  useImportBackup,
  useSeedDemo,
  useSettings,
  useUpdateSettings,
} from '../lib/api/hooks'
import { getApiErrorMessage } from '../lib/api/errors'
import { currentUserQueryOptions, settingsQueryOptions } from '../lib/api/queryOptions'
import { queryClient } from '../lib/api/queryClient'
import classes from './page.module.css'

export const Route = createFileRoute('/settings')({
  loader: async () => {
    await Promise.all([
      queryClient.prefetchQuery(currentUserQueryOptions()),
      queryClient.prefetchQuery(settingsQueryOptions()),
    ])
  },
  component: SettingsPage,
})

function SettingsPage() {
  const currentUserQuery = useCurrentUser()
  const appInfoQuery = useAppInfo()
  const settingsQuery = useSettings()
  const supportedCurrencyOptions =
    appInfoQuery.data?.supportedCurrencies?.map((item) => ({
      label: item.code,
      value: item.code,
    })) ?? [
      { label: 'USD', value: 'USD' },
      { label: 'EUR', value: 'EUR' },
      { label: 'GBP', value: 'GBP' },
      { label: 'PLN', value: 'PLN' },
      { label: 'CAD', value: 'CAD' },
    ]

  const updateSettingsMutation = useUpdateSettings()
  const seedDemoMutation = useSeedDemo()
  const importBackupMutation = useImportBackup()
  const exportBackupMutation = useExportBackup()

  const [years, setYears] = useState<number>(3)
  const [seedValue, setSeedValue] = useState<number | ''>('')
  const [downloadBackupAfterSeed, setDownloadBackupAfterSeed] = useState(true)
  const [importType, setImportType] = useState<BackupImportType>('flamette')
  const [backupFile, setBackupFile] = useState<File | null>(null)
  const [baseCurrency, setBaseCurrency] = useState('USD')

  const user = currentUserQuery.data

  useEffect(() => {
    const currency = settingsQuery.data?.baseCurrency ?? user?.baseCurrency
    if (currency) {
      setBaseCurrency(currency)
    }
  }, [settingsQuery.data?.baseCurrency, user?.baseCurrency])

  const resetImportState = () => {
    importBackupMutation.reset()
    setBackupFile(null)
  }

  const handleImport = () => {
    if (!backupFile) {
      return
    }

    importBackupMutation.mutate({ file: backupFile, type: importType })
  }

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate({ baseCurrency })
  }

  const handleExport = () => {
    exportBackupMutation.mutate({ type: 'flamette' })
  }

  const handleSeed = async () => {
    try {
      await seedDemoMutation.mutateAsync({
        years,
        seed: typeof seedValue === 'number' && Number.isFinite(seedValue) ? seedValue : undefined,
      })

      if (downloadBackupAfterSeed) {
        await exportBackupMutation.mutateAsync({ type: 'flamette' })
      }
    } catch {
      // Errors are rendered via mutation state alerts.
    }
  }

  const importTypeOptions: Array<{ value: BackupImportType; label: string }> = [
    { value: 'flamette', label: 'Flamette backup (.xlsx)' },
    { value: 'one-money', label: '1Money backup (.csv)' },
  ]

  const importFileAccept = importType === 'flamette' ? '.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : '.csv,text/csv'
  const importFileLabel = importType === 'flamette' ? 'Flamette backup file' : '1Money CSV file'

  return (
    <Stack className={classes.page}>
      <Grid gutter="md">
        <Grid.Col span={{ base: 12, md: 5 }}>
          <Card shadow="sm" radius="lg" padding="lg" className={classes.card}>
            <Stack gap="md">
              <Group justify="space-between" align="flex-start">
                <Group gap="sm">
                  <ThemeIcon size="lg" radius="md" variant="light" color="blue">
                    <IconSettings size={18} />
                  </ThemeIcon>
                  <Stack gap={2}>
                    <Text fw={700}>Profile & preferences</Text>
                    <Text size="sm" c="dimmed">
                      Configure account-level defaults and app behavior.
                    </Text>
                  </Stack>
                </Group>
                <Badge variant="light" color="blue">
                  Settings
                </Badge>
              </Group>

              <Divider />

              <Stack gap={4}>
                <Text fw={600}>{user?.name ?? 'User'}</Text>
                <Text size="sm" c="dimmed">
                  {user?.email ?? ''}
                </Text>
              </Stack>

              <Group align="end" wrap="wrap">
                <Select
                  label="Base currency"
                  value={baseCurrency}
                  onChange={(value) => setBaseCurrency(value ?? 'USD')}
                  data={supportedCurrencyOptions}
                  w={180}
                />
                <Button loading={updateSettingsMutation.isPending} onClick={handleSaveSettings}>
                  Save settings
                </Button>
              </Group>

              {updateSettingsMutation.isError ? (
                <Alert color="red" variant="light">
                  {getApiErrorMessage(updateSettingsMutation.error, 'Unable to save settings.')}
                </Alert>
              ) : null}

              {updateSettingsMutation.isSuccess ? (
                <Alert color="green" variant="light">
                  Settings saved.
                </Alert>
              ) : null}
            </Stack>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 7 }}>
          <Stack gap="md">
            <Card shadow="sm" radius="lg" padding="lg" className={classes.card}>
              <Stack gap="md">
                <Group justify="space-between" align="flex-start">
                  <Group gap="sm">
                    <ThemeIcon size="lg" radius="md" variant="light" color="violet">
                      <IconDatabaseImport size={18} />
                    </ThemeIcon>
                    <Stack gap={2}>
                      <Text fw={700}>Backup center</Text>
                      <Text size="sm" c="dimmed">
                        Export native XLSX backups and import from multiple backup formats.
                      </Text>
                    </Stack>
                  </Group>
                  <Badge variant="light" color="violet">
                    Backup
                  </Badge>
                </Group>

                <Divider />

                <Group justify="space-between" align="end" wrap="wrap">
                  <Stack gap={2}>
                    <Text fw={600}>Export backup</Text>
                    <Text size="sm" c="dimmed">
                      Download your full Flamette backup as an Excel file.
                    </Text>
                  </Stack>
                  <Button
                    leftSection={<IconDownload size={16} />}
                    loading={exportBackupMutation.isPending}
                    onClick={handleExport}
                  >
                    Export `.xlsx`
                  </Button>
                </Group>

                {exportBackupMutation.isError ? (
                  <Alert color="red" variant="light">
                    {getApiErrorMessage(exportBackupMutation.error, 'Unable to export backup.')}
                  </Alert>
                ) : null}

                <Divider />

                <Stack gap="sm">
                  <Text fw={600}>Import backup</Text>
                  <Group grow>
                    <Select
                      label="Backup type"
                      data={importTypeOptions}
                      value={importType}
                      onChange={(value) => {
                        setImportType((value as BackupImportType | null) ?? 'flamette')
                        resetImportState()
                      }}
                    />
                    <FileInput
                      label={importFileLabel}
                      placeholder="Choose file"
                      accept={importFileAccept}
                      value={backupFile}
                      onChange={setBackupFile}
                      clearable
                    />
                  </Group>

                  <Group justify="flex-end">
                    <Button
                      variant="light"
                      onClick={handleImport}
                      disabled={!backupFile}
                      loading={importBackupMutation.isPending}
                    >
                      Import selected backup
                    </Button>
                  </Group>
                </Stack>

                {importBackupMutation.isError ? (
                  <Alert color="red" variant="light">
                    {getApiErrorMessage(importBackupMutation.error, 'Unable to import backup.')}
                  </Alert>
                ) : null}

                {importBackupMutation.isSuccess ? (
                  <Alert color="green" variant="light">
                    Imported {Number(importBackupMutation.data.importedTransactions)} transactions,{' '}
                    {Number(importBackupMutation.data.importedAccounts)} accounts,{' '}
                    {Number(importBackupMutation.data.importedCategories) +
                      Number(importBackupMutation.data.importedSubCategories)}{' '}
                    categories, and {Number(importBackupMutation.data.importedTransactionItems)} items.
                  </Alert>
                ) : null}
              </Stack>
            </Card>

            <Card shadow="sm" radius="lg" padding="lg" className={classes.card}>
              <Stack gap="md">
                <Group justify="space-between" align="flex-start">
                  <Group gap="sm">
                    <ThemeIcon size="lg" radius="md" variant="light" color="teal">
                      <IconDatabasePlus size={18} />
                    </ThemeIcon>
                    <Stack gap={2}>
                      <Text fw={700}>Demo data generation</Text>
                      <Text size="sm" c="dimmed">
                        Seed sample transactions and optionally generate a backup snapshot.
                      </Text>
                    </Stack>
                  </Group>
                  <Badge variant="light" color="teal">
                    Seed
                  </Badge>
                </Group>

                <Divider />

                <Group grow>
                  <NumberInput
                    label="Years to generate"
                    min={1}
                    max={20}
                    step={1}
                    value={years}
                    onChange={(value) =>
                      setYears(typeof value === 'number' && Number.isFinite(value) ? value : 1)
                    }
                  />
                  <NumberInput
                    label="Seed (optional)"
                    min={1}
                    max={999999}
                    value={seedValue}
                    onChange={(value) =>
                      setSeedValue(typeof value === 'number' && Number.isFinite(value) ? value : '')
                    }
                    placeholder="Randomized"
                  />
                </Group>

                <Checkbox
                  checked={downloadBackupAfterSeed}
                  onChange={(event) => setDownloadBackupAfterSeed(event.currentTarget.checked)}
                  label="Automatically export Flamette backup after seeding"
                />

                <Group justify="flex-end">
                  <Button
                    leftSection={<IconDatabasePlus size={16} />}
                    loading={seedDemoMutation.isPending}
                    onClick={handleSeed}
                  >
                    Generate demo data
                  </Button>
                </Group>

                {seedDemoMutation.isError ? (
                  <Alert color="red" variant="light">
                    {getApiErrorMessage(seedDemoMutation.error, 'Unable to seed demo data.')}
                  </Alert>
                ) : null}

                {seedDemoMutation.isSuccess ? (
                  <Alert color="green" variant="light">
                    Demo data seeded successfully.
                  </Alert>
                ) : null}
              </Stack>
            </Card>
          </Stack>
        </Grid.Col>
      </Grid>
    </Stack>
  )
}
