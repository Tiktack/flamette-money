import { BarChart } from '@mantine/charts'
import { Card, Group, SegmentedControl, Select, Skeleton, Stack, Text } from '@mantine/core'
import { useMemo, useState } from 'react'
import { getApiErrorMessage } from '../lib/api/errors'
import { useMonthlyYoyReport } from '../lib/api/hooks'

type AnalyticsMode = 'Expense' | 'Income'

const toNumber = (value: number | string) => (typeof value === 'number' ? value : Number(value))

function formatCurrencyLike(value: number | string | undefined) {
  const numeric = toNumber(value ?? 0)
  const rounded = Math.round(numeric * 100) / 100
  return rounded.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

export function AnalyticsComparisonView() {
  const currentYear = new Date().getFullYear()
  const [mode, setMode] = useState<AnalyticsMode>('Expense')
  const [startYear, setStartYear] = useState(String(currentYear - 2))
  const [endYear, setEndYear] = useState(String(currentYear))

  const query = useMemo(() => {
    const start = Number(startYear)
    const end = Number(endYear)
    return {
      Type: mode,
      StartYear: Number.isFinite(start) ? start : currentYear - 2,
      EndYear: Number.isFinite(end) ? end : currentYear,
    }
  }, [currentYear, endYear, mode, startYear])

  const reportQuery = useMonthlyYoyReport(query)

  const yearOptions = useMemo(
    () => Array.from({ length: 8 }, (_, index) => String(currentYear - index)).map((year) => ({
      label: year,
      value: year,
    })),
    [currentYear],
  )

  const chartData = useMemo(() =>
    (reportQuery.data?.data ?? []).map((point) => {
      const row: Record<string, number | string> = { month: point.monthLabel }
      for (const series of reportQuery.data?.series ?? []) {
        row[series.key] = toNumber(point.values?.[series.key] ?? 0)
      }
      return row
    }),
  [reportQuery.data])

  const chartSeries = useMemo(
    () =>
      (reportQuery.data?.series ?? []).map((series) => ({
        name: series.key,
        label: series.label,
        color: series.color,
      })),
    [reportQuery.data?.series],
  )

  return (
    <Stack>
      <Card shadow="sm" radius="md" padding="lg">
        <Group justify="space-between" align="center" wrap="wrap">
          <Text fw={600}>Year-over-year monthly comparison</Text>
          <Group>
            <SegmentedControl
              value={mode}
              onChange={(value) => setMode(value as AnalyticsMode)}
              data={[
                { label: 'Expenses', value: 'Expense' },
                { label: 'Income', value: 'Income' },
              ]}
            />
            <Select
              label="From"
              value={startYear}
              onChange={(value) => setStartYear(value ?? String(currentYear - 2))}
              data={yearOptions}
              w={100}
            />
            <Select
              label="To"
              value={endYear}
              onChange={(value) => setEndYear(value ?? String(currentYear))}
              data={yearOptions}
              w={100}
            />
          </Group>
        </Group>

        {reportQuery.isPending ? (
          <Skeleton height={320} mt="md" />
        ) : reportQuery.isError ? (
          <Text c="red" mt="md">
            {getApiErrorMessage(reportQuery.error, 'Unable to load year-over-year report.')}
          </Text>
        ) : chartSeries.length === 0 ? (
          <Text c="dimmed" mt="md">No data for selected years.</Text>
        ) : (
          <BarChart
            mt="md"
            h={320}
            data={chartData}
            dataKey="month"
            series={chartSeries}
            tickLine="y"
          />
        )}
      </Card>

      <Card shadow="sm" radius="md" padding="lg">
        <Group justify="space-between" align="center">
          <Text fw={600}>Summary</Text>
          <Text c="dimmed" size="sm">Calendar years · Jan–Dec</Text>
        </Group>

        <Group mt="md" gap="xl">
          <div>
            <Text c="dimmed" size="sm">Total</Text>
            <Text fw={700}>{formatCurrencyLike(reportQuery.data?.summary.total)}</Text>
          </div>
          <div>
            <Text c="dimmed" size="sm">Previous year total</Text>
            <Text fw={700}>{formatCurrencyLike(reportQuery.data?.summary.previousYearTotal)}</Text>
          </div>
          <div>
            <Text c="dimmed" size="sm">Avg / month (latest year)</Text>
            <Text fw={700}>{formatCurrencyLike(reportQuery.data?.summary.averagePerMonth)}</Text>
          </div>
        </Group>
      </Card>
    </Stack>
  )
}
