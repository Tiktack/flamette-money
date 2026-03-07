import * as React from "react"

import { createFileRoute } from "@tanstack/react-router"
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
      averagePerWeek: toNumber(payload?.summary?.averagePerWeek ?? 0),
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
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.9fr)]">
          <div className="h-[420px] animate-pulse rounded-[1.75rem] bg-muted" />
          <div className="h-[420px] animate-pulse rounded-[1.75rem] bg-muted" />
        </div>
      ) : report.series.length === 0 ? (
        <EmptyState
          eyebrow="Report"
          title="No category activity in this range"
          description="Once transactions land inside the selected period, category breakdowns will show up here."
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard label="Total" value={formatCurrency(report.total, report.baseCurrency)} helper="Current selected range" />
            <MetricCard label="Avg / day" value={formatCurrency(report.averagePerDay, report.baseCurrency)} helper="Based on active range width" />
            <MetricCard label="Avg / week" value={formatCurrency(report.averagePerWeek, report.baseCurrency)} helper="Smoothed weekly spend or income" />
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.9fr)]">
            <Card className="border-border/60 bg-card/80 shadow-sm">
              <CardHeader>
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="min-w-0">
                    <CardTitle>{mode === "Expense" ? "Expenses" : "Income"} by category</CardTitle>
                    <CardDescription>Stacked over the selected aggregation interval.</CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 xl:justify-end">
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
              <CardContent>
                <ChartContainer className="h-[360px] w-full" config={chartConfig}>
                  <BarChart data={report.data} margin={{ left: 8, right: 8, top: 12 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis axisLine={false} dataKey="period" tickLine={false} />
                    <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                    {report.series.map((series) => (
                      <Bar key={series.key} dataKey={series.key} stackId="categories" fill={`var(--color-${series.key})`} radius={[6, 6, 0, 0]} />
                    ))}
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/80 shadow-sm">
              <CardHeader>
                <CardTitle>Category mix</CardTitle>
                <CardDescription>{report.series.length} categories in active range</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6">
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

                <div className="grid gap-4">
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
          </div>
        </>
      )}
    </div>
  )
}

function MetricCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <Card className="border-border/60 bg-card/80 shadow-sm">
      <CardContent className="space-y-2 p-5">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold tracking-tight text-foreground">{value}</p>
        <p className="text-xs leading-5 text-muted-foreground">{helper}</p>
      </CardContent>
    </Card>
  )
}