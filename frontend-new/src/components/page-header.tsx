import type { ReactNode } from "react"

import { SidebarTrigger } from "@/components/ui/sidebar"

type PageHeaderProps = {
  title: string
  description: string
  actions?: ReactNode
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 rounded-[1.75rem] border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <SidebarTrigger className="md:hidden" />
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {title}
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </div>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  )
}
