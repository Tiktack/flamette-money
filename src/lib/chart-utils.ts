import { COUNTRIES, countryFlag } from "@/lib/countries"

/**
 * Parse a report `bucketKey` into a `Date` for the time-series charts.
 * Day/Week buckets are `"YYYY-MM-DD"`, Month buckets are `"YYYY-MM"`.
 * Falls back to an index-based date for non-date keys (e.g. the `"all"` bucket).
 */
export function bucketKeyToDate(key: string, index = 0): Date {
  const match = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(key)
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, match[3] ? Number(match[3]) : 1)
  }
  return new Date(2000, 0, 1 + index)
}

export interface TripMarkerInput {
  name: string
  country?: string | null
  startDate?: string | null
}

export interface ChartTripMarker {
  date: Date
  icon: string
  title: string
  description?: string
}

/**
 * Build chart markers for trips that fall inside the chart's date range.
 * Each trip's start date is snapped to the nearest bucket date so the marker
 * lines up with a data point (and surfaces in that point's tooltip).
 */
export function buildTripMarkers(trips: TripMarkerInput[], bucketDates: Date[]): ChartTripMarker[] {
  if (bucketDates.length === 0) {
    return []
  }

  const times = bucketDates.map((date) => date.getTime())
  const min = Math.min(...times)
  const max = Math.max(...times)

  const markers: ChartTripMarker[] = []
  for (const trip of trips) {
    if (!trip.startDate) {
      continue
    }
    const time = new Date(trip.startDate).getTime()
    if (!Number.isFinite(time) || time < min || time > max) {
      continue
    }

    let nearest = bucketDates[0]!
    let best = Number.POSITIVE_INFINITY
    for (const date of bucketDates) {
      const diff = Math.abs(date.getTime() - time)
      if (diff < best) {
        best = diff
        nearest = date
      }
    }

    const code = trip.country?.trim()
    markers.push({
      date: nearest,
      icon: code ? countryFlag(code) : "✈️",
      title: trip.name,
      description: code ? (COUNTRIES[code.toUpperCase()] ?? code) : undefined,
    })
  }

  return markers
}

export function formatCompactNumber(value: number | string | null | undefined) {
  const num = Number(value ?? 0)
  try {
    return new Intl.NumberFormat(undefined, {
      notation: "compact",
      compactDisplay: "short",
      maximumFractionDigits: 0,
    })
      .format(num)
      .toLowerCase()
  } catch {
    // Fallback for environments without compact notation
    const abs = Math.abs(num)
    if (abs >= 1_000_000) return `${Math.round(num / 1_000_000)}m`
    if (abs >= 1_000) return `${Math.round(num / 1_000)}k`
    return String(Math.round(num))
  }
}
