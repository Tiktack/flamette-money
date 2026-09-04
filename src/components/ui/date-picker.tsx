import * as React from "react"

import { Calendar03Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { format, isValid, parseISO } from "date-fns"
import type { Matcher } from "react-day-picker"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

type DatePickerProps = {
  /** Date in "yyyy-MM-dd" form (local calendar day), or "" for no selection. */
  value: string
  onValueChange: (value: string) => void
  id?: string
  placeholder?: string
  disabled?: boolean
  /** Earliest selectable day, "yyyy-MM-dd". */
  min?: string
  /** Latest selectable day, "yyyy-MM-dd". */
  max?: string
  className?: string
}

function parseDay(value?: string) {
  if (!value) {
    return undefined
  }

  const parsed = parseISO(value)
  return isValid(parsed) ? parsed : undefined
}

function DatePicker({ value, onValueChange, id, placeholder = "Pick a date", disabled, min, max, className }: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const selected = parseDay(value)
  const minDate = parseDay(min)
  const maxDate = parseDay(max)
  const disabledDays: Matcher[] = [...(minDate ? [{ before: minDate }] : []), ...(maxDate ? [{ after: maxDate }] : [])]

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn("w-full justify-start px-2.5 font-mono text-sm font-normal tracking-[0.02em]", !selected && "text-muted-foreground/80", className)}
          />
        }
      >
        <HugeiconsIcon icon={Calendar03Icon} strokeWidth={2} data-icon="inline-start" />
        {selected ? selected.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : placeholder}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          defaultMonth={selected ?? new Date()}
          selected={selected}
          disabled={disabledDays.length ? disabledDays : undefined}
          onSelect={(date) => {
            if (!date) {
              return
            }

            onValueChange(format(date, "yyyy-MM-dd"))
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

export { DatePicker }
