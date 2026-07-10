export function parseAmount(value: number | string | null | undefined, fieldName: string) {
  const parsed = typeof value === "number" ? value : Number(value)

  if (!Number.isFinite(parsed)) {
    throw new Error(`${fieldName} must be a valid number.`)
  }

  return parsed
}

export function parsePositiveAmount(value: number | string | null | undefined, fieldName: string) {
  const parsed = parseAmount(value, fieldName)

  if (parsed <= 0) {
    throw new Error(`${fieldName} must be greater than 0.`)
  }

  return parsed
}

export function parseDateInput(value: string, fieldName: string) {
  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${fieldName} must be a valid date.`)
  }

  return parsed
}

// Date-only strings ("YYYY-MM-DD") parse as UTC midnight, and transaction dates are stored
// that way — day boundaries must use UTC too, or filters and report buckets shift by the
// server's timezone offset.
export function startOfDay(value: string) {
  const date = parseDateInput(value, "StartDate")
  date.setUTCHours(0, 0, 0, 0)
  return date
}

export function endOfDay(value: string) {
  const date = parseDateInput(value, "EndDate")
  date.setUTCHours(23, 59, 59, 999)
  return date
}
