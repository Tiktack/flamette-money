import { createFileRoute } from '@tanstack/react-router'
import { Card, Group, Skeleton, Stack, Table, Text, Title } from '@mantine/core'
import { useAccounts } from '../lib/api/hooks'
import classes from './page.module.css'

export const Route = createFileRoute('/accounts')({
  component: AccountsPage,
})

function AccountsPage() {
  const accountsQuery = useAccounts()

  return (
    <Stack className={classes.page}>
      <Group className={classes.header}>
        <Title order={2}>Accounts</Title>
        <Text size="sm" c="dimmed">
          Overview of balances and types
        </Text>
      </Group>

      <Card shadow="sm" radius="md" padding="lg">
        {accountsQuery.isLoading ? (
          <Skeleton height={200} />
        ) : (
          <Table highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Type</Table.Th>
                <Table.Th>Currency</Table.Th>
                <Table.Th>Initial balance</Table.Th>
                <Table.Th>Current balance</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(accountsQuery.data ?? []).map((account) => (
                <Table.Tr key={account.id}>
                  <Table.Td>{account.name}</Table.Td>
                  <Table.Td>{account.type}</Table.Td>
                  <Table.Td>{account.currency}</Table.Td>
                  <Table.Td>{account.initialBalance.toLocaleString()}</Table.Td>
                  <Table.Td>{account.currentBalance.toLocaleString()}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Card>
    </Stack>
  )
}
