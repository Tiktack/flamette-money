import * as React from "react"

import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export type MetricCardIcon = Parameters<typeof HugeiconsIcon>[0]["icon"]

export interface MetricCardProps {
  label: string
  value: React.ReactNode
  /** Rendered below a border-t separator at the bottom of the card. */
  footer?: React.ReactNode
  /** Rendered in the CardAction slot (top-right). Ideal for trend badges. */
  badge?: React.ReactNode
  icon?: MetricCardIcon
  iconBgClassName?: string
  iconColorClassName?: string
  className?: string
}

export function MetricCard({
  label,
  value,
  footer,
  badge,
  icon,
  iconBgClassName,
  iconColorClassName,
  className,
}: MetricCardProps) {
  return (
    <Card
      size="sm"
      className={cn(
        "relative overflow-hidden border-border bg-card/95 shadow-none",
        "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-primary/28 before:to-transparent",
        className
      )}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-mono text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
          {icon !== undefined && (
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-md",
                iconBgClassName
              )}
            >
              <HugeiconsIcon
                icon={icon}
                strokeWidth={2}
                className={cn("size-3.5", iconColorClassName)}
              />
            </span>
          )}
          {label}
        </CardTitle>
        {badge !== undefined && <CardAction>{badge}</CardAction>}
      </CardHeader>
      <CardContent>
        <p className="break-words text-[2rem] leading-none font-semibold tracking-[-0.035em] text-foreground tabular-nums">
          {value}
        </p>
      </CardContent>
      {footer !== undefined && (
        <CardFooter className="justify-between border-t border-border font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
          {footer}
        </CardFooter>
      )}
    </Card>
  )
}
