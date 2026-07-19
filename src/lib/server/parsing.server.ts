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

// Filter dates arrive as "YYYY-MM-DD" or as timezone-less local datetimes
// ("YYYY-MM-DDTHH:mm:ss" from toApiDateString). new Date() parses the datetime form in the
// server's local timezone, shifting the calendar day on any non-UTC server — so read the
// calendar date straight from the string and anchor it at UTC midnight, matching how
// transaction dates are stored.
const calendarDatePattern = /^(\d{4})-(\d{2})-(\d{2})(?:[T\s]|$)/

export function parseCalendarDateUtc(value: string, fieldName: string) {
  const match = calendarDatePattern.exec(value)

  if (match) {
    return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
  }

  const date = parseDateInput(value, fieldName)
  date.setUTCHours(0, 0, 0, 0)
  return date
}

export function startOfDay(value: string) {
  return parseCalendarDateUtc(value, "StartDate")
}

export function endOfDay(value: string) {
  const date = parseCalendarDateUtc(value, "EndDate")
  date.setUTCHours(23, 59, 59, 999)
  return date
}
