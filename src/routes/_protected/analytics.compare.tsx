import * as React from "react"

import { createFileRoute } from "@tanstack/react-router"
import { AddMoneyCircleIcon, ArrowDown01Icon, ArrowUp01Icon, ChartDownIcon, ChartUpIcon, CreditCardIcon, PiggyBankIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { MetricCard, type MetricCardIcon } from "@/components/metric-card"
import { EmptyState } from "@/components/empty-state"
import { CardSkeleton, MetricCardsSkeleton } from "@/components/page-skeletons"
import { ComparePeriodToolbar } from "@/components/compare-period-toolbar"
import { TrendBadge, formatTrendLabel } from "@/components/trend-badge"
import { ComposedChart } from "@/components/charts/composed-chart"
import { Line } from "@/components/charts/line"
import { Grid } from "@/components/charts/grid"
import { XAxis } from "@/components/charts/x-axis"
import { YAxis } from "@/components/charts/y-axis"
import { ChartTooltip } from "@/components/charts/tooltip"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { getApiErrorMessage } from "@/features/shared/errors"
import { useComparisonReport } from "@/features/reports/hooks"
import { useCategories } from "@/features/categories/hooks"
import { CategoryIconBadge, buildCategoryIconById } from "@/lib/category-icons"
import { bucketKeyToDate, formatCompactNumber } from "@/lib/chart-utils"
import { formatCurrency, normalizeHexColor, toNumber } from "@/lib/finance"
import { toApiDateString } from "@/lib/state/sharedDateRangeFilters"
import { type ComparePeriodsState, defaultComparePeriodsState, resolveComparePeriods } from "@/lib/compare-periods"

import type { ReportInterval } from "@/features/shared/types"

const A_COLOR = "#2d7ff9"
const B_COLOR = "#9aa3b2"

type TrendMetric = "net" | "income" | "spending"
type MoverType = "Expense" | "Income"

const pickAB = (a: number | string | null, b: number | string | null) => ({
  a: a === null ? null : toNumber(a),
  b: b === null ? null : toNumber(b),
})

/** Advance a bucket date by `steps` report-interval increments ("Auto"/"None" behave like "Day"). */
const addIntervalSteps = (date: Date, interval: ReportInterval | undefined, steps: number) => {
  if (interval === "Month") {
    return new Date(date.getFullYear(), date.getMonth() + steps, date.getDate())
  }

  const stride = interval === "Week" ? 7 : 1
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + steps * stride)
}

export const Route = createFileRoute("/_protected/analytics/compare")({
  head: () => ({ meta: [{ title: "Compare — Flamette Money" }] }),
  component: AnalyticsComparePage,
})

