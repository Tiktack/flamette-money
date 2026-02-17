import {
  IconArrowDownRight,
  IconArrowUpRight,
  IconCalendar,
  IconCalendarWeek,
  IconCoin,
  type Icon,
  IconReceipt2,
} from '@tabler/icons-react'
import {
  Box,
  Card,
  Group,
  Paper,
  Progress,
  SegmentedControl,
  Select,
  SimpleGrid,
  Skeleton,
  Stack,
  Switch,
  Text,
} from '@mantine/core'
import { BarChart } from '@mantine/charts'
import { useMemo, useState } from 'react'
import { getApiErrorMessage } from '../lib/api/errors'
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

function formatCurrencyLike(value: number | string | undefined, currency: string) {
  const numeric = toNumber(value ?? 0)
  const rounded = Math.round(numeric * 100) / 100
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(rounded)
}

function toPercentDiff(current: number, previous: number) {
  if (previous === 0) {
    return current === 0 ? 0 : 100
  }

  return Math.round(((current - previous) / Math.abs(previous)) * 100)
}

export function AnalyticsCategoriesView() {
  const [mode, setMode] = useState<AnalyticsMode>('Expense')
  const [aggregation, setAggregation] = useState<AggregationPeriod>('Auto')
  const [groupTripsAsCategory, setGroupTripsAsCategory] = useState(false)
  const dateFilters = useSharedDateRangeFilters()
  const resolvedDateRange = useMemo(() => resolveSharedDateRange(dateFilters), [dateFilters])

  const reportQuery = useMemo(() => {
    const query: {
      StartDate?: string
      EndDate?: string
      Type: AnalyticsMode
      Interval: AggregationPeriod
      GroupTripsAsCategory?: boolean
    } = {
      Type: mode,
      Interval: aggregation,
    }

    if (mode === 'Expense') {
      query.GroupTripsAsCategory = groupTripsAsCategory
    }

    if (resolvedDateRange.start) {
      query.StartDate = resolvedDateRange.start.toISOString()
    }

    if (resolvedDateRange.end) {
      query.EndDate = resolvedDateRange.end.toISOString()
    }

    return query
  }, [aggregation, groupTripsAsCategory, mode, resolvedDateRange.end, resolvedDateRange.start])

  const reportQueryResult = useCategorySeriesReport(reportQuery)
  const isInitialLoading = reportQueryResult.isPending

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
      baseCurrency: payload?.baseCurrency ?? 'USD',
      total: toNumber(payload?.summary?.total ?? 0),
      previousTotal: toNumber(payload?.summary?.previousTotal ?? 0),
      avgPerDay: toNumber(payload?.summary?.averagePerDay ?? 0),
      previousAvgPerDay: toNumber(payload?.summary?.previousAveragePerDay ?? 0),
      avgPerWeek: toNumber(payload?.summary?.averagePerWeek ?? 0),
      previousAvgPerWeek: toNumber(payload?.summary?.previousAveragePerWeek ?? 0),
      series,
      data,
      categoryList,
    }
  }, [reportQueryResult.data])

  const statCards = useMemo(
    () => [
      {
        title: 'Avg / day',
        value: report.avgPerDay,
        previousValue: report.previousAvgPerDay,
        icon: IconCalendar,
      },
      {
        title: 'Avg / week',
        value: report.avgPerWeek,
        previousValue: report.previousAvgPerWeek,
        icon: IconCalendarWeek,
      },
      {
        title: 'Total',
        value: report.total,
        previousValue: report.previousTotal,
        icon: mode === 'Expense' ? IconReceipt2 : IconCoin,
      },
    ],
    [mode, report.avgPerDay, report.avgPerWeek, report.previousAvgPerDay, report.previousAvgPerWeek, report.previousTotal, report.total],
  )

  const hasData = report.series.length > 0

  return (
    <Stack className={classes.page}>
      <Group justify="space-between" align="center">
        <Group gap="md">
          {mode === 'Expense' ? (
            <Switch
              label="Group trips as category"
              checked={groupTripsAsCategory}
              onChange={(event) => setGroupTripsAsCategory(event.currentTarget.checked)}
            />
          ) : null}
          <SegmentedControl
            value={mode}
            onChange={(value) => setMode(value as AnalyticsMode)}
            data={[
              { label: 'Expenses', value: 'Expense' },
              { label: 'Income', value: 'Income' },
            ]}
          />
        </Group>
      </Group>

      <Card className={classes.dateCard}>
        <SharedDateRangeChips />
      </Card>

      {reportQueryResult.isError && !hasData ? (
        <Card className={classes.emptyCard}>
          <Stack align="center" gap={6}>
            <Text fw={600}>Unable to load reports</Text>
            <Text c="red" ta="center">
              {getApiErrorMessage(reportQueryResult.error, 'Unable to load reports for selected range.')}
            </Text>
          </Stack>
        </Card>
      ) : isInitialLoading || hasData ? (
        <>
          <SimpleGrid cols={{ base: 1, sm: 3 }}>
            {statCards.map((stat) => {
              const diff = toPercentDiff(stat.value, stat.previousValue)
              const DiffIcon = diff >= 0 ? IconArrowUpRight : IconArrowDownRight
              const StatIcon: Icon = stat.icon
              const isGoodTrend = mode === 'Income' ? diff >= 0 : diff <= 0

              return (
                <Paper withBorder key={stat.title}>
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed" className={classes.statTitle}>
                      {stat.title}
                    </Text>
                    <StatIcon className={classes.statIcon} size={22} stroke={1.5} />
                  </Group>

                  {isInitialLoading ? (
                    <Skeleton height={28} mt={20} />
                  ) : (
                    <Group align="flex-end" gap="xs" mt={10}>
                      <Text className={classes.statValue}>{formatCurrencyLike(stat.value, report.baseCurrency)}</Text>
                      <Text
                        c={isGoodTrend ? 'teal' : 'red'}
                        fz="sm"
                        fw={500}
                        className={classes.statDiff}
                      >
                        <span>{Math.abs(diff)}%</span>
                        <DiffIcon size={16} stroke={1.5} />
                      </Text>
                    </Group>
                  )}

                  <Text fz="xs" c="dimmed" mt={5}>
                    Compared to previous range
                  </Text>
                </Paper>
              )
            })}
          </SimpleGrid>

          <div className={classes.reportGrid}>
            <Card>
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

              {isInitialLoading ? (
                <Skeleton height={320} mt="md" />
              ) : (
                <Box mt="md">
                  {report.series.length === 0 ? (
                    <Text c="dimmed">No data for selected range.</Text>
                  ) : (
                    <BarChart
                      h={320}
                      data={report.data}
                      dataKey="period"
                      barProps={{
                        isAnimationActive: true,
                      }}
                      series={report.series}
                      type="stacked"
                      tickLine="y"
                    />
                  )}
                </Box>
              )}
            </Card>

            <Card>
              <Group justify="space-between" align="center">
                <Text className={classes.cardTitle}>Categories</Text>
                {isInitialLoading ? null : (
                  <Text size="sm" c="dimmed">
                    {report.categoryList.length}
                  </Text>
                )}
              </Group>

              {isInitialLoading ? (
                <Skeleton height={320} mt="md" />
              ) : (
                <Box mt="md">
                  {report.categoryList.length === 0 ? (
                    <Text c="dimmed">No categories in range.</Text>
                  ) : (
                    <Stack gap="sm" className={classes.categoryList}>
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
                              {formatCurrencyLike(item.amount, report.baseCurrency)}
                            </Text>
                          </Group>
                          <Progress
                            value={item.percent}
                            color={item.color}
                            mt={6}
                          />
                        </div>
                      ))}
                    </Stack>
                  )}
                </Box>
              )}
            </Card>
          </div>
        </>
      ) : (
        <Card className={classes.emptyCard}>
          <Stack align="center" gap={6}>
            <Text className={classes.emptyEmoji}>🫠</Text>
            <Text fw={600}>No data in this range yet</Text>
            <Text c="dimmed" ta="center">
              No transactions matched this filter. Try another range and let&apos;s make this chart party start.
            </Text>
          </Stack>
        </Card>
      )}
    </Stack>
  )
}
