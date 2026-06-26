import * as React from "react"

import { createFileRoute } from "@tanstack/react-router"
import { AddMoneyCircleIcon, ChartDownIcon, ChartUpIcon, CreditCardIcon } from "@hugeicons/core-free-icons"

import { MetricCard } from "@/components/metric-card"

import { EmptyState } from "@/components/empty-state"
import { useCashflowSeriesReport } from "@/features/reports/hooks"
import { SharedDateRangeToolbar } from "@/components/shared-date-range-toolbar"
import { ComposedChart } from "@/components/charts/composed-chart"
import { SeriesBar } from "@/components/charts/series-bar"
import { Line } from "@/components/charts/line"
import { Grid } from "@/components/charts/grid"
import { XAxis } from "@/components/charts/x-axis"
import { YAxis } from "@/components/charts/y-axis"
import { ChartTooltip } from "@/components/charts/tooltip"
import { RingChart } from "@/components/charts/ring-chart"
import { Ring } from "@/components/charts/ring"
import { RingCenter } from "@/components/charts/ring-center"
import { bucketKeyToDate, formatCompactNumber } from "@/lib/chart-utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getApiErrorMessage } from "@/features/shared/errors"
import { formatCurrency, toNumber } from "@/lib/finance"
import { resolveSharedDateRange, toApiDateString, useSharedDateRangeFilters } from "@/lib/state/sharedDateRangeFilters"

const INCOME_COLOR = "#2d7ff9"
const SPENDING_COLOR = "#f08c44"
const NET_COLOR = "#2f8f5b"
const SAVED_COLOR = "#2f8f5b"
const OVERSPENT_COLOR = "#cb5a5a"

