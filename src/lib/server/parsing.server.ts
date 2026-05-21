function fail(message: string): never {
  throw new Error(message)
}

export function parseAmount(
  value: number | string | null | undefined,
  fieldName: string
) {
  const parsed = typeof value === "number" ? value : Number(value)

  if (!Number.isFinite(parsed)) {
    fail(`${fieldName} must be a valid number.`)
  }

  return parsed
}

export function parsePositiveAmount(
  value: number | string | null | undefined,
  fieldName: string
) {
  const parsed = parseAmount(value, fieldName)

  if (parsed <= 0) {
    fail(`${fieldName} must be greater than 0.`)
  }

  return parsed
}

export function parseDateInput(value: string, fieldName: string) {
  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    fail(`${fieldName} must be a valid date.`)
  }

  return parsed
}

export function startOfDay(value: string) {
  const date = parseDateInput(value, "StartDate")
  date.setHours(0, 0, 0, 0)
  return date
}

export function endOfDay(value: string) {
  const date = parseDateInput(value, "EndDate")
  date.setHours(23, 59, 59, 999)
  return date
}