function AnalyticsComparePage() {
  const [state, setState] = React.useState<ComparePeriodsState>(() => defaultComparePeriodsState())
  const [metric, setMetric] = React.useState<TrendMetric>("net")
  const [type, setType] = React.useState<MoverType>("Expense")

  const resolved = React.useMemo(() => resolveComparePeriods(state), [state])

  const query = React.useMemo(
    () => ({
      PeriodAStart: toApiDateString(resolved.a.start),
      PeriodAEnd: toApiDateString(resolved.a.end),
      PeriodBStart: toApiDateString(resolved.b.start),
      PeriodBEnd: toApiDateString(resolved.b.end),
      Type: type,
      Interval: "Auto" as const,
    }),
    [resolved, type]
  )

  const reportQuery = useComparisonReport(query)
  const report = reportQuery.data
  const baseCurrency = report?.baseCurrency ?? "USD"

  const categoriesQuery = useCategories()
  const categoryIconById = React.useMemo(() => buildCategoryIconById(categoriesQuery.data), [categoriesQuery.data])

  const chartData = React.useMemo(() => {
    const interval = report?.interval
    let lastADate: Date | null = null
    let lastAIndex = 0

    return (report?.series ?? []).map((point, index) => {
      const values =
        metric === "income"
          ? pickAB(point.aIncome, point.bIncome)
          : metric === "spending"
            ? pickAB(point.aSpending, point.bSpending)
            : pickAB(point.aNet, point.bNet)

      // The x-axis follows period A's timeline only. When A is shorter than B
      // the trailing points have no aBucketKey, so extrapolate forward from the
      // last real A date — falling back to B's bucket dates would make the time
      // axis jump backwards to B's (older) period.
      let date: Date
      if (point.aBucketKey) {
        date = bucketKeyToDate(point.aBucketKey, index)
        lastADate = date
        lastAIndex = index
      } else if (lastADate) {
        date = addIntervalSteps(lastADate, interval, index - lastAIndex)
      } else {
        date = bucketKeyToDate("", index)
      }

      return {
        date,
        // The chart line components draw non-numeric values at the top of the
        // plot, so missing buckets stay 0 here; `aHasData`/`bHasData` keep the
        // tooltip honest about which side actually has data.
        a: values.a ?? 0,
        b: values.b ?? 0,
        aHasData: values.a !== null,
        bHasData: values.b !== null,
        aLabel: point.aLabel,
        bLabel: point.bLabel,
      }
    })
  }, [report?.series, report?.interval, metric])

  const movers = React.useMemo(
    () =>
      (report?.categoryMovers ?? []).map((mover) => ({
        ...mover,
        color: normalizeHexColor(mover.color),
        aTotal: toNumber(mover.aTotal),
        bTotal: toNumber(mover.bTotal),
        delta: toNumber(mover.delta),
        deltaPercent: mover.deltaPercent === null ? null : toNumber(mover.deltaPercent),
      })),
    [report?.categoryMovers]
  )

  const periodA = report?.periodA
  const periodB = report?.periodB
  const hasData =
    Boolean(periodA) &&
    (toNumber(periodA?.income) !== 0 ||
      toNumber(periodA?.spending) !== 0 ||
      toNumber(periodB?.income) !== 0 ||
      toNumber(periodB?.spending) !== 0 ||
      movers.length > 0)

  const metricLabel = metric === "income" ? "Income" : metric === "spending" ? "Spending" : "Net"

  return (
    <div className="flex flex-col gap-6">
      <ComparePeriodToolbar value={state} onChange={setState} aColor={A_COLOR} bColor={B_COLOR} />

      {reportQuery.isError && !report ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load comparison</AlertTitle>
          <AlertDescription>{getApiErrorMessage(reportQuery.error, "Try another pair of periods.")}</AlertDescription>
        </Alert>
      ) : reportQuery.isPending ? (
        <>
          <MetricCardsSkeleton count={4} className="gap-3 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4" />
          <CardSkeleton className="h-[420px]" />
        </>
      ) : !(hasData && periodA && periodB) ? (
        <EmptyState
          eyebrow="Compare"
          title="No activity in these periods"
          description="Pick two periods that both contain transactions to see how they stack up."
        />
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <ComparisonMetricCard
              label="Income"
              icon={AddMoneyCircleIcon}
              iconBgClassName="bg-blue-500/10 dark:bg-blue-400/15"
              iconColorClassName="text-blue-600 dark:text-blue-400"
              aValue={toNumber(periodA.income)}
              bValue={toNumber(periodB.income)}
              formatValue={(value) => formatCurrency(value, baseCurrency)}
              higherIsBetter
            />
            <ComparisonMetricCard
              label="Spending"
              icon={CreditCardIcon}
              iconBgClassName="bg-amber-500/10 dark:bg-amber-500/15"
              iconColorClassName="text-amber-600 dark:text-amber-400"
              aValue={toNumber(periodA.spending)}
              bValue={toNumber(periodB.spending)}
              formatValue={(value) => formatCurrency(value, baseCurrency)}
              higherIsBetter={false}
            />
            <ComparisonMetricCard
              label="Net"
              icon={toNumber(periodA.net) >= 0 ? ChartUpIcon : ChartDownIcon}
              iconBgClassName={toNumber(periodA.net) >= 0 ? "bg-emerald-500/10 dark:bg-emerald-500/15" : "bg-rose-500/10 dark:bg-rose-500/15"}
              iconColorClassName={toNumber(periodA.net) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}
              aValue={toNumber(periodA.net)}
              bValue={toNumber(periodB.net)}
              formatValue={(value) => formatCurrency(value, baseCurrency)}
              higherIsBetter
            />
            <ComparisonMetricCard
              label="Savings rate"
              icon={PiggyBankIcon}
              iconBgClassName="bg-emerald-500/10 dark:bg-emerald-500/15"
              iconColorClassName="text-emerald-600 dark:text-emerald-400"
              aValue={toNumber(periodA.savingsRate)}
              bValue={toNumber(periodB.savingsRate)}
              formatValue={(value) => `${value.toFixed(1)}%`}
              higherIsBetter
              deltaMode="points"
            />
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>{metricLabel} over the period</CardTitle>
                  <CardDescription>
                    Period A and B aligned by position, so the same point in each period lines up. Values are in {baseCurrency} at current rates.
                  </CardDescription>
                </div>
                <ToggleGroup
                  value={[metric]}
                  onValueChange={(values) => {
                    const next = values[0] as TrendMetric | undefined
                    if (next) {
                      setMetric(next)
                    }
                  }}
                  variant="outline"
                  size="sm"
                >
                  <ToggleGroupItem value="net">Net</ToggleGroupItem>
                  <ToggleGroupItem value="income">Income</ToggleGroupItem>
                  <ToggleGroupItem value="spending">Spending</ToggleGroupItem>
                </ToggleGroup>
              </div>
            </CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <div className="flex h-[320px] items-center justify-center font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
                  No series data
                </div>
              ) : (
                <ComposedChart
                  data={chartData}
                  xDataKey="date"
                  aspectRatio=""
                  className="h-[360px] w-full"
                  margin={{ top: 40, right: 16, bottom: 28, left: 48 }}
                >
                  <Grid highlightRowValues={[0]} />
                  <XAxis />
                  <YAxis formatValue={(value) => formatCompactNumber(value)} />
                  <ChartTooltip
                    rows={(point) => [
                      {
                        color: A_COLOR,
                        label: `A · ${(point.aLabel as string) ?? "—"}`,
                        value: point.aHasData ? formatCurrency(point.a as number, baseCurrency) : "—",
                      },
                      {
                        color: B_COLOR,
                        label: `B · ${(point.bLabel as string) ?? "—"}`,
                        value: point.bHasData ? formatCurrency(point.b as number, baseCurrency) : "—",
                      },
                    ]}
                  />
                  <Line dataKey="b" stroke={B_COLOR} fadeEdges={false} />
                  <Line dataKey="a" stroke={A_COLOR} fadeEdges={false} />
                </ComposedChart>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Biggest movers</CardTitle>
                  <CardDescription>Where {type === "Expense" ? "spending" : "income"} changed most between the two periods.</CardDescription>
                </div>
                <ToggleGroup
                  value={[type]}
                  onValueChange={(values) => {
                    const next = values[0] as MoverType | undefined
                    if (next) {
                      setType(next)
                    }
                  }}
                  variant="outline"
                  size="sm"
                >
                  <ToggleGroupItem value="Expense">Expenses</ToggleGroupItem>
                  <ToggleGroupItem value="Income">Income</ToggleGroupItem>
                </ToggleGroup>
              </div>
            </CardHeader>
            <CardContent>
              {movers.length === 0 ? (
                <div className="flex h-24 items-center justify-center font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
                  No category activity
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] border-collapse">
                    <thead>
                      <tr className="border-b border-border font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                        <th className="py-2 pr-3 text-left font-medium">Category</th>
                        <th className="px-3 py-2 text-right font-medium">A</th>
                        <th className="px-3 py-2 text-right font-medium">B</th>
                        <th className="py-2 pl-3 text-right font-medium">Change</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movers.map((mover) => (
                        <MoverRow key={mover.key} mover={mover} icon={categoryIconById.get(mover.key)} baseCurrency={baseCurrency} type={type} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

/* ── Paired summary card ────────────────────────────────────── */

function ComparisonMetricCard({
  label,
  icon,
  iconBgClassName,
  iconColorClassName,
  aValue,
  bValue,
  formatValue,
  higherIsBetter,
  deltaMode = "percent",
}: {
  label: string
  icon: MetricCardIcon
  iconBgClassName: string
  iconColorClassName: string
  aValue: number
  bValue: number
  formatValue: (value: number) => string
  higherIsBetter: boolean
  deltaMode?: "percent" | "points"
}) {
  const delta = aValue - bValue
  const isBetter = higherIsBetter ? delta >= 0 : delta <= 0
  const deltaPercent = bValue !== 0 ? (delta / Math.abs(bValue)) * 100 : null
  const trendLabel = deltaMode === "points" ? `${delta > 0 ? "+" : ""}${delta.toFixed(1)} pts` : formatTrendLabel(deltaPercent)

  return (
    <MetricCard
      label={label}
      value={formatValue(aValue)}
      icon={icon}
      iconBgClassName={iconBgClassName}
      iconColorClassName={iconColorClassName}
      badge={<TrendBadge delta={delta} isBetter={isBetter} label={trendLabel} />}
      footer={
        <>
          <span>B</span>
          <span className="font-mono tabular-nums">{formatValue(bValue)}</span>
        </>
      }
    />
  )
}

/* ── Movers table row ───────────────────────────────────────── */

function MoverRow({
  mover,
  icon,
  baseCurrency,
  type,
}: {
  mover: { key: string; label: string; color: string; aTotal: number; bTotal: number; delta: number; deltaPercent: number | null }
  icon?: string
  baseCurrency: string
  type: MoverType
}) {
  const isNeutral = mover.delta === 0
  const isBetter = type === "Income" ? mover.delta >= 0 : mover.delta <= 0
  const tone = isNeutral ? "text-muted-foreground" : isBetter ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"
  const trendIcon = isNeutral ? null : mover.delta > 0 ? ArrowUp01Icon : ArrowDown01Icon
  const percentLabel = mover.deltaPercent === null ? "New" : `${mover.deltaPercent > 0 ? "+" : ""}${mover.deltaPercent.toFixed(0)}%`

  return (
    <tr className="border-b border-border/60 last:border-0">
      <td className="py-2.5 pr-3">
        <div className="flex min-w-0 items-center gap-2">
          {icon ? (
            <CategoryIconBadge icon={icon} color={mover.color} className="size-6 rounded-md" iconClassName="size-3.5" />
          ) : (
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: mover.color }} />
          )}
          <span className="truncate text-sm font-medium text-foreground">{mover.label}</span>
        </div>
      </td>
      <td className="px-3 py-2.5 text-right font-mono text-[13px] text-foreground tabular-nums">{formatCurrency(mover.aTotal, baseCurrency)}</td>
      <td className="px-3 py-2.5 text-right font-mono text-[13px] text-muted-foreground tabular-nums">{formatCurrency(mover.bTotal, baseCurrency)}</td>
      <td className="py-2.5 pl-3 text-right">
        <div className={`inline-flex items-center justify-end gap-1.5 font-mono text-[13px] tabular-nums ${tone}`}>
          {trendIcon ? <HugeiconsIcon icon={trendIcon} strokeWidth={2} className="size-3.5" /> : null}
          <span>{formatCurrency(mover.delta, baseCurrency)}</span>
          <span className="text-[11px] opacity-80">({percentLabel})</span>
        </div>
      </td>
    </tr>
  )
}
