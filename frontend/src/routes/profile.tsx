import { createFileRoute } from '@tanstack/react-router'
import {
  Alert,
  Button,
  Card,
  Group,
  Modal,
  NumberInput,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import { useState } from 'react'
import { useCurrentUser, useSeedDemo } from '../lib/api/hooks'
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
  const [seedModalOpen, setSeedModalOpen] = useState(false)
  const [years, setYears] = useState<number>(3)

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
          </Group>
          {seedDemoMutation.isSuccess ? (
            <Alert color="green" variant="light">
              Demo data seeded successfully.
            </Alert>
          ) : null}
        </Stack>
      </Card>

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
