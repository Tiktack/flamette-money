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
