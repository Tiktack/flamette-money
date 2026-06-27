import * as React from "react"

import { createFileRoute } from "@tanstack/react-router"
import { ArrowDown01Icon, ArrowUp01Icon, ChartUpIcon, CreditCardIcon, Wallet01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { MetricCard } from "@/components/metric-card"
import { SharedDateRangeToolbar } from "@/components/shared-date-range-toolbar"
import { AreaChart, Area } from "@/components/charts/area-chart"
import { Grid } from "@/components/charts/grid"
import { XAxis } from "@/components/charts/x-axis"
import { YAxis } from "@/components/charts/y-axis"
import { ChartTooltip } from "@/components/charts/tooltip"
import { ProjectionLine } from "@/components/charts/projection-line"
import { ChartMarkers } from "@/components/charts/markers"
import { ChartTripMarkerTooltip } from "@/components/chart-trip-marker-tooltip"
import { useTrips } from "@/features/trips/hooks"
import { buildTripMarkers, formatCompactNumber } from "@/lib/chart-utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EmptyState } from "@/components/empty-state"
import { useCurrentUser } from "@/features/app/hooks"
import { usePortfolioBalanceSeriesReport } from "@/features/reports/hooks"
import { getApiErrorMessage } from "@/features/shared/errors"
import { formatCurrency, toNumber } from "@/lib/finance"
import { resolveSharedDateRange, toApiDateString, useSharedDateRangeFilters } from "@/lib/state/sharedDateRangeFilters"

const BALANCE_COLOR = "var(--chart-2)"

export const Route = createFileRoute("/_protected/analytics/portfolio")({
  component: AnalyticsPortfolioPage,
})

function AnalyticsPortfolioPage() {
  const [interval, setInterval] = React.useState<"Auto" | "Day" | "Week" | "Month">("Auto")
  const currentUserQuery = useCurrentUser()
  const baseCurrency = currentUserQuery.data?.baseCurrency ?? "USD"
  const dateFilters = useSharedDateRangeFilters()
  const resolvedDateRange = React.useMemo(() => resolveSharedDateRange(dateFilters), [dateFilters])

  const query = React.useMemo(() => {
    const value: {
      StartDate?: string
      EndDate?: string
      Interval: "Auto" | "Day" | "Week" | "Month"
      BaseCurrency: string
    } = {
      Interval: interval,
      BaseCurrency: baseCurrency,
    }

    if (resolvedDateRange.start) {
      value.StartDate = toApiDateString(resolvedDateRange.start)
    }

    if (resolvedDateRange.end) {
      value.EndDate = toApiDateString(resolvedDateRange.end)
    }

    return value
  }, [baseCurrency, interval, resolvedDateRange.end, resolvedDateRange.start])

  const reportQuery = usePortfolioBalanceSeriesReport(query)
  const resolvedBaseCurrency = reportQuery.data?.baseCurrency ?? baseCurrency
  const points = reportQuery.data?.points

  // Real balances up to today; the remaining buckets hold the last known balance
  // flat and render as a dashed projection tail.
  const chartPresentation = React.useMemo(() => {
    const series = points ?? []
    const today = Date.now()
    let lastActualIndex = -1
    series.forEach((point, index) => {
      if (new Date(point.bucketDate).getTime() <= today) {
        lastActualIndex = index
      }
    })

    const hasProjection = lastActualIndex >= 0 && lastActualIndex < series.length - 1
    const lastIndex = hasProjection ? lastActualIndex : series.length - 1

    // The area shows only actual balances; the future is drawn as a flat dashed
    // projection line that holds the last known balance to the end of the range.
    const data = series.slice(0, lastIndex + 1).map((point) => ({
      date: new Date(point.bucketDate),
      balance: toNumber(point.totalBalance),
    }))

    let projection: Array<{ date: Date; value: number }> | null = null
    if (hasProjection) {
      const anchor = series[lastActualIndex]!
      const horizon = series[series.length - 1]!
      const anchorBalance = toNumber(anchor.totalBalance)
      projection = [
        { date: new Date(anchor.bucketDate), value: anchorBalance },
        { date: new Date(horizon.bucketDate), value: anchorBalance },
      ]
    }

    return { data, projection }
  }, [points])

  const chartData = chartPresentation.data
  const tripsQuery = useTrips()
  const tripMarkers = React.useMemo(
    () => buildTripMarkers(tripsQuery.data ?? [], chartData.map((point) => point.date)),
    [tripsQuery.data, chartData]
  )
  const summary = reportQuery.data?.summary
  const startBalance = formatCurrency(summary?.startBalance, resolvedBaseCurrency)
  const endBalance = formatCurrency(summary?.endBalance, resolvedBaseCurrency)
  const delta = toNumber(summary?.delta)
  const deltaPercent = toNumber(summary?.deltaPercent)
  const peakBalance = React.useMemo(() => {
    const series = points ?? []

    if (series.length === 0) {
      return formatCurrency(0, resolvedBaseCurrency)
    }

    const peakPoint = series.reduce((currentPeak, point) => (toNumber(point.totalBalance) > toNumber(currentPeak.totalBalance) ? point : currentPeak))
    return formatCurrency(peakPoint.totalBalance, resolvedBaseCurrency)
  }, [points, resolvedBaseCurrency])

  return (
    <div className="flex flex-col gap-6">
      <SharedDateRangeToolbar />

      {reportQuery.isPending ? (
        <>
          <div className="grid gap-3 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-[98px] animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
          <div className="h-[460px] animate-pulse rounded-xl bg-muted" />
        </>
      ) : reportQuery.isError ? (
        <EmptyState eyebrow="Report" title="Unable to load the balance report" description={getApiErrorMessage(reportQuery.error, "Try a different range or interval.")} />
      ) : chartData.length === 0 ? (
        <EmptyState
          eyebrow="Report"
          title="No portfolio data in this range"
          description="Adjust the active time window to inspect a wider portion of your account history."
        />
      ) : (
        <>
          <div className="grid gap-3 lg:grid-cols-3">
            <MetricCard
              label="Start balance"
              value={startBalance}
              icon={Wallet01Icon}
              iconBgClassName="bg-blue-500/10 dark:bg-blue-400/15"
              iconColorClassName="text-blue-600 dark:text-blue-400"
            />
            <MetricCard
              label="End balance"
              value={endBalance}
              icon={CreditCardIcon}
              iconBgClassName="bg-emerald-500/10 dark:bg-emerald-500/15"
              iconColorClassName="text-emerald-600 dark:text-emerald-400"
              badge={<PortfolioTrendBadge delta={delta} deltaPercent={deltaPercent} />}
            />
            <MetricCard
              label="Peak balance"
              value={peakBalance}
              icon={ChartUpIcon}
              iconBgClassName="bg-amber-500/10 dark:bg-amber-500/15"
              iconColorClassName="text-amber-600 dark:text-amber-400"
            />
          </div>

          <Card className="border-border bg-card/95 shadow-none">
            <CardHeader className="gap-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <CardTitle>Portfolio balance trend</CardTitle>
                  <CardDescription>Track total balances over time in {resolvedBaseCurrency} across the selected range.</CardDescription>
                </div>
                <div className="flex min-w-36 flex-col gap-2">
                  <span className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">Interval</span>
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
            </CardHeader>
            <CardContent>
              <AreaChart data={chartData} xDataKey="date" aspectRatio="" className="h-[360px] w-full" margin={{ top: 40, right: 16, bottom: 28, left: 48 }}>
                <Grid />
                <XAxis />
                <YAxis formatValue={(value) => formatCompactNumber(value)} />
                <ChartTooltip
                  rows={(point) => [
                    {
                      color: BALANCE_COLOR,
                      label: `Balance (${resolvedBaseCurrency})`,
                      value: formatCurrency(point.balance as number, resolvedBaseCurrency),
                    },
                  ]}
                >
                  <ChartTripMarkerTooltip markers={tripMarkers} />
                </ChartTooltip>
                <Area dataKey="balance" fill={BALANCE_COLOR} fillOpacity={0.2} stroke={BALANCE_COLOR} />
                {chartPresentation.projection ? (
                  <ProjectionLine data={chartPresentation.projection} stroke={BALANCE_COLOR} strokeDasharray="4 4" showEndMarker={false} />
                ) : null}
                <ChartMarkers items={tripMarkers} />
              </AreaChart>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

function PortfolioTrendBadge({ delta, deltaPercent }: { delta: number; deltaPercent: number }) {
  const isNeutral = delta === 0
  const isPositive = delta > 0
  const icon = isNeutral ? null : isPositive ? ArrowUp01Icon : ArrowDown01Icon
  const className = isNeutral
    ? "border-border bg-muted/40 text-muted-foreground"
    : isPositive
      ? "border-emerald-500/20 bg-emerald-500/6 text-emerald-700 dark:text-emerald-300"
      : "border-rose-500/20 bg-rose-500/6 text-rose-700 dark:text-rose-300"
  const label = isNeutral ? "Flat" : `${deltaPercent > 0 ? "+" : ""}${deltaPercent.toFixed(1)}%`

  return (
    <div className={`inline-flex max-w-full shrink-0 items-center gap-1 rounded-md border px-2 py-1 font-mono text-[10px] leading-none font-medium tracking-[0.14em] uppercase ${className}`}>
      {icon ? <HugeiconsIcon icon={icon} strokeWidth={2} className="size-3.5" /> : null}
      <span>{label}</span>
    </div>
  )
}
