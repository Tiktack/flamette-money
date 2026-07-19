import { describe, expect, it } from "vitest"

import { endOfDay, parseCalendarDateUtc, startOfDay } from "./parsing.server"

// These helpers must return the calendar day named in the string anchored in UTC,
// regardless of the machine's timezone. The client sends timezone-less local datetimes
// (toApiDateString), which new Date() would otherwise parse in server-local time and
// shift into the previous/next day on any non-UTC machine.
describe("startOfDay", () => {
  it("anchors timezone-less datetime strings to UTC midnight of the named day", () => {
    expect(startOfDay("2026-07-01T00:00:00").toISOString()).toBe("2026-07-01T00:00:00.000Z")
  })

  it("anchors date-only strings to UTC midnight", () => {
    expect(startOfDay("2026-07-01").toISOString()).toBe("2026-07-01T00:00:00.000Z")
  })
})

describe("endOfDay", () => {
  it("anchors timezone-less datetime strings to UTC end of the named day", () => {
    expect(endOfDay("2026-07-31T23:59:59").toISOString()).toBe("2026-07-31T23:59:59.999Z")
  })

  it("anchors date-only strings to UTC end of day", () => {
    expect(endOfDay("2026-07-31").toISOString()).toBe("2026-07-31T23:59:59.999Z")
  })
})

describe("parseCalendarDateUtc", () => {
  it("reads the calendar date from strings with an explicit offset", () => {
    expect(parseCalendarDateUtc("2026-07-01T00:00:00Z", "Date").toISOString()).toBe("2026-07-01T00:00:00.000Z")
  })

  it("rejects invalid dates", () => {
    expect(() => parseCalendarDateUtc("not-a-date", "Date")).toThrow("Date must be a valid date.")
  })
})
