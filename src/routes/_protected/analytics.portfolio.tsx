import * as React from "react"

import { createFileRoute } from "@tanstack/react-router"
import { Area, AreaChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts"

import { SharedDateRangeToolbar } from "@/components/shared-date-range-toolbar"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { computeNiceDomainTicks, formatCompactNumber, formatTimeSeriesAxisLabel } from "@/lib/chart-utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EmptyState } from "@/components/empty-state"
import { useCurrentUser } from "@/features/app/hooks"
import { usePortfolioBalanceSeriesReport } from "@/features/reports/hooks"
import { getApiErrorMessage } from "@/features/shared/errors"
import { formatCurrency, toNumber } from "@/lib/finance"
import { resolveSharedDateRange, toApiDateString, useSharedDateRangeFilters } from "@/lib/state/sharedDateRangeFilters"

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
  const today = React.useMemo(() => new Date(), [])
  const todayStart = React.useMemo(() => new Date(today.getFullYear(), today.getMonth(), today.getDate()), [today])
  const todayEnd = React.useMemo(() => new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999), [today])
  const chartPresentation = React.useMemo(() => {
    const points = reportQuery.data?.points ?? []
    const startDate = reportQuery.data?.startDate ? new Date(reportQuery.data.startDate) : null
    const endDate = reportQuery.data?.endDate ? new Date(reportQuery.data.endDate) : null
    const reportInterval = reportQuery.data?.interval

    let currentBucketIndex = -1

    const hasProjection = startDate !== null && endDate !== null && startDate.getTime() <= todayEnd.getTime() && endDate.getTime() > todayEnd.getTime()

    const tickLabels = new Map<string, string>()
    const data = points.map((point, index) => {
      const bucketEnd = new Date(point.bucketDate)
      const bucketStart = index === 0 ? (startDate ?? bucketEnd) : new Date(new Date(points[index - 1]!.bucketDate).getTime() + 1)
      const rawBalance = toNumber(point.totalBalance)
      const tickLabel = formatTimeSeriesAxisLabel({
        interval: reportInterval,
        rangeStart: startDate,
        rangeEnd: endDate,
        bucketStart,
      })

      if (currentBucketIndex === -1 && bucketStart.getTime() <= todayEnd.getTime() && bucketEnd.getTime() >= todayStart.getTime()) {
        currentBucketIndex = index
      }

      tickLabels.set(point.bucketLabel, tickLabel)

      return {
        period: point.bucketLabel,
        balance: hasProjection && currentBucketIndex >= 0 && index > currentBucketIndex ? null : rawBalance,
        rawBalance,
      }
    })

    return {
      data,
      hasProjection: hasProjection && currentBucketIndex >= 0 && currentBucketIndex < points.length - 1,
      currentBucketIndex,
      tickLabels,
    }
  }, [reportQuery.data?.endDate, reportQuery.data?.interval, reportQuery.data?.points, reportQuery.data?.startDate, todayStart, todayEnd])
  const chartData = chartPresentation.data
  const projectionSegment = React.useMemo(() => {
    if (!chartPresentation.hasProjection || chartPresentation.currentBucketIndex < 0 || chartData.length < 2) {
      return null
    }

    const lastActualPoint = chartData[chartPresentation.currentBucketIndex]
    const lastPoint = chartData[chartData.length - 1]

    if (!lastActualPoint || !lastPoint) {
      return null
    }

    return [
      { x: lastActualPoint.period, y: lastActualPoint.rawBalance },
      { x: lastPoint.period, y: lastActualPoint.rawBalance },
    ] as const
  }, [chartData, chartPresentation.hasProjection, chartPresentation.currentBucketIndex])

  const yAxisConfig = React.useMemo(() => {
    const values = chartData.map((d) => d.rawBalance).filter((v) => typeof v === "number" && isFinite(v))
    const { domain, ticks } = computeNiceDomainTicks(values, {
      tickCount: 4,
      paddingFraction: 0.08,
    })
    return { domain, ticks }
  }, [chartData])

  const chartConfig: ChartConfig = {
    balance: {
      label: `Balance (${resolvedBaseCurrency})`,
      color: "var(--chart-2)",
    },
  }

  return (
    <div className="flex flex-col gap-6">
      <SharedDateRangeToolbar />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.9fr)]">
        <Card className="border-border/60 bg-card/80 shadow-sm">
          <CardHeader className="gap-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <CardTitle>Portfolio balance trend</CardTitle>
                <CardDescription>Track total balances over time in your selected base currency.</CardDescription>
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
            {reportQuery.isPending ? (
              <div className="h-[360px] animate-pulse rounded-2xl bg-muted" />
            ) : reportQuery.isError ? (
              <EmptyState
                eyebrow="Report"
                title="Unable to load the balance report"
                description={getApiErrorMessage(reportQuery.error, "Try a different range or interval.")}
              />
            ) : chartData.length === 0 ? (
              <EmptyState
                eyebrow="Report"
                title="No portfolio data in this range"
                description="Adjust the active time window to inspect a wider portion of your account history."
              />
            ) : (
              <ChartContainer className="h-[360px] w-full" config={chartConfig}>
                <AreaChart data={chartData} margin={{ left: 8, right: 8, top: 12 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    axisLine={false}
                    dataKey="period"
                    tickFormatter={(value) => chartPresentation.tickLabels.get(String(value)) ?? String(value)}
                    tickLine={false}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    domain={yAxisConfig.domain}
                    ticks={yAxisConfig.ticks}
                    tickFormatter={(v) => formatCompactNumber(Number(v ?? 0))}
                  />
                  <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                  {projectionSegment ? (
                    <ReferenceLine ifOverflow="extendDomain" segment={projectionSegment} stroke="var(--color-balance)" strokeDasharray="4 4" strokeWidth={2} />
                  ) : null}
                  <Area dataKey="balance" fill="var(--color-balance)" fillOpacity={0.18} stroke="var(--color-balance)" type="linear" />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 self-start">
          <SummaryCard label="Base currency" value={resolvedBaseCurrency} helper="Applied to the entire time series" />
          <SummaryCard
            label="Start balance"
            value={formatCurrency(reportQuery.data?.summary.startBalance, resolvedBaseCurrency)}
            helper="Balance at the beginning of the selected range"
          />
          <SummaryCard
            label="End balance"
            value={formatCurrency(reportQuery.data?.summary.endBalance, resolvedBaseCurrency)}
            helper="Latest known portfolio balance in range"
          />
          <SummaryCard
            label="Delta"
            value={formatCurrency(reportQuery.data?.summary.delta, resolvedBaseCurrency)}
            helper={`${toNumber(reportQuery.data?.summary.deltaPercent).toFixed(2)}% change across the selected period`}
          />
        </div>
      </div>
    </div>
  )
}

function SummaryCard({ label, value, helper }: { label: string; value: string; helper: string }) {
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
