import { createFileRoute } from '@tanstack/react-router'
import { Card, Group, Skeleton, Stack, Table, Text, Title } from '@mantine/core'
import { useTransactions } from '../lib/api/hooks'
import classes from './page.module.css'

export const Route = createFileRoute('/transactions')({
  component: TransactionsPage,
})

function TransactionsPage() {
  const transactionsQuery = useTransactions(1, 50)

  return (
    <Stack className={classes.page}>
      <Group className={classes.header}>
        <Title order={2}>Transactions</Title>
        <Text size="sm" c="dimmed">
          Latest activity across accounts
        </Text>
      </Group>

      <Card shadow="sm" radius="md" padding="lg">
        {transactionsQuery.isLoading ? (
          <Skeleton height={220} />
        ) : (
          <Table highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Date</Table.Th>
                <Table.Th>Type</Table.Th>
                <Table.Th>Amount</Table.Th>
                <Table.Th>Account</Table.Th>
                <Table.Th>Note</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(transactionsQuery.data ?? []).map((transaction) => (
                <Table.Tr key={transaction.id}>
                  <Table.Td>
                    {new Date(transaction.date).toLocaleDateString()}
                  </Table.Td>
                  <Table.Td>{transaction.type}</Table.Td>
                  <Table.Td>{transaction.amount.toLocaleString()}</Table.Td>
                  <Table.Td>{transaction.accountId.slice(0, 8)}</Table.Td>
                  <Table.Td>
                    {transaction.note ?? transaction.merchantName ?? '-'}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Card>
    </Stack>
  )
}
