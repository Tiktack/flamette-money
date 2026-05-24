import * as React from "react"

import { createFileRoute } from "@tanstack/react-router"
import { ArrowDown01Icon, ArrowUp01Icon, ChartUpIcon, CreditCardIcon, Wallet01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Area, AreaChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts"

import { MetricCard } from "@/components/metric-card"
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
  const summary = reportQuery.data?.summary
  const startBalance = formatCurrency(summary?.startBalance, resolvedBaseCurrency)
  const endBalance = formatCurrency(summary?.endBalance, resolvedBaseCurrency)
  const delta = toNumber(summary?.delta)
  const deltaPercent = toNumber(summary?.deltaPercent)
  const peakBalance = React.useMemo(() => {
    const points = reportQuery.data?.points ?? []

    if (points.length === 0) {
      return formatCurrency(0, resolvedBaseCurrency)
    }

    const peakPoint = points.reduce((currentPeak, point) => (toNumber(point.totalBalance) > toNumber(currentPeak.totalBalance) ? point : currentPeak))
    return formatCurrency(peakPoint.totalBalance, resolvedBaseCurrency)
  }, [reportQuery.data?.points, resolvedBaseCurrency])

  const chartConfig: ChartConfig = {
    balance: {
      label: `Balance (${resolvedBaseCurrency})`,
      color: "var(--chart-2)",
    },
  }

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
