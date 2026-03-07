import * as React from "react"

import { createFileRoute } from "@tanstack/react-router"
import { ArrowDown01Icon, ArrowUp01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis } from "recharts"

import { EmptyState } from "@/components/empty-state"
import { SharedDateRangeToolbar } from "@/components/shared-date-range-toolbar"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { getApiErrorMessage } from "@/lib/api/errors"
import { useCategorySeriesReport } from "@/lib/api/hooks"
import { formatCurrency, normalizeHexColor, toNumber } from "@/lib/finance"
import { resolveSharedDateRange, useSharedDateRangeFilters } from "@/lib/state/sharedDateRangeFilters"

export const Route = createFileRoute("/analytics/categories")({
  component: AnalyticsCategoriesPage,
})

function AnalyticsCategoriesPage() {
  const [mode, setMode] = React.useState<"Expense" | "Income">("Expense")
  const [aggregation, setAggregation] = React.useState<"Auto" | "Day" | "Week" | "Month">("Auto")
  const [groupTripsAsCategory, setGroupTripsAsCategory] = React.useState(false)
  const isGroupTripsDisabled = mode !== "Expense"
  const dateFilters = useSharedDateRangeFilters()
  const resolvedDateRange = React.useMemo(() => resolveSharedDateRange(dateFilters), [dateFilters])

  const query = React.useMemo(() => {
    const value: {
      StartDate?: string
      EndDate?: string
      Type: "Expense" | "Income"
      Interval: "Auto" | "Day" | "Week" | "Month"
      GroupTripsAsCategory?: boolean
    } = {
      Type: mode,
      Interval: aggregation,
    }

    if (mode === "Expense") {
      value.GroupTripsAsCategory = groupTripsAsCategory
    }

    if (resolvedDateRange.start) {
      value.StartDate = resolvedDateRange.start.toISOString()
    }

    if (resolvedDateRange.end) {
      value.EndDate = resolvedDateRange.end.toISOString()
    }

    return value
  }, [aggregation, groupTripsAsCategory, mode, resolvedDateRange.end, resolvedDateRange.start])

  const reportQuery = useCategorySeriesReport(query)
  const report = React.useMemo(() => {
    const payload = reportQuery.data
    const series = (payload?.series ?? []).map((entry) => ({
      key: entry.key,
      label: entry.label,
      color: normalizeHexColor(entry.color),
      total: toNumber(entry.total),
      percent: toNumber(entry.percentageOfMax),
    }))

    const data = (payload?.data ?? []).map((point) => {
      const row: Record<string, number | string> = { period: point.bucketLabel }
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

  const chartConfig = React.useMemo(
    () =>
      report.series.reduce<ChartConfig>((config, entry) => {
        config[entry.key] = { label: entry.label, color: entry.color }
        return config
      }, {}),
    [report.series],
  )

  const donutData = report.series.filter((entry) => entry.total > 0)
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
    [
      report.averagePerDay,
      report.averagePerWeek,
      report.previousAveragePerDay,
      report.previousAveragePerWeek,
      report.previousTotal,
      report.total,
    ],
  )

  return (
    <div className="flex flex-col gap-6">
      <SharedDateRangeToolbar />

      {reportQuery.isError && report.series.length === 0 ? (
        <EmptyState
          eyebrow="Report"
          title="Unable to load category analytics"
          description={getApiErrorMessage(reportQuery.error, "Try another date range.")}
        />
      ) : reportQuery.isPending ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(280px,0.72fr)_minmax(0,1.6fr)] xl:grid-rows-[auto_minmax(0,1fr)]">
          <div className="h-[640px] animate-pulse rounded-[1.75rem] bg-muted xl:row-span-2" />
          <div className="grid gap-4 md:grid-cols-3">
            <div className="h-[120px] animate-pulse rounded-[1.5rem] bg-muted" />
            <div className="h-[120px] animate-pulse rounded-[1.5rem] bg-muted" />
            <div className="h-[120px] animate-pulse rounded-[1.5rem] bg-muted" />
          </div>
          <div className="h-[420px] animate-pulse rounded-[1.75rem] bg-muted" />
        </div>
      ) : report.series.length === 0 ? (
        <EmptyState
          eyebrow="Report"
          title="No category activity in this range"
          description="Once transactions land inside the selected period, category breakdowns will show up here."
        />
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(280px,0.72fr)_minmax(0,1.6fr)] xl:grid-rows-[auto_minmax(0,1fr)]">
          <Card size="sm" className="border-border/60 bg-card/80 shadow-sm xl:row-span-2">
            <CardHeader className="px-4 pt-4 pb-2">
              <CardTitle>Category mix</CardTitle>
              <CardDescription>{report.series.length} categories in active range</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 px-4 pb-4 pt-0">
              <ChartContainer className="mx-auto h-[220px] w-full max-w-[280px]" config={chartConfig}>
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Pie data={donutData} dataKey="total" nameKey="label" innerRadius={60} outerRadius={92} strokeWidth={0}>
                    {donutData.map((entry) => (
                      <Cell key={entry.key} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>

              <div className="grid gap-3">
                {report.series.map((entry) => (
                  <div key={entry.key} className="grid gap-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="size-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="text-sm font-medium text-foreground">{entry.label}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{formatCurrency(entry.total, report.baseCurrency)}</span>
                    </div>
                    <Progress value={entry.percent} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            {insightCards.map((item) => (
              <MetricCard
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

          <Card className="border-border/60 bg-card/80 shadow-sm">
            <CardHeader className="px-4 pt-4 pb-2">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <CardTitle>{mode === "Expense" ? "Expenses" : "Income"} by category</CardTitle>
                  <CardDescription>Stacked over the selected aggregation interval.</CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-3 lg:justify-end">
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
                  <label
                    className={isGroupTripsDisabled
                      ? "flex min-w-[100px] items-center gap-2 whitespace-nowrap text-sm text-muted-foreground opacity-55"
                      : "flex min-w-[100px] items-center gap-2 whitespace-nowrap text-sm text-muted-foreground"
                    }
                  >
                    <Switch
                      checked={groupTripsAsCategory}
                      onCheckedChange={setGroupTripsAsCategory}
                      disabled={isGroupTripsDisabled}
                    />
                    Group Trips
                  </label>
                  <Select value={aggregation} onValueChange={(value) => setAggregation((value as typeof aggregation) ?? "Auto")}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Auto" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {(["Auto", "Day", "Week", "Month"] as const).map((value) => (
                          <SelectItem key={value} value={value}>
                            {value}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <ChartContainer className="h-[360px] w-full" config={chartConfig}>
                <BarChart data={report.data} margin={{ left: 8, right: 8, top: 12 }} >
                  <CartesianGrid vertical={false} />
                  <XAxis axisLine={false} dataKey="period" tickLine={false} />
                  <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                  {report.series.map((series) => (
                    <Bar key={series.key} dataKey={series.key} stackId="categories" fill={`var(--color-${series.key})`} radius={[0, 0, 0, 0]}  />
                  ))}
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

function MetricCard({
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
  const isNeutral = delta === 0
  const trendClassName = isNeutral
    ? "border-border/70 bg-muted/60 text-muted-foreground"
    : isBetter
      ? "border-emerald-200/80 bg-emerald-500/10 text-emerald-700 dark:border-emerald-900 dark:text-emerald-300"
      : "border-rose-200/80 bg-rose-500/10 text-rose-700 dark:border-rose-900 dark:text-rose-300"
  const trendIcon = isNeutral ? null : delta > 0 ? ArrowUp01Icon : ArrowDown01Icon
  const trendLabel = isNeutral
    ? "Flat"
    : `${deltaPercent && deltaPercent > 0 ? "+" : ""}${deltaPercent?.toFixed(1) ?? "0.0"}%`

  return (
    <Card className="border-border/60 bg-card/80 shadow-sm">
      <CardContent className="space-y-2 p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="mt-1 text-[1.9rem] font-semibold tracking-tight text-foreground">{value}</p>
          </div>
          <div className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${trendClassName}`}>
            {trendIcon ? <HugeiconsIcon icon={trendIcon} strokeWidth={2} className="size-3.5" /> : null}
            <span>{trendLabel}</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Prev {formatCurrency(previousValue, currency)}
        </p>
      </CardContent>
    </Card>
  )
}