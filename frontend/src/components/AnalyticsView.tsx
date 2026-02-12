import {
  Box,
  Card,
  Group,
  Progress,
  SegmentedControl,
  Select,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import { BarChart } from '@mantine/charts'
import { useMemo, useState } from 'react'
import { useCategorySeriesReport } from '../lib/api/hooks'
import { SharedDateRangeChips } from './SharedDateRangeChips'
import {
  resolveSharedDateRange,
  useSharedDateRangeFilters,
} from '../lib/state/sharedDateRangeFilters'
import classes from '../routes/analytics.module.css'

type AnalyticsMode = 'Expense' | 'Income'
type AggregationPeriod = 'Auto' | 'Day' | 'Week' | 'Month'

const toNumber = (value: number | string) => (typeof value === 'number' ? value : Number(value))

function formatCurrencyLike(value: number | string | undefined) {
  const numeric = toNumber(value ?? 0)
  const rounded = Math.round(numeric * 100) / 100
  return rounded.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

export function AnalyticsView() {
  const [mode, setMode] = useState<AnalyticsMode>('Expense')
  const [aggregation, setAggregation] = useState<AggregationPeriod>('Auto')
  const dateFilters = useSharedDateRangeFilters()
  const resolvedDateRange = useMemo(() => resolveSharedDateRange(dateFilters), [dateFilters])

  const reportQuery = useMemo(() => {
    const query: {
      StartDate?: string
      EndDate?: string
      Type: AnalyticsMode
      Interval: AggregationPeriod
    } = {
      Type: mode,
      Interval: aggregation,
    }

    if (resolvedDateRange.start) {
      query.StartDate = resolvedDateRange.start.toISOString()
    }

    if (resolvedDateRange.end) {
      query.EndDate = resolvedDateRange.end.toISOString()
    }

    return query
  }, [aggregation, mode, resolvedDateRange.end, resolvedDateRange.start])

  const reportQueryResult = useCategorySeriesReport(reportQuery)

  const report = useMemo(() => {
    const payload = reportQueryResult.data

    const series = (payload?.series ?? []).map((entry) => ({
      name: entry.key,
      color: entry.color,
      label: entry.label,
    }))

    const data = (payload?.data ?? []).map((point) => {
      const row: Record<string, number | string> = { period: point.bucketLabel }
      for (const entry of series) {
        row[entry.name] = toNumber(point.values?.[entry.name] ?? 0)
      }
      return row
    })

    const categoryList = (payload?.series ?? []).map((entry) => ({
      id: entry.key,
      name: entry.label,
      color: entry.color,
      amount: toNumber(entry.total),
      percent: toNumber(entry.percentageOfMax),
    }))

    return {
      interval: payload?.interval ?? 'Auto',
      total: toNumber(payload?.summary?.total ?? 0),
      avgPerDay: toNumber(payload?.summary?.averagePerDay ?? 0),
      avgPerWeek: toNumber(payload?.summary?.averagePerWeek ?? 0),
      series,
      data,
      categoryList,
    }
  }, [reportQueryResult.data])

  return (
    <Stack className={classes.page}>
      <Group justify="space-between" align="center">
        <Title order={2}>Reports</Title>
        <SegmentedControl
          value={mode}
          onChange={(value) => setMode(value as AnalyticsMode)}
          data={[
            { label: 'Expenses', value: 'Expense' },
            { label: 'Income', value: 'Income' },
          ]}
        />
      </Group>

      <Card shadow="sm" radius="md" padding="md" className={classes.dateCard}>
        <SharedDateRangeChips />
      </Card>

      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        <Card shadow="sm" radius="md" padding="lg">
          <Text size="sm" c="dimmed">
            Avg / day
          </Text>
          {reportQueryResult.isLoading ? (
            <Skeleton height={28} mt={8} />
          ) : (
            <Title order={3}>{formatCurrencyLike(report.avgPerDay)}</Title>
          )}
        </Card>
        <Card shadow="sm" radius="md" padding="lg">
          <Text size="sm" c="dimmed">
            Avg / week
          </Text>
          {reportQueryResult.isLoading ? (
            <Skeleton height={28} mt={8} />
          ) : (
            <Title order={3}>{formatCurrencyLike(report.avgPerWeek)}</Title>
          )}
        </Card>
        <Card shadow="sm" radius="md" padding="lg">
          <Text size="sm" c="dimmed">
            Total
          </Text>
          {reportQueryResult.isLoading ? (
            <Skeleton height={28} mt={8} />
          ) : (
            <Title order={3}>{formatCurrencyLike(report.total)}</Title>
          )}
        </Card>
      </SimpleGrid>

      <div className={classes.reportGrid}>
        <Card shadow="sm" radius="md" padding="lg">
          <Group justify="space-between" align="center">
            <Text className={classes.cardTitle}>
              {mode === 'Expense' ? 'Expenses' : 'Income'} by category
            </Text>
            <Select
              value={aggregation}
              onChange={(value) => setAggregation((value as AggregationPeriod) ?? 'Auto')}
              data={[
                { label: 'Auto', value: 'Auto' },
                { label: 'Day', value: 'Day' },
                { label: 'Week', value: 'Week' },
                { label: 'Month', value: 'Month' },
              ]}
              w={140}
            />
          </Group>

          {reportQueryResult.isLoading ? (
            <Skeleton height={320} mt="md" />
          ) : report.series.length === 0 ? (
            <Text c="dimmed" mt="md">
              No data for selected range.
            </Text>
          ) : (
            <BarChart
              h={320}
              mt="md"
              data={report.data}
              dataKey="period"
              barProps={{
                isAnimationActive: true
              }}
              series={report.series}
              type="stacked"
              tickLine="y"
            />
          )}
        </Card>

        <Card shadow="sm" radius="md" padding="lg">
          <Group justify="space-between" align="center">
            <Text className={classes.cardTitle}>Categories</Text>
            {reportQueryResult.isLoading ? null : (
              <Text size="sm" c="dimmed">
                {report.categoryList.length}
              </Text>
            )}
          </Group>

          {reportQueryResult.isLoading ? (
            <Skeleton height={320} mt="md" />
          ) : report.categoryList.length === 0 ? (
            <Text c="dimmed" mt="md">
              No categories in range.
            </Text>
          ) : (
            <Stack gap="sm" mt="md" className={classes.categoryList}>
              {report.categoryList.map((item) => (
                <div key={item.id}>
                  <Group justify="space-between" gap="xs">
                    <Group gap="xs">
                      <Box
                        w={10}
                        h={10}
                        style={{
                          borderRadius: 999,
                          backgroundColor: item.color,
                        }}
                      />
                      <Text size="sm" fw={500} lineClamp={1}>
                        {item.name}
                      </Text>
                    </Group>
                    <Text size="sm" c="dimmed">
                      {formatCurrencyLike(item.amount)}
                    </Text>
                  </Group>
                  <Progress
                    value={item.percent}
                    color={item.color}
                    radius="xl"
                    mt={6}
                  />
                </div>
              ))}
            </Stack>
          )}
        </Card>
      </div>
    </Stack>
  )
}
