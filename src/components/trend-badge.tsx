import { ArrowDown01Icon, ArrowUp01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

/** "+x.x%" trend text, or "New" when there is no baseline to compare against. */
export function formatTrendLabel(deltaPercent: number | null | undefined): string {
  if (deltaPercent === null || deltaPercent === undefined) {
    return "New"
  }

  return `${deltaPercent > 0 ? "+" : ""}${deltaPercent.toFixed(1)}%`
}

/**
 * Compact trend badge for metric cards: the arrow follows the sign of `delta`,
 * the color follows `isBetter` (emerald = improvement, rose = regression), and
 * a zero delta renders the neutral "Flat" state regardless of `label`.
 */
export function TrendBadge({ delta, isBetter, label }: { delta: number; isBetter: boolean; label: string }) {
  const isNeutral = delta === 0
  const icon = isNeutral ? null : delta > 0 ? ArrowUp01Icon : ArrowDown01Icon
  const toneClassName = isNeutral
    ? "border-border bg-muted/40 text-muted-foreground"
    : isBetter
      ? "border-emerald-500/20 bg-emerald-500/6 text-emerald-700 dark:text-emerald-300"
      : "border-rose-500/20 bg-rose-500/6 text-rose-700 dark:text-rose-300"

  return (
    <div
      className={`inline-flex max-w-full shrink-0 items-center gap-1 rounded-md border px-2 py-1 font-mono text-[10px] leading-none font-medium tracking-[0.14em] uppercase ${toneClassName}`}
    >
      {icon ? <HugeiconsIcon icon={icon} strokeWidth={2} className="size-3.5" /> : null}
      <span>{isNeutral ? "Flat" : label}</span>
    </div>
  )
}
