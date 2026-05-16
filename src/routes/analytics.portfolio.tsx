import * as React from "react"

import { createFileRoute } from "@tanstack/react-router"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import { SharedDateRangeToolbar } from "@/components/shared-date-range-toolbar"
import {
  ChartContainer,
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
import { EmptyState } from "@/components/empty-state"
import { getApiErrorMessage } from "@/lib/api/errors"
import { useCurrentUser, usePortfolioBalanceSeriesReport } from "@/lib/api/hooks"
import { formatCurrency, toNumber } from "@/lib/finance"
import { resolveSharedDateRange, toApiDateString, useSharedDateRangeFilters } from "@/lib/state/sharedDateRangeFilters"

export const Route = createFileRoute("/analytics/portfolio")({
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
  const chartData = React.useMemo(
    () =>
      (reportQuery.data?.points ?? []).map((point) => ({
        period: point.bucketLabel,
        balance: toNumber(point.totalBalance),
      })),
    [reportQuery.data?.points],
  )

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
                  <XAxis axisLine={false} dataKey="period" tickLine={false} />
                  <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                  <Area dataKey="balance" fill="var(--color-balance)" fillOpacity={0.18} stroke="var(--color-balance)" type="linear" />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 self-start">
          <SummaryCard label="Base currency" value={resolvedBaseCurrency} helper="Applied to the entire time series" />
          <SummaryCard label="Start balance" value={formatCurrency(reportQuery.data?.summary.startBalance, resolvedBaseCurrency)} helper="Balance at the beginning of the selected range" />
          <SummaryCard label="End balance" value={formatCurrency(reportQuery.data?.summary.endBalance, resolvedBaseCurrency)} helper="Latest known portfolio balance in range" />
          <SummaryCard label="Delta" value={formatCurrency(reportQuery.data?.summary.delta, resolvedBaseCurrency)} helper={`${toNumber(reportQuery.data?.summary.deltaPercent).toFixed(2)}% change across the selected period`} />
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
