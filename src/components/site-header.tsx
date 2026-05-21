import * as React from "react"

import { Link, useRouterState } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { dispatchPageAction, pageActionTypes } from "@/lib/page-actions"

const breadcrumbLabelMap: Record<string, string> = {
  accounts: "Accounts",
  analytics: "Analytics",
  categories: "Categories",
  comparison: "Comparison",
  portfolio: "Portfolio",
  settings: "Settings",
  transactions: "Transactions",
  trips: "Trips",
}

export function SiteHeader() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })

  const breadcrumbs = pathname
    .split("/")
    .filter(Boolean)
    .map((segment, index, segments) => ({
      href: `/${segments.slice(0, index + 1).join("/")}`,
      label: breadcrumbLabelMap[segment] ?? toTitleCase(segment),
    }))

  const currentLabel = breadcrumbs.at(-1)?.label ?? "Workspace"
  const action = React.useMemo(() => {
    if (pathname === "/transactions") {
      return {
        label: "Add transaction",
        onClick: () => dispatchPageAction(pageActionTypes.createTransaction),
      }
    }

    if (pathname === "/accounts") {
      return {
        label: "Add account",
        onClick: () => dispatchPageAction(pageActionTypes.createAccount),
      }
    }

    if (pathname === "/categories") {
      return {
        label: "Add category",
        onClick: () => dispatchPageAction(pageActionTypes.createCategory),
      }
    }

    if (pathname === "/trips") {
      return {
        label: "Add trip",
        onClick: () => dispatchPageAction(pageActionTypes.createTrip),
      }
    }

    return null
  }, [pathname])

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="flex w-full items-center gap-3 px-4 sm:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="h-4 data-vertical:self-auto" />

        <div className="min-w-0 flex-1">
          {breadcrumbs.length > 1 ? (
            <Breadcrumb>
              <BreadcrumbList>
                {breadcrumbs.map((item, index) => {
                  const isLast = index === breadcrumbs.length - 1

                  return (
                    <React.Fragment key={item.href}>
                      <BreadcrumbItem>
                        {isLast ? (
                          <BreadcrumbPage className="font-medium text-primary">{item.label}</BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink render={<Link to={item.href} />}>{item.label}</BreadcrumbLink>
                        )}
                      </BreadcrumbItem>
                      {!isLast ? <BreadcrumbSeparator className="text-muted-foreground/50">·</BreadcrumbSeparator> : null}
                    </React.Fragment>
                  )
                })}
              </BreadcrumbList>
            </Breadcrumb>
          ) : null}

          <div className="truncate text-sm font-medium text-foreground sm:text-base">{currentLabel}</div>
        </div>

        {action ? (
          <div className="flex items-center gap-2">
            <Button onClick={action.onClick}>{action.label}</Button>
          </div>
        ) : null}
      </div>
    </header>
  )
}

function toTitleCase(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}
