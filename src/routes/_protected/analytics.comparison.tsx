import { createFileRoute } from "@tanstack/react-router"
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"

import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EmptyState } from "@/components/empty-state"
import { getApiErrorMessage } from "@/features/shared/errors"
import { useMonthlyYoyReport } from "@/features/reports/hooks"
import { formatCurrency, toNumber } from "@/lib/finance"

export const Route = createFileRoute("/_protected/analytics/comparison")({
  component: AnalyticsComparisonPage,
})

function AnalyticsComparisonPage() {
  const currentYear = new Date().getFullYear()
  const [mode, setMode] = React.useState<"Expense" | "Income">("Expense")
  const [startYear, setStartYear] = React.useState(String(currentYear - 2))
  const [endYear, setEndYear] = React.useState(String(currentYear))

  const query = React.useMemo(() => {
    const start = Number(startYear)
    const end = Number(endYear)

    return {
      Type: mode,
      StartYear: Number.isFinite(start) ? start : currentYear - 2,
      EndYear: Number.isFinite(end) ? end : currentYear,
    }
  }, [currentYear, endYear, mode, startYear])

  const reportQuery = useMonthlyYoyReport(query)
  const baseCurrency = reportQuery.data?.baseCurrency ?? "USD"

  const yearOptions = React.useMemo(() => Array.from({ length: 8 }, (_, index) => String(currentYear - index)), [currentYear])

  const chartData = React.useMemo(
    () =>
      (reportQuery.data?.data ?? []).map((point) => {
        const row: Record<string, number | string> = { month: point.monthLabel }
        for (const series of reportQuery.data?.series ?? []) {
          row[series.key] = toNumber(point.values?.[series.key] ?? 0)
        }
        return row
      }),
    [reportQuery.data]
  )

  const chartConfig = React.useMemo(
    () =>
      (reportQuery.data?.series ?? []).reduce<ChartConfig>((config, series) => {
        config[series.key] = {
          label: series.label,
          color: series.color,
        }
        return config
      }, {}),
    [reportQuery.data?.series]
  )

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.9fr)]">
      <Card className="border-border/60 bg-card/80 shadow-sm">
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <CardTitle>Year-over-year monthly comparison</CardTitle>
              <CardDescription>Compare full calendar years by month for income or expenses.</CardDescription>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex rounded-full border border-border bg-muted/60 p-1">
                {(["Expense", "Income"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setMode(value)}
                    className={
                      value === mode
                        ? "rounded-full bg-background px-3 py-1.5 text-sm font-medium shadow-sm"
                        : "rounded-full px-3 py-1.5 text-sm text-muted-foreground"
                    }
                  >
                    {value === "Expense" ? "Expenses" : "Income"}
                  </button>
                ))}
              </div>
              <YearSelect label="From" value={startYear} options={yearOptions} onChange={setStartYear} />
              <YearSelect label="To" value={endYear} options={yearOptions} onChange={setEndYear} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {reportQuery.isPending ? (
            <div className="h-[360px] animate-pulse rounded-2xl bg-muted" />
          ) : reportQuery.isError ? (
            <EmptyState
              eyebrow="Report"
              title="Unable to load the comparison report"
              description={getApiErrorMessage(reportQuery.error, "Try another year range or refresh the page.")}
            />
          ) : chartData.length === 0 ? (
            <EmptyState
              eyebrow="Report"
              title="No monthly data in this range"
              description="Try a different year window or switch between income and expense views."
            />
          ) : (
            <ChartContainer className="h-[360px] w-full" config={chartConfig}>
              <BarChart data={chartData} margin={{ left: 8, right: 8, top: 12 }}>
                <CartesianGrid vertical={false} />
                <XAxis axisLine={false} dataKey="month" tickLine={false} />
                <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                <ChartLegend content={<ChartLegendContent />} />
                {(reportQuery.data?.series ?? []).map((series) => (
                  <Bar key={series.key} dataKey={series.key} fill={`var(--color-${series.key})`} radius={[6, 6, 0, 0]} />
                ))}
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 self-start">
        <SummaryCard label="Total" value={formatCurrency(reportQuery.data?.summary.total, baseCurrency)} helper="Across the latest selected year" />
        <SummaryCard label="Previous year" value={formatCurrency(reportQuery.data?.summary.previousYearTotal, baseCurrency)} helper="Reference period total" />
        <SummaryCard
          label="Average per month"
          value={formatCurrency(reportQuery.data?.summary.averagePerMonth, baseCurrency)}
          helper="Latest year monthly average"
        />
      </div>
    </div>
  )
}

function YearSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <div className="flex min-w-28 flex-col gap-2">
      <span className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">{label}</span>
      <Select
        value={value}
        onValueChange={(nextValue) => {
          if (nextValue) {
            onChange(nextValue)
          }
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {options.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
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

import * as React from "react"
