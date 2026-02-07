import {
  Badge,
  Card,
  Group,
  SimpleGrid,
  Skeleton,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core'
import { BarChart, DonutChart } from '@mantine/charts'
import { useMemo } from 'react'
import { useAccounts, useCategories, useTransactions } from '../lib/api/hooks'
import classes from '../routes/analytics.module.css'

const toNumber = (value: number | string) => (typeof value === 'number' ? value : Number(value))

export function AnalyticsView() {
  const accountsQuery = useAccounts()
  const categoriesQuery = useCategories()
  const transactionsQuery = useTransactions(1, 120)

  const accountTotal = useMemo(() => {
    return (accountsQuery.data ?? []).reduce(
      (sum, account) => sum + toNumber(account.currentBalance),
      0,
    )
  }, [accountsQuery.data])

  const transactionsByMonth = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>()
    for (const transaction of transactionsQuery.data ?? []) {
      const date = new Date(transaction.date)
      const key = date.toLocaleString('en-US', {
        month: 'short',
        year: '2-digit',
      })
      const entry = map.get(key) ?? { income: 0, expense: 0 }
      if (transaction.type.toLowerCase() === 'income') {
        entry.income += toNumber(transaction.amount)
      } else if (transaction.type.toLowerCase() === 'expense') {
        entry.expense += toNumber(transaction.amount)
      }
      map.set(key, entry)
    }

    return Array.from(map.entries()).map(([month, values]) => ({
      month,
      income: Math.round(values.income * 100) / 100,
      expense: Math.round(values.expense * 100) / 100,
    }))
  }, [transactionsQuery.data])

  const categorySplit = useMemo(() => {
    const categories = categoriesQuery.data ?? []
    const totals = new Map<string, number>()

    const visit = (items: typeof categories) => {
      for (const item of items) {
        const key = item.type || 'Other'
        totals.set(key, (totals.get(key) ?? 0) + 1)
        visit(item.subcategories)
      }
    }

    visit(categories)

    const colors = ['indigo.6', 'teal.6', 'orange.6', 'grape.6', 'cyan.6']
    return Array.from(totals.entries()).map(([name, value], index) => ({
      name,
      value,
      color: colors[index % colors.length],
    }))
  }, [categoriesQuery.data])

  return (
    <Stack className={classes.page}>
      <Group justify="space-between" align="center">
        <Title order={2}>Analytics Overview</Title>
        <Badge variant="light">Live data</Badge>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} className={classes.hero}>
        <Card shadow="sm" radius="md" padding="lg">
          <Text size="sm" c="dimmed">
            Portfolio value
          </Text>
          {accountsQuery.isLoading ? (
            <Skeleton height={28} mt={8} />
          ) : (
            <Title order={3}>{accountTotal.toLocaleString()}</Title>
          )}
        </Card>
        <Card shadow="sm" radius="md" padding="lg">
          <Text size="sm" c="dimmed">
            Accounts
          </Text>
          {accountsQuery.isLoading ? (
            <Skeleton height={28} mt={8} />
          ) : (
            <Title order={3}>{accountsQuery.data?.length ?? 0}</Title>
          )}
        </Card>
        <Card shadow="sm" radius="md" padding="lg">
          <Text size="sm" c="dimmed">
            Categories
          </Text>
          {categoriesQuery.isLoading ? (
            <Skeleton height={28} mt={8} />
          ) : (
            <Title order={3}>{categorySplit.length}</Title>
          )}
        </Card>
        <Card shadow="sm" radius="md" padding="lg">
          <Text size="sm" c="dimmed">
            Transactions loaded
          </Text>
          {transactionsQuery.isLoading ? (
            <Skeleton height={28} mt={8} />
          ) : (
            <Title order={3}>{transactionsQuery.data?.length ?? 0}</Title>
          )}
        </Card>
      </SimpleGrid>

      <div className={classes.charts}>
        <Card shadow="sm" radius="md" padding="lg">
          <Text className={classes.cardTitle}>Income vs Expense</Text>
          {transactionsQuery.isLoading ? (
            <Skeleton height={220} mt="md" />
          ) : (
            <BarChart
              h={220}
              data={transactionsByMonth}
              dataKey="month"
              series={[
                { name: 'income', color: 'teal.6' },
                { name: 'expense', color: 'red.6' },
              ]}
              tickLine="y"
              withLegend
            />
          )}
        </Card>
        <Card shadow="sm" radius="md" padding="lg">
          <Text className={classes.cardTitle}>Category mix</Text>
          {categoriesQuery.isLoading ? (
            <Skeleton height={220} mt="md" />
          ) : (
            <DonutChart
              h={220}
              data={categorySplit}
              withLabelsLine={false}
              withLabels
              strokeWidth={2}
            />
          )}
        </Card>
      </div>

      <Card shadow="sm" radius="md" className={classes.tableCard}>
        <Group justify="space-between" className={classes.tableHeader}>
          <Text className={classes.cardTitle}>Recent transactions</Text>
          <Text size="sm" c="dimmed">
            Showing {Math.min(transactionsQuery.data?.length ?? 0, 6)} entries
          </Text>
        </Group>
        <div className={classes.tableContent}>
          {transactionsQuery.isLoading ? (
            <Skeleton height={180} mt="md" />
          ) : (
            <Table highlightOnHover verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Date</Table.Th>
                  <Table.Th>Type</Table.Th>
                  <Table.Th>Amount</Table.Th>
                  <Table.Th>Note</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {(transactionsQuery.data ?? []).slice(0, 6).map((row) => (
                  <Table.Tr key={row.id}>
                    <Table.Td>
                      {new Date(row.date).toLocaleDateString()}
                    </Table.Td>
                    <Table.Td>{row.type}</Table.Td>
                    <Table.Td>{toNumber(row.amount).toLocaleString()}</Table.Td>
                    <Table.Td>{row.note ?? row.merchantName ?? '-'}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </div>
      </Card>
    </Stack>
  )
}
