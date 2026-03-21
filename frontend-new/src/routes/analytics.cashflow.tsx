import * as React from "react"

import { createFileRoute } from "@tanstack/react-router"
import { AddMoneyCircleIcon, ChartDownIcon, ChartUpIcon, CreditCardIcon } from "@hugeicons/core-free-icons"
import { Bar, CartesianGrid, Cell, ComposedChart, Label, Line, PolarGrid, PolarRadiusAxis, RadialBar, RadialBarChart, ReferenceLine, XAxis } from "recharts"

import { MetricCard } from "@/components/metric-card"

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
    } = { Interval: interval }

    if (resolvedDateRange.start) value.StartDate = resolvedDateRange.start.toISOString()
    if (resolvedDateRange.end) value.EndDate = resolvedDateRange.end.toISOString()

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
      (report?.data ?? []).map((point) => {
        const netVal = toNumber(point.net)
        return {
          period: point.bucketLabel,
          income: toNumber(point.income),
          spending: toNumber(point.spending),
          net: netVal,
          netFill: netVal >= 0 ? POSITIVE_NET_COLOR : NEGATIVE_NET_COLOR,
        }
      }),
    [report?.data],
  )

  const chartConfig: ChartConfig = {
    net: { label: "Net", color: POSITIVE_NET_COLOR },
    income: { label: "Income", color: "#2d7ff9" },
    spending: { label: "Spending", color: "#f08c44" },
  }

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
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-[130px] animate-pulse rounded-xl bg-muted" />
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
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
            <SavingsRadialCard
              savingsRate={savingsRate}
              income={income}
              spending={spending}
              net={net}
            />
          </div>

          <Card className="border-border/60 bg-card/80 shadow-sm">
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Cashflow</CardTitle>
                  <CardDescription>Bars show net profit or loss; lines track income and spending.</CardDescription>
                </div>
                <Select value={interval} onValueChange={(v) => setInterval((v as typeof interval) ?? "Auto")}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Auto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {(["Auto", "Day", "Week", "Month"] as const).map((v) => (
                        <SelectItem key={v} value={v}>{v}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <ChartContainer className="h-[380px] w-full" config={chartConfig}>
                <ComposedChart responsive data={chartData} margin={{ left: 8, right: 8, top: 12 }}>
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
        </>
      )}
    </div>
  )
}

/* ── Savings radial card ────────────────────────────────────── */

function SavingsRadialCard({
  savingsRate,
  income,
  spending,
  net,
}: {
  savingsRate: number
  income: number
  spending: number
  net: number
}) {
  const isOverspent = net < 0
  const displayPercent = isOverspent
    ? income > 0 ? (spending / income) * 100 : 100
    : Math.max(0, savingsRate)
  const fillPercent = isOverspent ? 100 : Math.min(Math.max(0, savingsRate), 100)

  const chartData = [{ name: "rate", value: 1 }]
  const chartConfig: ChartConfig = {
    rate: {
      label: isOverspent ? "Overspent" : "Savings rate",
      color: isOverspent ? "hsl(0 72% 51%)" : "hsl(152 57% 38%)",
    },
  }

  // Encode the percentage into endAngle so we don't fight recharts' auto-domain.
  // startAngle=90 is 12 o'clock; subtract clockwise degrees for fill%.
  const radialEndAngle = 90 - (fillPercent / 100) * 360

  return (
    <Card
      size="sm"
      className="border-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),transparent),linear-gradient(135deg,rgba(255,255,255,0.02),rgba(255,255,255,0))] shadow-sm"
    >
      <CardContent className="flex items-center justify-center px-4">
        <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[110px]">
          <RadialBarChart data={chartData} startAngle={90} endAngle={radialEndAngle} innerRadius={38} outerRadius={52}>
            <PolarGrid
              gridType="circle"
              radialLines={false}
              stroke="none"
              className="first:fill-muted last:fill-background"
              polarRadius={[52, 38]}
            />
            <RadialBar dataKey="value" cornerRadius={4} fill="var(--color-rate)" />
            <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                        <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-lg font-bold">
                          {displayPercent.toFixed(1)}%
                        </tspan>
                        <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 17} className="fill-muted-foreground text-[11px]">
                          {isOverspent ? "overspent" : "saved"}
                        </tspan>
                      </text>
                    )
                  }
                }}
              />
            </PolarRadiusAxis>
          </RadialBarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

/* ── Helpers ─────────────────────────────────────────────────── */

function formatSeriesLabel(name: string | number) {
  if (name === "net") return "Net"
  if (name === "income") return "Income"
  if (name === "spending") return "Spending"
  return String(name)
}