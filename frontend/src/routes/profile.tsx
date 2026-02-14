import { createFileRoute } from '@tanstack/react-router'
import {
  Alert,
  Button,
  Card,
  FileInput,
  Group,
  Modal,
  NumberInput,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import { useState } from 'react'
import { useCurrentUser, useImportBackup, useSeedDemo } from '../lib/api/hooks'
import { getApiErrorMessage } from '../lib/api/errors'
import { currentUserQueryOptions } from '../lib/api/queryOptions'
import { queryClient } from '../lib/api/queryClient'
import classes from './page.module.css'

export const Route = createFileRoute('/profile')({
  loader: () => queryClient.prefetchQuery(currentUserQueryOptions()),
  component: ProfilePage,
})

function ProfilePage() {
  const currentUserQuery = useCurrentUser()
  const seedDemoMutation = useSeedDemo()
  const importBackupMutation = useImportBackup()
  const [seedModalOpen, setSeedModalOpen] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [years, setYears] = useState<number>(3)
  const [backupFile, setBackupFile] = useState<File | null>(null)

  const user = currentUserQuery.data

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

  return (
    <Stack className={classes.page}>
      <Group className={classes.header} justify="space-between" wrap="wrap" gap="md">
        <Stack gap={4}>
          <Title order={2}>Profile</Title>
          <Text size="sm" c="dimmed">
            Account actions and development tools.
          </Text>
        </Stack>
      </Group>

      <Card shadow="sm" radius="lg" padding="lg" className={classes.card}>
        <Stack gap="sm">
          <Text fw={600}>{user?.name ?? 'User'}</Text>
          <Text size="sm" c="dimmed">
            {user?.email ?? ''}
          </Text>
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
