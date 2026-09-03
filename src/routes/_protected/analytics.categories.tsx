import * as React from "react"

import { createFileRoute } from "@tanstack/react-router"

import { EmptyState } from "@/components/empty-state"
import { IntervalSelect } from "@/components/interval-select"
import { CardSkeleton, MetricCardsSkeleton } from "@/components/page-skeletons"
import { SharedDateRangeToolbar } from "@/components/shared-date-range-toolbar"
import { TrendBadge, formatTrendLabel } from "@/components/trend-badge"
import { ComposedChart } from "@/components/charts/composed-chart"
import { SeriesBar } from "@/components/charts/series-bar"
import { Grid } from "@/components/charts/grid"
import { XAxis } from "@/components/charts/x-axis"
import { YAxis } from "@/components/charts/y-axis"
import { PieChart } from "@/components/charts/pie-chart"
import { PieSlice } from "@/components/charts/pie-slice"
import { PieCenter } from "@/components/charts/pie-center"
import { ChartTooltip } from "@/components/charts/tooltip"
import { bucketKeyToDate, formatCompactNumber } from "@/lib/chart-utils"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { getApiErrorMessage } from "@/features/shared/errors"
import { useCategories } from "@/features/categories/hooks"
import { useCategorySeriesReport } from "@/features/reports/hooks"
import { CategoryIconBadge, buildCategoryIconById } from "@/lib/category-icons"
import { formatCurrency, normalizeHexColor, toNumber } from "@/lib/finance"
import { useSharedDateRangeQuery } from "@/lib/state/sharedDateRangeFilters"
import { MetricCard } from "@/components/metric-card"

export const Route = createFileRoute("/_protected/analytics/categories")({
  head: () => ({ meta: [{ title: "Category analytics — Flamette Money" }] }),
  component: AnalyticsCategoriesPage,
})