export const Route = createFileRoute("/_protected/analytics/cashflow")({
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
    } = { Interval: interval }

    if (resolvedDateRange.start) value.StartDate = toApiDateString(resolvedDateRange.start)
    if (resolvedDateRange.end) value.EndDate = toApiDateString(resolvedDateRange.end)

    return value
  }, [interval, resolvedDateRange.end, resolvedDateRange.start])

  const reportQuery = useCashflowSeriesReport(query)
  const report = reportQuery.data
  const baseCurrency = report?.baseCurrency ?? "USD"
  const summary = report?.summary

  const income = toNumber(summary?.income.total)
  const spending = toNumber(summary?.spending.total)
  const net = toNumber(summary?.net.total)
  const savingsRate = toNumber(summary?.savingsRate)

  const chartData = React.useMemo(
    () =>
      (report?.data ?? []).map((point, index) => ({
        date: bucketKeyToDate(point.bucketKey, index),
        income: toNumber(point.income),
        spending: toNumber(point.spending),
        net: toNumber(point.net),
      })),
    [report?.data]
  )

  return (
    <div className="flex flex-col gap-6">
      <SharedDateRangeToolbar />

      {reportQuery.isError && chartData.length === 0 ? (
        <EmptyState
          eyebrow="Report"
          title="Unable to load cashflow analytics"
          description={getApiErrorMessage(reportQuery.error, "Try another date range or interval.")}
        />
      ) : reportQuery.isPending ? (
        <>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-[118px] animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
          <div className="h-[460px] animate-pulse rounded-xl bg-muted" />
        </>
      ) : chartData.length === 0 ? (
        <EmptyState
          eyebrow="Report"
          title="No cashflow data in this range"
          description="Once income and expense activity lands in the selected window, this page will map the balance between them."
        />
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Income"
              value={formatCurrency(income, baseCurrency)}
              footer={`${formatCurrency(summary?.income.averagePerDay, baseCurrency)} / day`}
              icon={AddMoneyCircleIcon}
              iconBgClassName="bg-blue-500/10 dark:bg-blue-400/15"
              iconColorClassName="text-blue-600 dark:text-blue-400"
            />
            <MetricCard
              label="Spending"
              value={formatCurrency(spending, baseCurrency)}
              footer={`${formatCurrency(summary?.spending.averagePerDay, baseCurrency)} / day`}
              icon={CreditCardIcon}
              iconBgClassName="bg-amber-500/10 dark:bg-amber-500/15"
              iconColorClassName="text-amber-600 dark:text-amber-400"
            />
            <MetricCard
              label="Net"
              value={formatCurrency(net, baseCurrency)}
              footer={`${formatCurrency(summary?.net.averagePerDay, baseCurrency)} / day`}
              icon={net >= 0 ? ChartUpIcon : ChartDownIcon}
              iconBgClassName={net >= 0 ? "bg-emerald-500/10 dark:bg-emerald-500/15" : "bg-rose-500/10 dark:bg-rose-500/15"}
              iconColorClassName={net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}
            />
            <SavingsRadialCard savingsRate={savingsRate} income={income} spending={spending} net={net} />
          </div>

          <Card className="border-border bg-card/95 shadow-none">
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Cashflow</CardTitle>
                  <CardDescription>Bars show net result; lines track income and spending.</CardDescription>
                </div>
                <Select value={interval} onValueChange={(v) => setInterval((v as typeof interval) ?? "Auto")}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Auto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {(["Auto", "Day", "Week", "Month"] as const).map((v) => (
                        <SelectItem key={v} value={v}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <ComposedChart data={chartData} xDataKey="date" aspectRatio="" className="h-[360px] w-full" margin={{ top: 16, right: 16, bottom: 28, left: 48 }}>
                <Grid highlightRowValues={[0]} />
                <XAxis />
                <YAxis formatValue={(value) => formatCompactNumber(value)} />
                <ChartTooltip
                  rows={(point) => [
                    { color: NET_COLOR, label: "Net", value: formatCurrency(point.net as number, baseCurrency) },
                    { color: INCOME_COLOR, label: "Income", value: formatCurrency(point.income as number, baseCurrency) },
                    { color: SPENDING_COLOR, label: "Spending", value: formatCurrency(point.spending as number, baseCurrency) },
                  ]}
                />
                <SeriesBar dataKey="net" fill={NET_COLOR} negativeFill={OVERSPENT_COLOR} radius={6} />
                <Line dataKey="income" stroke={INCOME_COLOR} fadeEdges={false} />
                <Line dataKey="spending" stroke={SPENDING_COLOR} fadeEdges={false} />
              </ComposedChart>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

/* ── Savings radial card ────────────────────────────────────── */

function SavingsRadialCard({ savingsRate, income, spending, net }: { savingsRate: number; income: number; spending: number; net: number }) {
  const isOverspent = net < 0
  const overspentPercent = income > 0 ? (spending / income) * 100 : 100
  const displayValue = isOverspent ? overspentPercent : Math.max(0, savingsRate)
  const color = isOverspent ? OVERSPENT_COLOR : SAVED_COLOR

  const ringData = [
    {
      label: isOverspent ? "overspent" : "saved",
      value: displayValue,
      maxValue: isOverspent ? Math.max(displayValue, 1) : 100,
      color,
    },
  ]

  return (
    <Card
      size="sm"
      className="relative min-w-0 overflow-hidden border-border bg-card/95 shadow-none before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-primary/28 before:to-transparent"
    >
      <CardContent className="flex items-center justify-center px-3 py-2">
        <div className="size-[108px]">
          <RingChart data={ringData} strokeWidth={11} baseInnerRadius={38} ringGap={0}>
            <Ring index={0} lineCap="round" />
            <RingCenter
              defaultLabel={isOverspent ? "overspent" : "saved"}
              suffix="%"
              formatOptions={{ maximumFractionDigits: 1 }}
              valueClassName="text-base font-bold text-foreground"
              labelClassName="mt-0.5 text-[10px] text-muted-foreground"
            />
          </RingChart>
        </div>
      </CardContent>
    </Card>
  )
}
