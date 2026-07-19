import * as React from "react"

import { MinusSignIcon, PlusSignIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Input } from "@/components/ui/input"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group"
import { cn } from "@/lib/utils"

type NumberInputProps = Omit<React.ComponentProps<"input">, "type" | "value" | "defaultValue" | "onChange" | "min" | "max" | "step"> & {
  value: number | null
  onValueChange: (value: number | null) => void
  min?: number
  max?: number
  /** Increment used by the stepper buttons and arrow keys. */
  step?: number
  /** Maximum fraction digits accepted while typing; 0 restricts input to integers. */
  decimalScale?: number
  /** Render -/+ stepper buttons inside the field. */
  showStepper?: boolean
  /** Emit onValueChange only on blur/Enter instead of every keystroke. */
  commitOnBlur?: boolean
}

function clampValue(value: number, min?: number, max?: number) {
  if (min != null && value < min) {
    return min
  }
  if (max != null && value > max) {
    return max
  }
  return value
}

function roundToScale(value: number, decimalScale: number) {
  const factor = 10 ** Math.max(0, decimalScale)
  return Math.round(value * factor) / factor
}

function formatValue(value: number | null) {
  return value == null ? "" : String(value)
}

function NumberInput({
  value,
  onValueChange,
  min,
  max,
  step = 1,
  decimalScale = 2,
  showStepper = false,
  commitOnBlur = false,
  className,
  disabled,
  onBlur,
  onKeyDown,
  ...props
}: NumberInputProps) {
  // Raw text while the field is being edited, so incomplete states like "12." or "-"
  // survive typing; null means "mirror the value prop".
  const [draft, setDraft] = React.useState<string | null>(null)

  const allowNegative = min == null || min < 0
  const draftPattern = React.useMemo(() => {
    const sign = allowNegative ? "-?" : ""
    return decimalScale > 0 ? new RegExp(`^${sign}\\d*(?:\\.\\d{0,${decimalScale}})?$`) : new RegExp(`^${sign}\\d*$`)
  }, [allowNegative, decimalScale])

  const displayValue = draft ?? formatValue(value)

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const text = event.target.value.replace(/,/g, ".")
    if (!draftPattern.test(text)) {
      return
    }

    setDraft(text)

    if (commitOnBlur) {
      return
    }

    if (text === "") {
      onValueChange(null)
      return
    }

    // Incomplete drafts like "-" or "." don't parse yet; they resolve on blur.
    const parsed = Number(text)
    if (Number.isFinite(parsed)) {
      onValueChange(clampValue(parsed, min, max))
    }
  }

  const commit = () => {
    if (draft === null) {
      return
    }

    setDraft(null)
    const parsed = Number(draft)
    onValueChange(draft === "" || !Number.isFinite(parsed) ? null : clampValue(roundToScale(parsed, decimalScale), min, max))
  }

  const stepBy = (direction: 1 | -1) => {
    const text = draft ?? formatValue(value)
    const parsed = Number(text)
    const base = text !== "" && Number.isFinite(parsed) ? parsed : 0
    setDraft(null)
    onValueChange(clampValue(roundToScale(base + direction * step, decimalScale), min, max))
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      commit()
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      stepBy(1)
    } else if (event.key === "ArrowDown") {
      event.preventDefault()
      stepBy(-1)
    }

    onKeyDown?.(event)
  }

  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    commit()
    onBlur?.(event)
  }

  const inputProps = {
    type: "text" as const,
    inputMode: decimalScale > 0 ? ("decimal" as const) : ("numeric" as const),
    autoComplete: "off",
    disabled,
    value: displayValue,
    onChange: handleChange,
    onBlur: handleBlur,
    onKeyDown: handleKeyDown,
    ...props,
  }

  if (!showStepper) {
    return <Input className={className} {...inputProps} />
  }

  return (
    <InputGroup className={cn("rounded-lg shadow-none dark:bg-input/15", className)}>
      <InputGroupInput {...inputProps} />
      <InputGroupAddon align="inline-end" className="gap-1">
        <InputGroupButton
          size="icon-xs"
          aria-label="Decrease value"
          tabIndex={-1}
          disabled={disabled || (min != null && value != null && value <= min)}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => stepBy(-1)}
        >
          <HugeiconsIcon icon={MinusSignIcon} strokeWidth={2} />
        </InputGroupButton>
        <InputGroupButton
          size="icon-xs"
          aria-label="Increase value"
          tabIndex={-1}
          disabled={disabled || (max != null && value != null && value >= max)}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => stepBy(1)}
        >
          <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} />
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  )
}

export { NumberInput }