function AnalyticsCategoriesPage() {
  const [mode, setMode] = React.useState<"Expense" | "Income">("Expense")
  const [aggregation, setAggregation] = React.useState<"Auto" | "Day" | "Week" | "Month">("Auto")
  const [groupTripsAsCategory, setGroupTripsAsCategory] = React.useState(false)
  const isGroupTripsDisabled = mode !== "Expense"
  const dateRangeQuery = useSharedDateRangeQuery()

  const query = React.useMemo(() => {
    const value: {
      StartDate?: string
      EndDate?: string
      Type: "Expense" | "Income"
      Interval: "Auto" | "Day" | "Week" | "Month"
      GroupTripsAsCategory?: boolean
    } = {
      ...dateRangeQuery,
      Type: mode,
      Interval: aggregation,
    }

    if (mode === "Expense") {
      value.GroupTripsAsCategory = groupTripsAsCategory
    }

    return value
  }, [aggregation, dateRangeQuery, groupTripsAsCategory, mode])

  const reportQuery = useCategorySeriesReport(query)
  const categoriesQuery = useCategories()
  const categoryIconById = React.useMemo(() => buildCategoryIconById(categoriesQuery.data), [categoriesQuery.data])
  const report = React.useMemo(() => {
    const payload = reportQuery.data
    const series = (payload?.series ?? []).map((entry) => ({
      key: entry.key,
      label: entry.label,
      color: normalizeHexColor(entry.color),
      total: toNumber(entry.total),
      percent: toNumber(entry.percentageOfMax),
    }))

    const data = (payload?.data ?? []).map((point, index) => {
      const row: Record<string, number | string | Date> = { date: bucketKeyToDate(point.bucketKey, index) }
      for (const seriesEntry of series) {
        row[seriesEntry.key] = toNumber(point.values?.[seriesEntry.key] ?? 0)
      }
      return row
    })

    return {
      baseCurrency: payload?.baseCurrency ?? "USD",
      series,
      data,
      total: toNumber(payload?.summary?.total ?? 0),
      previousTotal: toNumber(payload?.summary?.previousTotal ?? 0),
      averagePerDay: toNumber(payload?.summary?.averagePerDay ?? 0),
      previousAveragePerDay: toNumber(payload?.summary?.previousAveragePerDay ?? 0),
      averagePerWeek: toNumber(payload?.summary?.averagePerWeek ?? 0),
      previousAveragePerWeek: toNumber(payload?.summary?.previousAveragePerWeek ?? 0),
    }
  }, [reportQuery.data])

  const donutData = React.useMemo(() => report.series.filter((entry) => entry.total > 0), [report.series])
  const pieData = React.useMemo(() => donutData.map((entry) => ({ label: entry.label, value: entry.total, color: entry.color })), [donutData])
  const insightCards = React.useMemo(
    () => [
      {
        label: "Total",
        value: report.total,
        previousValue: report.previousTotal,
      },
      {
        label: "Avg / day",
        value: report.averagePerDay,
        previousValue: report.previousAveragePerDay,
      },
      {
        label: "Avg / week",
        value: report.averagePerWeek,
        previousValue: report.previousAveragePerWeek,
      },
    ],
    [report.averagePerDay, report.averagePerWeek, report.previousAveragePerDay, report.previousAveragePerWeek, report.previousTotal, report.total]
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0 flex-1">
          <SharedDateRangeToolbar />
        </div>
        <div className="flex flex-wrap items-center gap-3 xl:flex-nowrap xl:justify-end">
          <label
            className={
              isGroupTripsDisabled
                ? "flex min-w-[100px] items-center gap-2 font-mono text-[11px] tracking-[0.12em] whitespace-nowrap text-muted-foreground uppercase opacity-55"
                : "flex min-w-[100px] items-center gap-2 font-mono text-[11px] tracking-[0.12em] whitespace-nowrap text-muted-foreground uppercase"
            }
          >
            <Switch checked={groupTripsAsCategory} onCheckedChange={setGroupTripsAsCategory} disabled={isGroupTripsDisabled} />
            Group Trips
          </label>
          <ToggleGroup
            value={[mode]}
            onValueChange={(values) => {
              const nextMode = values[0] as typeof mode | undefined
              if (nextMode) {
                setMode(nextMode)
              }
            }}
            variant="outline"
            size="sm"
          >
            <ToggleGroupItem value="Expense">Expenses</ToggleGroupItem>
            <ToggleGroupItem value="Income">Income</ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {reportQuery.isError && !reportQuery.data ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load category analytics</AlertTitle>
          <AlertDescription>{getApiErrorMessage(reportQuery.error, "Try another date range.")}</AlertDescription>
        </Alert>
      ) : reportQuery.isPending ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(280px,0.72fr)_minmax(0,1.6fr)] xl:grid-rows-[auto_minmax(0,1fr)]">
          <CardSkeleton className="h-[640px] xl:row-span-2" />
          <MetricCardsSkeleton count={3} className="sm:grid-cols-1 md:grid-cols-3" />
          <CardSkeleton className="h-[420px]" />
        </div>
      ) : report.series.length === 0 ? (
        <EmptyState
          eyebrow="Report"
          title="No category activity in this range"
          description="Once transactions land inside the selected period, category breakdowns will show up here."
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(280px,0.72fr)_minmax(0,1.6fr)] xl:grid-rows-[auto_minmax(0,1fr)]">
          <Card size="sm" className="xl:row-span-2">
            <CardHeader>
              <CardTitle>Category mix</CardTitle>
              <CardDescription>{report.series.length} categories in active range</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="flex justify-center py-1">
                <PieChart data={pieData} size={216} innerRadius={66} cornerRadius={3} padAngle={0.025} hoverOffset={8}>
                  {pieData.map((slice, index) => (
                    <PieSlice key={donutData[index]!.key} index={index} color={slice.color} />
                  ))}
                  <PieCenter
                    defaultLabel={mode === "Expense" ? "Spent" : "Earned"}
                    formatOptions={{ notation: "compact", style: "currency", currency: report.baseCurrency, maximumFractionDigits: 1 }}
                    valueClassName="font-bold tabular-nums leading-none text-[clamp(0.65rem,16cqw,1.3rem)] text-foreground"
                    labelClassName="mt-0.5 max-w-full truncate leading-tight text-[clamp(0.6rem,8cqw,0.7rem)] text-muted-foreground"
                  />
                </PieChart>
              </div>

              <div className="grid gap-3">
                {report.series.map((entry) => {
                  const iconToken = categoryIconById.get(entry.key)
                  return (
                    <div key={entry.key} className="grid gap-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          {iconToken ? (
                            <CategoryIconBadge icon={iconToken} color={entry.color} className="size-5 rounded-md" iconClassName="size-3" />
                          ) : (
                            <span className="size-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                          )}
                          <span className="truncate font-mono text-[12px] font-medium tracking-[0.04em] text-foreground">{entry.label}</span>
                        </div>
                        <span className="font-mono text-[12px] tracking-[0.04em] text-muted-foreground">
                          {formatCurrency(entry.total, report.baseCurrency)}
                        </span>
                      </div>
                      <Progress value={entry.percent} className="h-1" />
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-3 md:grid-cols-3">
            {insightCards.map((item) => (
              <CategoryInsightCard
                key={item.label}
                label={item.label}
                value={formatCurrency(item.value, report.baseCurrency)}
                currentValue={item.value}
                previousValue={item.previousValue}
                currency={report.baseCurrency}
                mode={mode}
              />
            ))}
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <CardTitle>{mode === "Expense" ? "Expenses" : "Income"} by category</CardTitle>
                  <CardDescription>Stacked over the selected aggregation interval.</CardDescription>
                </div>
                <div className="flex items-center gap-3 lg:justify-end">
                  <IntervalSelect value={aggregation} onValueChange={setAggregation} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ComposedChart
                data={report.data}
                xDataKey="date"
                stacked
                aspectRatio=""
                className="h-[360px] w-full"
                margin={{ top: 16, right: 16, bottom: 28, left: 44 }}
              >
                <Grid />
                <XAxis />
                <YAxis formatValue={(value) => formatCompactNumber(value)} />
                <ChartTooltip
                  rows={(point) =>
                    report.series
                      .filter((series) => toNumber(point[series.key] as number) > 0)
                      .map((series) => ({
                        color: series.color,
                        label: series.label,
                        value: formatCurrency(point[series.key] as number, report.baseCurrency),
                      }))
                  }
                />
                {report.series.map((series) => (
                  <SeriesBar key={series.key} dataKey={series.key} fill={series.color} radius={0} />
                ))}
              </ComposedChart>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

function CategoryInsightCard({
  label,
  value,
  currentValue,
  previousValue,
  currency,
  mode,
}: {
  label: string
  value: string
  currentValue: number
  previousValue: number
  currency: string
  mode: "Expense" | "Income"
}) {
  const delta = currentValue - previousValue
  const hasBaseline = previousValue !== 0
  const deltaPercent = hasBaseline ? (delta / Math.abs(previousValue)) * 100 : null
  const isBetter = mode === "Expense" ? delta <= 0 : delta >= 0

  return (
    <MetricCard
      label={label}
      value={value}
      badge={<TrendBadge delta={delta} isBetter={isBetter} label={formatTrendLabel(deltaPercent)} />}
      footer={
        <>
          <span>Prev</span>
          <span className="font-mono tabular-nums">{formatCurrency(previousValue, currency)}</span>
        </>
      }
    />
  )
}
