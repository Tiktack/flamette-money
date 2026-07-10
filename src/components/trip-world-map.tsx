import { memo, useCallback, useMemo, useRef, useState } from "react"

import { useTheme } from "next-themes"
import { ComposableMap, Geographies, Geography } from "react-simple-maps"

import { ALPHA2_TO_NUMERIC, COUNTRIES } from "@/lib/countries"
import { formatCurrency, formatDateLabel, toNumber } from "@/lib/finance"

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"

const COLORS = {
  light: {
    bg: "#ffffff",
    border: "#e5e5e5",
    fillDefault: "#e5e5e5",
    fillDefaultHover: "#d4d4d4",
    fillVisited: "#22c55e",
    fillVisitedHover: "#16a34a",
    stroke: "#ffffff",
  },
  dark: {
    bg: "#171717",
    border: "#262626",
    fillDefault: "#3f3f46",
    fillDefaultHover: "#52525b",
    fillVisited: "#16a34a",
    fillVisitedHover: "#15803d",
    stroke: "#171717",
  },
}

// SSR-safe (next-themes resolves after mount) — the previous document.documentElement read
// would throw if this ever rendered on the server.
function useColorScheme() {
  const { resolvedTheme } = useTheme()
  return resolvedTheme === "dark" ? COLORS.dark : COLORS.light
}

export type TripMapItem = {
  id: string
  name: string
  country: string | null
  startDate: string | null
  endDate: string | null
  totalExpenseAmount: number | string
  transactionCount: number | string
}

type CountryData = {
  alpha2: string
  countryName: string
  trips: TripMapItem[]
  totalSpent: number
}

type TripMapProps = {
  trips: TripMapItem[]
  baseCurrency: string
}

type TooltipState = {
  x: number
  y: number
  data: CountryData
} | null

function TripWorldMapInner({ trips, baseCurrency }: TripMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [tooltip, setTooltip] = useState<TooltipState>(null)
  const colors = useColorScheme()

  const byNumericId = useMemo(() => {
    const byAlpha2 = new Map<string, CountryData>()

    for (const trip of trips) {
      if (!trip.country) continue
      const a2 = trip.country.toUpperCase()
      let entry = byAlpha2.get(a2)
      if (!entry) {
        entry = {
          alpha2: a2,
          countryName: COUNTRIES[a2] ?? a2,
          trips: [],
          totalSpent: 0,
        }
        byAlpha2.set(a2, entry)
      }
      entry.trips.push(trip)
      entry.totalSpent += toNumber(trip.totalExpenseAmount)
    }

    const map = new Map<string, CountryData>()
    for (const entry of byAlpha2.values()) {
      const numId = ALPHA2_TO_NUMERIC[entry.alpha2]
      if (numId) map.set(numId, entry)
    }

    return map
  }, [trips])

  const handleMouseEnter = useCallback(
    (geoId: string, event: React.MouseEvent) => {
      const data = byNumericId.get(geoId)
      if (!data) return
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      setTooltip({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        data,
      })
    },
    [byNumericId]
  )

  const handleMouseMove = useCallback(
    (geoId: string, event: React.MouseEvent) => {
      if (!byNumericId.has(geoId)) return
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      setTooltip((prev) =>
        prev
          ? {
              ...prev,
              x: event.clientX - rect.left,
              y: event.clientY - rect.top,
            }
          : prev
      )
    },
    [byNumericId]
  )

  const handleMouseLeave = useCallback(() => {
    setTooltip(null)
  }, [])

  return (
    <div ref={containerRef} className="relative overflow-hidden rounded-2xl border shadow-sm" style={{ background: colors.bg, borderColor: colors.border }}>
      <ComposableMap
        projection="geoNaturalEarth1"
        projectionConfig={{ scale: 155, center: [10, 10] }}
        width={900}
        height={460}
        style={{ width: "100%", height: "auto", display: "block" }}
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const geoId = geo.id as string
              const countryData = byNumericId.get(geoId)
              const isVisited = Boolean(countryData)

              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={isVisited ? colors.fillVisited : colors.fillDefault}
                  stroke={colors.stroke}
                  strokeWidth={0.6}
                  onMouseEnter={(event) => handleMouseEnter(geoId, event)}
                  onMouseMove={(event) => handleMouseMove(geoId, event)}
                  onMouseLeave={handleMouseLeave}
                  style={{
                    default: {
                      outline: "none",
                      cursor: isVisited ? "pointer" : "default",
                    },
                    hover: {
                      outline: "none",
                      fill: isVisited ? colors.fillVisitedHover : colors.fillDefaultHover,
                      cursor: isVisited ? "pointer" : "default",
                    },
                    pressed: { outline: "none" },
                  }}
                />
              )
            })
          }
        </Geographies>
      </ComposableMap>

      {tooltip ? <CountryTooltip tooltip={tooltip} baseCurrency={baseCurrency} /> : null}
    </div>
  )
}

function CountryTooltip({ tooltip, baseCurrency }: { tooltip: NonNullable<TooltipState>; baseCurrency: string }) {
  const { data } = tooltip

  return (
    <div
      className="pointer-events-none absolute z-50 w-64 rounded-xl border border-border bg-popover p-3.5 shadow-lg"
      style={{
        left: tooltip.x,
        top: tooltip.y,
        transform: "translate(-50%, -110%)",
      }}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-foreground">{data.countryName}</span>
        <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-xs font-medium text-primary">{formatCurrency(data.totalSpent, baseCurrency)}</span>
      </div>

      <div className="space-y-1.5">
        {data.trips.map((trip) => (
          <div key={trip.id} className="flex items-center justify-between gap-2 text-xs">
            <span className="truncate text-muted-foreground">{trip.name}</span>
            <span className="shrink-0 text-muted-foreground/70">{formatDateLabel(trip.startDate)}</span>
          </div>
        ))}
      </div>

      <div className="mt-2 border-t border-border/60 pt-2 text-xs text-muted-foreground">
        {data.trips.reduce((sum, t) => sum + toNumber(t.transactionCount), 0)} transactions across {data.trips.length}{" "}
        {data.trips.length === 1 ? "trip" : "trips"}
      </div>
    </div>
  )
}

export const TripWorldMap = memo(TripWorldMapInner)
