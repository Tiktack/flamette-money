import type { ReactNode } from "react"

type EmptyStateProps = {
  eyebrow?: string
  title: string
  description: string
  action?: ReactNode
}

export function EmptyState({
  eyebrow,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="rounded-[1.75rem] border border-dashed border-border bg-card/70 p-8 text-center shadow-sm">
      <div className="mx-auto flex max-w-xl flex-col items-center gap-3">
        {eyebrow ? (
          <span className="font-mono text-xs tracking-widest text-primary/70 uppercase">
            {eyebrow}
          </span>
        ) : null}
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        {action ? <div className="pt-2">{action}</div> : null}
      </div>
    </div>
  )
}
