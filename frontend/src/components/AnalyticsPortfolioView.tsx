import { AreaChart } from '@mantine/charts'
import { Card, Group, Select, Skeleton, Stack, Text } from '@mantine/core'
import { useMemo, useState } from 'react'
import { getApiErrorMessage } from '../lib/api/errors'
import { useCurrentUser, usePortfolioBalanceSeriesReport } from '../lib/api/hooks'
import { SharedDateRangeChips } from './SharedDateRangeChips'
import {
  resolveSharedDateRange,
  useSharedDateRangeFilters,
} from '../lib/state/sharedDateRangeFilters'

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

export function AnalyticsPortfolioView() {
  const [interval, setInterval] = useState<AggregationPeriod>('Auto')
  const currentUserQuery = useCurrentUser()
  const baseCurrency = currentUserQuery.data?.baseCurrency ?? 'USD'
  const dateFilters = useSharedDateRangeFilters()
  const resolvedDateRange = useMemo(() => resolveSharedDateRange(dateFilters), [dateFilters])

  const query = useMemo(() => {
    const value: {
      StartDate?: string
      EndDate?: string
      Interval: AggregationPeriod
      BaseCurrency: string
    } = {
      Interval: interval,
      BaseCurrency: baseCurrency,
    }

    if (resolvedDateRange.start) {
      value.StartDate = resolvedDateRange.start.toISOString()
    }

    if (resolvedDateRange.end) {
      value.EndDate = resolvedDateRange.end.toISOString()
    }

    return value
  }, [baseCurrency, interval, resolvedDateRange.end, resolvedDateRange.start])

  const reportQuery = usePortfolioBalanceSeriesReport(query)

  const chartData = useMemo(
    () => (reportQuery.data?.points ?? []).map((point) => ({
      period: point.bucketLabel,
      balance: toNumber(point.totalBalance),
    })),
    [reportQuery.data?.points],
  )

  return (
    <Stack>
      <Card shadow="sm" radius="md" padding="md">
        <SharedDateRangeChips />
      </Card>

      <Card shadow="sm" radius="md" padding="lg">
        <Group justify="space-between" align="center" wrap="wrap">
          <Text fw={600}>Portfolio balance trend</Text>
          <Group>
            <Select
              label="Interval"
              value={interval}
              onChange={(value) => setInterval((value as AggregationPeriod) ?? 'Auto')}
              data={[
                { label: 'Auto', value: 'Auto' },
                { label: 'Day', value: 'Day' },
                { label: 'Week', value: 'Week' },
                { label: 'Month', value: 'Month' },
              ]}
              w={130}
            />
            <Text size="sm" c="dimmed" mt={24}>
              Base currency: {baseCurrency}
            </Text>
          </Group>
        </Group>

        {reportQuery.isPending ? (
          <Skeleton height={320} mt="md" />
        ) : reportQuery.isError ? (
          <Text c="red" mt="md">
            {getApiErrorMessage(reportQuery.error, 'Unable to load portfolio balance report.')}
          </Text>
        ) : chartData.length === 0 ? (
          <Text c="dimmed" mt="md">No portfolio data for selected range.</Text>
        ) : (
          <AreaChart
            mt="md"
            h={320}
            data={chartData}
            dataKey="period"
            series={[{ name: 'balance', label: `Balance (${baseCurrency})`, color: 'blue.6' }]}
            curveType="linear"
            tickLine="y"
          />
        )}
      </Card>

      <Card shadow="sm" radius="md" padding="lg">
        <Text fw={600}>Summary</Text>
        <Group mt="md" gap="xl">
          <div>
            <Text c="dimmed" size="sm">Start balance</Text>
            <Text fw={700}>{formatCurrencyLike(reportQuery.data?.summary.startBalance)}</Text>
          </div>
          <div>
            <Text c="dimmed" size="sm">End balance</Text>
            <Text fw={700}>{formatCurrencyLike(reportQuery.data?.summary.endBalance)}</Text>
          </div>
          <div>
            <Text c="dimmed" size="sm">Delta</Text>
            <Text fw={700}>{formatCurrencyLike(reportQuery.data?.summary.delta)}</Text>
          </div>
          <div>
            <Text c="dimmed" size="sm">Delta %</Text>
            <Text fw={700}>{toNumber(reportQuery.data?.summary.deltaPercent ?? 0).toFixed(2)}%</Text>
          </div>
        </Group>

        {(reportQuery.data?.warnings?.length ?? 0) > 0 ? (
          <Text c="orange" size="sm" mt="md">
            {reportQuery.data?.warnings[0]}
          </Text>
        ) : null}
      </Card>
    </Stack>
  )
}
