import * as React from "react"

import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"
import { Card, CardAction, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export type MetricCardIcon = Parameters<typeof HugeiconsIcon>[0]["icon"]

export interface MetricCardProps {
  label: string
  value: React.ReactNode
  /** Rendered below a border-t separator at the bottom of the card. */
  footer?: React.ReactNode
  footerClassName?: string
  /** Rendered in the CardAction slot (top-right). Ideal for trend badges. */
  badge?: React.ReactNode
  icon?: MetricCardIcon
  iconBgClassName?: string
  iconColorClassName?: string
  valueClassName?: string
  className?: string
}

export function MetricCard({
  label,
  value,
  footer,
  footerClassName,
  badge,
  icon,
  iconBgClassName,
  iconColorClassName,
  valueClassName,
  className,
}: MetricCardProps) {
  const valueClasses = cn(
    "min-w-0 break-words text-[1.25rem] leading-[1] font-semibold tracking-[-0.04em] text-foreground tabular-nums @[15rem]/card:text-[1.45rem] @[18rem]/card:text-[1.65rem]",
    valueClassName
  )

  return (
    <Card
      size="sm"
      className={cn(
        "relative min-w-0 @container/card overflow-hidden border-border bg-card/95 shadow-none",
        "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-primary/28 before:to-transparent",
        className
      )}
    >
      <CardHeader className="gap-2 pb-0">
        <CardTitle className="flex items-center gap-2 font-mono text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
          {icon !== undefined && (
            <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-md", iconBgClassName)}>
              <HugeiconsIcon icon={icon} strokeWidth={2} className={cn("size-3.5", iconColorClassName)} />
            </span>
          )}
          {label}
        </CardTitle>
        {badge !== undefined && <CardAction>{badge}</CardAction>}
      </CardHeader>
      <CardContent className="pt-0">
        {typeof value === "string" || typeof value === "number" ? <p className={valueClasses}>{value}</p> : <div className={valueClasses}>{value}</div>}
      </CardContent>
      {footer !== undefined && (
        <CardFooter
          className={cn(
            "justify-between gap-3 border-t border-border font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase",
            footerClassName
          )}
        >
          {footer}
        </CardFooter>
      )}
    </Card>
  )
}
