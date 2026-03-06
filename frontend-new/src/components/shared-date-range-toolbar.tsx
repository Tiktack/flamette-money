import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { formatMonthLabel } from "@/lib/finance"
import {
  type DateRangePreset,
  useSharedDateRangeFilters,
} from "@/lib/state/sharedDateRangeFilters"

const presets: Array<{ label: string; value: DateRangePreset }> = [
  { label: "Month", value: "month" },
  { label: "Year", value: "year" },
  { label: "Custom", value: "custom" },
  { label: "All", value: "all" },
]

export function SharedDateRangeToolbar() {
  const state = useSharedDateRangeFilters()

  return (
    <Card className="border-border/60 bg-card/80 shadow-sm">
      <CardContent className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <Button
              key={preset.value}
              type="button"
              variant={state.preset === preset.value ? "default" : "outline"}
              size="sm"
              onClick={() => state.setPreset(preset.value)}
            >
              {preset.label}
            </Button>
          ))}
        </div>

        {state.preset === "month" ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">{formatMonthLabel(state.monthAnchor)}</p>
              <p className="text-xs text-muted-foreground">Month-scoped reporting window</p>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => state.shiftMonth(-1)}>
                Previous
              </Button>
              <Input
                type="month"
                value={state.monthAnchor.slice(0, 7)}
                onChange={(event) => state.setMonthAnchor(`${event.target.value}-01`)}
                className="w-40"
              />
              <Button type="button" variant="outline" size="sm" onClick={() => state.shiftMonth(1)}>
                Next
              </Button>
            </div>
          </div>
        ) : null}

        {state.preset === "year" ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">{state.yearAnchor}</p>
              <p className="text-xs text-muted-foreground">Year-to-date comparison window</p>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => state.shiftYear(-1)}>
                Previous
              </Button>
              <Input
                type="number"
                min={2000}
                max={2100}
                value={state.yearAnchor}
                onChange={(event) => state.setYearAnchor(Number(event.target.value) || new Date().getFullYear())}
                className="w-28"
              />
              <Button type="button" variant="outline" size="sm" onClick={() => state.shiftYear(1)}>
                Next
              </Button>
            </div>
          </div>
        ) : null}

        {state.preset === "custom" ? (
          <FieldGroup className="grid gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="custom-start-date">Start date</FieldLabel>
              <Input
                id="custom-start-date"
                type="date"
                value={state.customStartDate}
                onChange={(event) => state.setCustomStartDate(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="custom-end-date">End date</FieldLabel>
              <Input
                id="custom-end-date"
                type="date"
                value={state.customEndDate}
                onChange={(event) => state.setCustomEndDate(event.target.value)}
              />
            </Field>
          </FieldGroup>
        ) : null}

        {state.preset === "all" ? (
          <p className="text-sm text-muted-foreground">
            All available history is included in the active report and tables.
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
