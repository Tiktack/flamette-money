import * as React from "react"

import { createFileRoute } from "@tanstack/react-router"
import { Bar, CartesianGrid, Cell, ComposedChart, Line, ReferenceLine, XAxis } from "recharts"

import { EmptyState } from "@/components/empty-state"
import { SharedDateRangeToolbar } from "@/components/shared-date-range-toolbar"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getApiErrorMessage } from "@/lib/api/errors"
import { useCashflowSeriesReport } from "@/lib/api/hooks"
import { formatCurrency, toNumber } from "@/lib/finance"
import { resolveSharedDateRange, useSharedDateRangeFilters } from "@/lib/state/sharedDateRangeFilters"

const POSITIVE_NET_COLOR = "#2f8f5b"
const NEGATIVE_NET_COLOR = "#cb5a5a"

export const Route = createFileRoute("/analytics/cashflow")({
  component: AnalyticsCashflowPage,
})

function AnalyticsCashflowPage() {
  const [interval, setInterval] = React.useState<"Auto" | "Day" | "Week" | "Month">("Auto")
  const dateFilters = useSharedDateRangeFilters()
  const resolvedDateRange = React.useMemo(() => resolveSharedDateRange(dateFilters), [dateFilters])

  const query = React.useMemo(() => {
    const value: {
      StartDate?: string
      EndDate?: string
      Interval: "Auto" | "Day" | "Week" | "Month"
    } = {
      Interval: interval,
    }

    if (resolvedDateRange.start) {
      value.StartDate = resolvedDateRange.start.toISOString()
    }

    if (resolvedDateRange.end) {
      value.EndDate = resolvedDateRange.end.toISOString()
    }

    return value
  }, [interval, resolvedDateRange.end, resolvedDateRange.start])

  const reportQuery = useCashflowSeriesReport(query)
  const report = reportQuery.data
  const baseCurrency = report?.baseCurrency ?? "USD"

  const chartData = React.useMemo(
    () =>
      (report?.data ?? []).map((point) => {
        const net = toNumber(point.net)

        return {
          period: point.bucketLabel,
          income: toNumber(point.income),
          spending: toNumber(point.spending),
          net,
          netFill: net >= 0 ? POSITIVE_NET_COLOR : NEGATIVE_NET_COLOR,
        }
      }),
    [report?.data],
  )

  const chartConfig: ChartConfig = {
    net: {
      label: "Net",
      color: POSITIVE_NET_COLOR,
    },
    income: {
      label: "Income",
      color: "#2d7ff9",
    },
    spending: {
      label: "Spending",
      color: "#f08c44",
    },
  }

  const summary = report?.summary

  const metrics = React.useMemo(
    () => [
      {
        label: "Income",
        value: summary?.income.total,
        previousValue: summary?.income.previousTotal,
        helper: `${formatCurrency(summary?.income.averagePerDay, baseCurrency)} per day`,
      },
      {
        label: "Spending",
        value: summary?.spending.total,
        previousValue: summary?.spending.previousTotal,
        helper: `${formatCurrency(summary?.spending.averagePerDay, baseCurrency)} per day`,
      },
      {
        label: "Net",
        value: summary?.net.total,
        previousValue: summary?.net.previousTotal,
        helper: `${formatCurrency(summary?.net.averagePerDay, baseCurrency)} per day`,
      },
      {
        label: "Savings rate",
        value: `${formatPercent(summary?.savingsRate)}%`,
        previousValue: summary?.previousSavingsRate,
        helper: `Prev ${formatPercent(summary?.previousSavingsRate)}%`,
      },
    ],
    [
      baseCurrency,
      summary?.income.averagePerDay,
      summary?.income.previousTotal,
      summary?.income.total,
      summary?.net.averagePerDay,
      summary?.net.previousTotal,
      summary?.net.total,
      summary?.previousSavingsRate,
      summary?.savingsRate,
      summary?.spending.averagePerDay,
      summary?.spending.previousTotal,
      summary?.spending.total,
    ],
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0 flex-1">
          <SharedDateRangeToolbar />
        </div>
        <div className="flex min-w-36 flex-col gap-2 xl:w-[140px]">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Interval</span>
          <Select value={interval} onValueChange={(value) => setInterval((value as typeof interval) ?? "Auto")}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Interval" />
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

      {reportQuery.isError && chartData.length === 0 ? (
        <EmptyState
          eyebrow="Report"
          title="Unable to load cashflow analytics"
          description={getApiErrorMessage(reportQuery.error, "Try another date range or interval.")}
        />
      ) : reportQuery.isPending ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-[120px] animate-pulse rounded-[1.5rem] bg-muted" />
            ))}
          </div>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.9fr)]">
            <div className="h-[430px] animate-pulse rounded-[1.75rem] bg-muted" />
            <div className="grid gap-4">
              <div className="h-[220px] animate-pulse rounded-[1.5rem] bg-muted" />
              <div className="h-[220px] animate-pulse rounded-[1.5rem] bg-muted" />
            </div>
          </div>
        </>
      ) : chartData.length === 0 ? (
        <EmptyState
          eyebrow="Report"
          title="No cashflow data in this range"
          description="Once income and expense activity lands in the selected window, this page will map the balance between them."
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <MetricCard
                key={metric.label}
                label={metric.label}
                value={metric.label === "Savings rate" ? String(metric.value) : formatCurrency(metric.value, baseCurrency)}
                previousValue={metric.previousValue}
                helper={metric.helper}
                currency={metric.label === "Savings rate" ? null : baseCurrency}
                isPercent={metric.label === "Savings rate"}
              />
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.9fr)]">
            <Card className="border-border/60 bg-card/80 shadow-sm">
              <CardHeader className="gap-4">
                <div>
                  <CardTitle>Spending vs income</CardTitle>
                  <CardDescription>Lines track income and spending, while bars show the resulting profit or loss per period.</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <ChartContainer className="h-[380px] w-full" config={chartConfig}>
                  <ComposedChart data={chartData} margin={{ left: 8, right: 8, top: 12 }}>
                    <CartesianGrid vertical={false} />
                    <ReferenceLine stroke="hsl(var(--border))" strokeDasharray="4 4" y={0} />
                    <XAxis axisLine={false} dataKey="period" tickLine={false} />
                    <ChartTooltip
                      content={(
                        <ChartTooltipContent
                          formatter={(value, name) => (
                            <div className="flex min-w-[140px] items-center justify-between gap-3">
                              <span className="text-muted-foreground">{formatSeriesLabel(name)}</span>
                              <span className="font-mono font-medium text-foreground tabular-nums">
                                {formatCurrency(value as number | string, baseCurrency)}
                              </span>
                            </div>
                          )}
                          indicator="line"
                        />
                      )}
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="net" fill="var(--color-net)" radius={[7, 7, 0, 0]}>
                      {chartData.map((entry) => (
                        <Cell key={entry.period} fill={entry.netFill} />
                      ))}
                    </Bar>
                    <Line dataKey="income" dot={false} name="Income" stroke="var(--color-income)" strokeWidth={2.5} type="monotone" />
                    <Line dataKey="spending" dot={false} name="Spending" stroke="var(--color-spending)" strokeWidth={2.5} type="monotone" />
                  </ComposedChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <div className="grid gap-4 self-start">
              <ComparisonCard baseCurrency={baseCurrency} summary={summary} />
              <HighlightsCard baseCurrency={baseCurrency} summary={summary} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function MetricCard({
  label,
  value,
  previousValue,
  helper,
  currency,
  isPercent = false,
}: {
  label: string
  value: string
  previousValue: number | string | null | undefined
  helper: string
  currency: string | null
  isPercent?: boolean
}) {
  const delta = isPercent ? undefined : calculatePercentChange(value, previousValue, currency)

  return (
    <Card className="border-border/60 bg-card/80 shadow-sm">
      <CardContent className="space-y-2 p-5">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold tracking-tight text-foreground">{value}</p>
        <p className="text-xs leading-5 text-muted-foreground">{helper}</p>
        {!isPercent ? (
          <p className="text-xs leading-5 text-muted-foreground">{delta}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}

function ComparisonCard({
  baseCurrency,
  summary,
}: {
  baseCurrency: string
  summary: NonNullable<ReturnType<typeof useCashflowSeriesReport>["data"]>["summary"] | undefined
}) {
  const rows = [
    {
      label: "Income",
      current: summary?.income.total,
      previous: summary?.income.previousTotal,
    },
    {
      label: "Spending",
      current: summary?.spending.total,
      previous: summary?.spending.previousTotal,
    },
    {
      label: "Net",
      current: summary?.net.total,
      previous: summary?.net.previousTotal,
    },
  ]

  return (
    <Card className="border-border/60 bg-card/80 shadow-sm">
      <CardHeader className="px-5 pt-5 pb-2">
        <CardTitle>Period comparison</CardTitle>
        <CardDescription>Current range against the immediately preceding matched window.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 px-5 pb-5 pt-2">
        {rows.map((row) => (
          <div key={row.label} className="grid gap-1 border-b border-border/50 pb-3 last:border-b-0 last:pb-0">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-foreground">{row.label}</span>
              <span className="text-xs text-muted-foreground">{formatDeltaText(row.current, row.previous)}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
              <span>Current</span>
              <span className="font-medium text-foreground">{formatCurrency(row.current, baseCurrency)}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
              <span>Previous</span>
              <span>{formatCurrency(row.previous, baseCurrency)}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function HighlightsCard({
  baseCurrency,
  summary,
}: {
  baseCurrency: string
  summary: NonNullable<ReturnType<typeof useCashflowSeriesReport>["data"]>["summary"] | undefined
}) {
  return (
    <Card className="border-border/60 bg-card/80 shadow-sm">
      <CardHeader className="px-5 pt-5 pb-2">
        <CardTitle>Highlights</CardTitle>
        <CardDescription>Quick reads on the shape of the selected cashflow window.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 px-5 pb-5 pt-2">
        <HighlightRow
          label="Best period"
          value={summary?.bestBucket ? `${summary.bestBucket.bucketLabel} · ${formatCurrency(summary.bestBucket.net, baseCurrency)}` : "-"}
        />
        <HighlightRow
          label="Worst period"
          value={summary?.worstBucket ? `${summary.worstBucket.bucketLabel} · ${formatCurrency(summary.worstBucket.net, baseCurrency)}` : "-"}
        />
        <HighlightRow label="Positive buckets" value={String(toNumber(summary?.positiveBucketCount))} />
        <HighlightRow label="Negative buckets" value={String(toNumber(summary?.negativeBucketCount))} />
        <HighlightRow label="Tracked days" value={String(toNumber(summary?.dayCount))} />
        <HighlightRow label="Bucket count" value={String(toNumber(summary?.bucketCount))} />
      </CardContent>
    </Card>
  )
}

function HighlightRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  )
}

function calculatePercentChange(
  currentValue: string,
  previousValue: number | string | null | undefined,
  currency: string | null,
) {
  const current = toNumber(currency ? currentValue.replaceAll(/[^\d.-]/g, "") : currentValue)
  const previous = toNumber(previousValue)

  if (previous === 0) {
    return `Prev ${currency ? formatCurrency(previousValue, currency) : previous}`
  }

  const change = ((current - previous) / Math.abs(previous)) * 100
  const direction = change >= 0 ? "+" : ""

  return `Prev ${currency ? formatCurrency(previousValue, currency) : previous} · ${direction}${change.toFixed(1)}%`
}

function formatDeltaText(current: number | string | null | undefined, previous: number | string | null | undefined) {
  const currentValue = toNumber(current)
  const previousValue = toNumber(previous)

  if (previousValue === 0) {
    return currentValue === 0 ? "No change" : "No previous baseline"
  }

  const delta = ((currentValue - previousValue) / Math.abs(previousValue)) * 100
  const prefix = delta >= 0 ? "+" : ""
  return `${prefix}${delta.toFixed(1)}%`
}

function formatPercent(value: number | string | null | undefined) {
  return toNumber(value).toFixed(1)
}

function formatSeriesLabel(name: string | number) {
  if (name === "net") {
    return "Net"
  }

  if (name === "income") {
    return "Income"
  }

  if (name === "spending") {
    return "Spending"
  }

  return String(name)
}