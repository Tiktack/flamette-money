import * as React from "react"

import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Calendar03Icon,
} from "@hugeicons/core-free-icons"
import { addDays, format, parseISO } from "date-fns"
import type { DateRange } from "react-day-picker"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  type DateRangePreset,
  resolveSharedDateRange,
  useSharedDateRangeFilters,
} from "@/lib/state/sharedDateRangeFilters"

const presets: Array<{ label: string; value: DateRangePreset }> = [
  { label: "Month", value: "month" },
  { label: "Year", value: "year" },
  { label: "All", value: "all" },
  { label: "Custom", value: "custom" },
]

const formatRangeLabel = (start: Date | null, end: Date | null) => {
  if (!start && !end) {
    return "All time"
  }

  if (start && end) {
    return `${format(start, "LLL dd, y")} - ${format(end, "LLL dd, y")}`
  }

  if (start) {
    return format(start, "LLL dd, y")
  }

  return end ? format(end, "LLL dd, y") : "Pick a date"
}

const toDateOrUndefined = (value: string) => {
  return value ? parseISO(value) : undefined
}

export function SharedDateRangeToolbar() {
  const state = useSharedDateRangeFilters()
  const isMobile = useIsMobile()
  const resolvedRange = resolveSharedDateRange(state)
  const canNavigate = state.preset !== "all"
  const canPickRange = state.preset === "custom"
  const selectedRange = React.useMemo<DateRange | undefined>(() => {
    if (state.preset !== "custom") {
      return resolvedRange.start || resolvedRange.end
        ? {
            from: resolvedRange.start ?? undefined,
            to: resolvedRange.end ?? undefined,
          }
        : undefined
    }

    return {
      from: toDateOrUndefined(state.customStartDate),
      to: toDateOrUndefined(state.customEndDate),
    }
  }, [
    resolvedRange.end,
    resolvedRange.start,
    state.customEndDate,
    state.customStartDate,
    state.preset,
  ])

  const shiftBackward = () => {
    if (state.preset === "month") {
      state.shiftMonth(-1)
      return
    }

    if (state.preset === "year") {
      state.shiftYear(-1)
      return
    }

    if (state.preset === "custom") {
      state.shiftCustomRange(-1)
    }
  }

  const shiftForward = () => {
    if (state.preset === "month") {
      state.shiftMonth(1)
      return
    }

    if (state.preset === "year") {
      state.shiftYear(1)
      return
    }

    if (state.preset === "custom") {
      state.shiftCustomRange(1)
    }
  }

  const handleCustomRangeSelect = (range: DateRange | undefined) => {
    if (!range?.from) {
      state.setCustomStartDate("")
      state.setCustomEndDate("")
      return
    }

    state.setCustomStartDate(format(range.from, "yyyy-MM-dd"))
    state.setCustomEndDate(format(range.to ?? range.from, "yyyy-MM-dd"))
  }

  const rangeLabel =
    state.preset === "custom"
      ? formatRangeLabel(
          state.customStartDate ? parseISO(state.customStartDate) : null,
          state.customEndDate ? parseISO(state.customEndDate) : null
        )
      : formatRangeLabel(resolvedRange.start, resolvedRange.end)

  return (
    <div className="overflow-x-auto py-1">
      <div className="flex min-w-max items-center gap-2 whitespace-nowrap">
        {presets.map((preset) => (
          <Button
            key={preset.value}
            type="button"
            variant={state.preset === preset.value ? "default" : "outline"}
            size="sm"
            onClick={() => state.setPreset(preset.value)}
            className="font-mono text-[11px] tracking-[0.12em] uppercase"
          >
            {preset.label}
          </Button>
        ))}

        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={shiftBackward}
          disabled={!canNavigate}
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
          <span className="sr-only">Previous date range</span>
        </Button>

        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={shiftForward}
          disabled={!canNavigate}
        >
          <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
          <span className="sr-only">Next date range</span>
        </Button>

        <Popover>
          <PopoverTrigger
            render={
                <Button
                  variant="outline"
                  className="min-w-72 justify-start px-2.5 text-left font-mono text-[12px] font-normal tracking-[0.04em]"
                  disabled={!canPickRange}
                />
            }
          >
            <HugeiconsIcon
              icon={Calendar03Icon}
              strokeWidth={2}
              data-icon="inline-start"
            />
            {rangeLabel}
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              defaultMonth={selectedRange?.from ?? addDays(new Date(), -30)}
              selected={selectedRange}
              onSelect={handleCustomRangeSelect}
              numberOfMonths={isMobile ? 1 : 2}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
