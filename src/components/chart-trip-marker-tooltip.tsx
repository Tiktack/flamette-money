import { MarkerTooltipContent, useActiveMarkers, type ChartMarker } from "@/components/charts/markers"

/**
 * Renders inside a `<ChartTooltip>` to show any trip markers attached to the
 * currently hovered data point. Returns nothing when the point has no trips.
 */
export function ChartTripMarkerTooltip({ markers }: { markers: ChartMarker[] }) {
  const activeMarkers = useActiveMarkers(markers)
  return <MarkerTooltipContent markers={activeMarkers} />
}
