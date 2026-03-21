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
        "border-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),transparent),linear-gradient(135deg,rgba(255,255,255,0.02),rgba(255,255,255,0))] shadow-sm",
        className,
      )}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium tracking-tight text-muted-foreground">
          {icon !== undefined && (
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-md",
                iconBgClassName,
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
        <p className="break-words text-[2rem] leading-none font-semibold tracking-tight text-foreground tabular-nums">
          {value}
        </p>
      </CardContent>
      {footer !== undefined && (
        <CardFooter className="border-t border-border/60 text-xs text-muted-foreground">
          {footer}
        </CardFooter>
      )}
    </Card>
  )
}
