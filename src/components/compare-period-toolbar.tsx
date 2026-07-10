import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft01Icon, ArrowRight01Icon, Calendar03Icon } from "@hugeicons/core-free-icons"
import { format } from "date-fns"
import type { DateRange } from "react-day-picker"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  type CompareGranularity,
  type ComparePeriodsState,
  type MonthCompareMode,
  resolveComparePeriods,
  shiftMonthAnchor,
  toDateOrUndefined,
} from "@/lib/compare-periods"

const granularities: Array<{ label: string; value: CompareGranularity }> = [
  { label: "Month", value: "month" },
  { label: "Year", value: "year" },
  { label: "Custom", value: "custom" },
]

const monthCompareModes: Array<{ label: string; value: MonthCompareMode }> = [
  { label: "vs Previous month", value: "previousMonth" },
  { label: "vs Same month last year", value: "sameMonthLastYear" },
]

export function ComparePeriodToolbar({
  value,
  onChange,
  aColor,
  bColor,
}: {
  value: ComparePeriodsState
  onChange: (next: ComparePeriodsState) => void
  aColor: string
  bColor: string
}) {
  const isMobile = useIsMobile()
  const resolved = resolveComparePeriods(value)

  const setGranularity = (granularity: CompareGranularity) => onChange({ ...value, granularity })

  const handleCustomSelect = (period: "a" | "b") => (range: DateRange | undefined) => {
    const startKey = period === "a" ? "customAStart" : "customBStart"
    const endKey = period === "a" ? "customAEnd" : "customBEnd"

    if (!range?.from) {
      onChange({ ...value, [startKey]: "", [endKey]: "" })
      return
    }

    onChange({
      ...value,
      [startKey]: format(range.from, "yyyy-MM-dd"),
      [endKey]: format(range.to ?? range.from, "yyyy-MM-dd"),
    })
  }

  const customRange = (period: "a" | "b"): DateRange | undefined => {
    const start = period === "a" ? value.customAStart : value.customBStart
    const end = period === "a" ? value.customAEnd : value.customBEnd
    return { from: toDateOrUndefined(start), to: toDateOrUndefined(end) }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto py-1">
        <div className="flex min-w-max flex-wrap items-center gap-2 whitespace-nowrap">
          <ToggleGroup
            value={[value.granularity]}
            onValueChange={(values) => {
              const next = values[0] as CompareGranularity | undefined
              if (next) {
                setGranularity(next)
              }
            }}
            variant="outline"
            size="sm"
          >
            {granularities.map((option) => (
              <ToggleGroupItem key={option.value} value={option.value} className="font-mono text-[11px] tracking-[0.12em] uppercase">
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          {value.granularity === "month" ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={() => onChange({ ...value, monthAnchor: shiftMonthAnchor(value.monthAnchor, -1) })}
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
                <span className="sr-only">Previous month</span>
              </Button>
              <span className="min-w-32 text-center font-mono text-[12px] tracking-[0.04em] text-foreground">{resolved.a.label}</span>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={() => onChange({ ...value, monthAnchor: shiftMonthAnchor(value.monthAnchor, 1) })}
              >
                <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
                <span className="sr-only">Next month</span>
              </Button>
              <Select
                value={value.monthCompareMode}
                items={monthCompareModes}
                onValueChange={(next) => onChange({ ...value, monthCompareMode: (next as MonthCompareMode) ?? "previousMonth" })}
              >
                <SelectTrigger className="w-[230px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {monthCompareModes.map((mode) => (
                      <SelectItem key={mode.value} value={mode.value}>
                        {mode.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </>
          ) : null}

          {value.granularity === "year" ? (
            <>
              <Button type="button" variant="outline" size="icon-sm" onClick={() => onChange({ ...value, yearAnchor: value.yearAnchor - 1 })}>
                <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
                <span className="sr-only">Previous year</span>
              </Button>
              <span className="min-w-20 text-center font-mono text-[12px] tracking-[0.04em] text-foreground">{resolved.a.label}</span>
              <Button type="button" variant="outline" size="icon-sm" onClick={() => onChange({ ...value, yearAnchor: value.yearAnchor + 1 })}>
                <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
                <span className="sr-only">Next year</span>
              </Button>
              <span className="font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">vs {resolved.b.label}</span>
            </>
          ) : null}

          {value.granularity === "custom" ? (
            <>
              {(["a", "b"] as const).map((period) => (
                <Popover key={period}>
                  <PopoverTrigger
                    render={
                      <Button variant="outline" className="min-w-56 justify-start px-2.5 text-left font-mono text-[12px] font-normal tracking-[0.04em]" />
                    }
                  >
                    <HugeiconsIcon icon={Calendar03Icon} strokeWidth={2} data-icon="inline-start" />
                    <span className="mr-1.5 inline-flex items-center gap-1.5">
                      <span className="size-2 rounded-full" style={{ backgroundColor: period === "a" ? aColor : bColor }} />
                      {period === "a" ? "A" : "B"}
                    </span>
                    {period === "a" ? resolved.a.label : resolved.b.label}
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      defaultMonth={customRange(period)?.from}
                      selected={customRange(period)}
                      onSelect={handleCustomSelect(period)}
                      numberOfMonths={isMobile ? 1 : 2}
                    />
                  </PopoverContent>
                </Popover>
              ))}
            </>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] tracking-[0.1em] text-muted-foreground uppercase">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full" style={{ backgroundColor: aColor }} />
          A · {resolved.a.label}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full" style={{ backgroundColor: bColor }} />
          B · {resolved.b.label}
        </span>
      </div>
    </div>
  )
}
