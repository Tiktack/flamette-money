import { createFileRoute } from '@tanstack/react-router'
import {
  Alert,
  Button,
  Card,
  FileInput,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  Text,
} from '@mantine/core'
import { useEffect, useState } from 'react'
import {
  useAppInfo,
  useCurrentUser,
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
    const supportedCurrencyOptions = appInfoQuery.data?.supportedCurrencies?.map((item) => ({
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

  const [seedModalOpen, setSeedModalOpen] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [years, setYears] = useState<number>(3)
  const [backupFile, setBackupFile] = useState<File | null>(null)
  const [baseCurrency, setBaseCurrency] = useState('USD')

  const user = currentUserQuery.data

  useEffect(() => {
    const currency = settingsQuery.data?.baseCurrency ?? user?.baseCurrency
    if (currency) {
      setBaseCurrency(currency)
    }
  }, [settingsQuery.data?.baseCurrency, user?.baseCurrency])

  const openSeedModal = () => {
    seedDemoMutation.reset()
    setSeedModalOpen(true)
  }

  const handleSeed = () => {
    seedDemoMutation.mutate(years, {
      onSuccess: () => setSeedModalOpen(false),
    })
  }

  const openImportModal = () => {
    importBackupMutation.reset()
    setBackupFile(null)
    setImportModalOpen(true)
  }

  const handleImport = () => {
    if (!backupFile) {
      return
    }

    importBackupMutation.mutate(
      { file: backupFile, type: 'one-money' },
      {
        onSuccess: () => setImportModalOpen(false),
      },
    )
  }

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate({ baseCurrency })
  }

  return (
    <Stack className={classes.page}>
      <Card shadow="sm" radius="lg" padding="lg" className={classes.card}>
        <Stack gap="sm">
          <Text fw={600}>{user?.name ?? 'User'}</Text>
          <Text size="sm" c="dimmed">
            {user?.email ?? ''}
          </Text>

          <Group align="end" mt="sm">
            <Select
              label="Base currency"
              value={baseCurrency}
              onChange={(value) => setBaseCurrency(value ?? 'USD')}
              data={supportedCurrencyOptions}
              w={160}
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

          <Group justify="flex-start" mt="sm">
            <Button onClick={openSeedModal}>Seed demo data</Button>
            <Button variant="light" onClick={openImportModal}>
              Import 1Money CSV
            </Button>
          </Group>

          {seedDemoMutation.isSuccess ? (
            <Alert color="green" variant="light">
              Demo data seeded successfully.
            </Alert>
          ) : null}

          {importBackupMutation.isSuccess ? (
            <Alert color="green" variant="light">
              Imported {Number(importBackupMutation.data.importedTransactions)} transactions,{' '}
              {Number(importBackupMutation.data.importedAccounts)} accounts, and{' '}
              {Number(importBackupMutation.data.importedCategories) + Number(importBackupMutation.data.importedSubCategories)}{' '}
              categories.
            </Alert>
          ) : null}
        </Stack>
      </Card>

      <Modal
        opened={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        title="Import 1Money backup"
      >
        <Stack gap="sm">
          <Text size="sm" c="dimmed">
            Upload a 1Money CSV backup. This will create missing accounts, categories, and transactions.
          </Text>
          <FileInput
            label="CSV backup"
            placeholder="Choose file"
            accept=".csv,text/csv"
            value={backupFile}
            onChange={setBackupFile}
            clearable
          />
          {importBackupMutation.isError ? (
            <Alert color="red" variant="light">
              {getApiErrorMessage(importBackupMutation.error, 'Unable to import backup.')}
            </Alert>
          ) : null}
          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={() => setImportModalOpen(false)}>
              Cancel
            </Button>
            <Button
              loading={importBackupMutation.isPending}
              onClick={handleImport}
              disabled={!backupFile}
            >
              Import
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={seedModalOpen}
        onClose={() => setSeedModalOpen(false)}
        title="Seed demo data"
      >
        <Stack gap="sm">
          <Text size="sm" c="dimmed">
            This will generate demo accounts and transactions for your profile.
          </Text>
          <NumberInput
            label="How many years"
            min={1}
            max={20}
            step={1}
            value={years}
            onChange={(value) => setYears(typeof value === 'number' && Number.isFinite(value) ? value : 1)}
          />
          {seedDemoMutation.isError ? (
            <Alert color="red" variant="light">
              {getApiErrorMessage(seedDemoMutation.error, 'Unable to seed demo data.')}
            </Alert>
          ) : null}
          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={() => setSeedModalOpen(false)}>
              Cancel
            </Button>
            <Button loading={seedDemoMutation.isPending} onClick={handleSeed}>
              Confirm
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  )
}
