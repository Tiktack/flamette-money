import * as React from "react"

import { createFileRoute } from "@tanstack/react-router"
import { ChartUpIcon, CreditCardIcon, Wallet01Icon } from "@hugeicons/core-free-icons"

import { MetricCard } from "@/components/metric-card"
import { IntervalSelect } from "@/components/interval-select"
import { CardSkeleton, MetricCardsSkeleton } from "@/components/page-skeletons"
import { SharedDateRangeToolbar } from "@/components/shared-date-range-toolbar"
import { TrendBadge, formatTrendLabel } from "@/components/trend-badge"
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/empty-state"
import { usePortfolioBalanceSeriesReport } from "@/features/reports/hooks"
import { useSettings } from "@/features/settings/hooks"
import { getApiErrorMessage } from "@/features/shared/errors"
import { formatCurrency, toNumber } from "@/lib/finance"
import { useSharedDateRangeQuery } from "@/lib/state/sharedDateRangeFilters"

const BALANCE_COLOR = "var(--chart-2)"

export const Route = createFileRoute("/_protected/analytics/portfolio")({
  head: () => ({ meta: [{ title: "Portfolio — Flamette Money" }] }),
  component: AnalyticsPortfolioPage,
})

function AnalyticsPortfolioPage() {
  const [reportInterval, setReportInterval] = React.useState<"Auto" | "Day" | "Week" | "Month">("Auto")
  const settingsQuery = useSettings()
  const baseCurrency = settingsQuery.data?.baseCurrency ?? "USD"
  const dateRangeQuery = useSharedDateRangeQuery()

  const query = React.useMemo(
    () => ({ ...dateRangeQuery, Interval: reportInterval, BaseCurrency: baseCurrency }),
    [baseCurrency, dateRangeQuery, reportInterval]
  )

  // Wait for the user's settings so the report is not fired with the "USD"
  // fallback first and refetched once the real base currency arrives.
  const reportQuery = usePortfolioBalanceSeriesReport(query, { enabled: Boolean(settingsQuery.data) })
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
    () =>
      buildTripMarkers(
        tripsQuery.data ?? [],
        chartData.map((point) => point.date)
      ),
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

      {reportQuery.isError && !reportQuery.data ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load the balance report</AlertTitle>
          <AlertDescription>{getApiErrorMessage(reportQuery.error, "Try a different range or interval.")}</AlertDescription>
        </Alert>
      ) : reportQuery.isPending ? (
        <>
          <MetricCardsSkeleton count={3} className="gap-3 sm:grid-cols-1 lg:grid-cols-3" />
          <CardSkeleton className="h-[460px]" />
        </>
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
              badge={<TrendBadge delta={delta} isBetter={delta > 0} label={formatTrendLabel(deltaPercent)} />}
            />
            <MetricCard
              label="Peak balance"
              value={peakBalance}
              icon={ChartUpIcon}
              iconBgClassName="bg-amber-500/10 dark:bg-amber-500/15"
              iconColorClassName="text-amber-600 dark:text-amber-400"
            />
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Portfolio balance trend</CardTitle>
                  <CardDescription>Track total balances over time in {resolvedBaseCurrency} across the selected range.</CardDescription>
                </div>
                <IntervalSelect value={reportInterval} onValueChange={setReportInterval} />
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
