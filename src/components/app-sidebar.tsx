import * as React from "react"

import { Link, useRouterState } from "@tanstack/react-router"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarRail } from "@/components/ui/sidebar"
import { HugeiconsIcon } from "@hugeicons/react"
import { ChartRingIcon, CommandIcon, CreditCardIcon, Mail01Icon, MapsIcon, PieChartIcon, SentIcon } from "@hugeicons/core-free-icons"

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  user: {
    name: string
    email: string
    avatar?: string
  }
  isLoggingOut: boolean
  onNewTransaction: () => void
  onLogout: () => void
}

export function AppSidebar({ user, isLoggingOut, onNewTransaction, onLogout, ...props }: AppSidebarProps) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })

  const navMainItems = React.useMemo(
    () => [
      {
        title: "Analytics",
        to: "/analytics/cashflow" as const,
        icon: <HugeiconsIcon icon={ChartRingIcon} strokeWidth={2} />,
        isActive: pathname.startsWith("/analytics"),
        items: [
          {
            title: "Cashflow",
            to: "/analytics/cashflow" as const,
            isActive: pathname === "/analytics/cashflow",
          },
          {
            title: "Portfolio",
            to: "/analytics/portfolio" as const,
            isActive: pathname === "/analytics/portfolio",
          },
          {
            title: "Categories",
            to: "/analytics/categories" as const,
            isActive: pathname === "/analytics/categories",
          },
          {
            title: "Compare",
            to: "/analytics/compare" as const,
            isActive: pathname === "/analytics/compare",
          },
        ],
      },
      {
        title: "Accounts",
        to: "/accounts" as const,
        icon: <HugeiconsIcon icon={CreditCardIcon} strokeWidth={2} />,
        isActive: pathname.startsWith("/accounts"),
      },
      {
        title: "Categories",
        to: "/categories" as const,
        icon: <HugeiconsIcon icon={PieChartIcon} strokeWidth={2} />,
        isActive: pathname.startsWith("/categories"),
      },
      {
        title: "Trips",
        to: "/trips" as const,
        icon: <HugeiconsIcon icon={MapsIcon} strokeWidth={2} />,
        isActive: pathname.startsWith("/trips"),
      },
      {
        title: "Transactions",
        to: "/transactions" as const,
        icon: <HugeiconsIcon icon={SentIcon} strokeWidth={2} />,
        isActive: pathname.startsWith("/transactions"),
      },
      {
        title: "Email import",
        to: "/email-import" as const,
        icon: <HugeiconsIcon icon={Mail01Icon} strokeWidth={2} />,
        isActive: pathname.startsWith("/email-import"),
        items: [
          {
            title: "Connections",
            to: "/email-import" as const,
            isActive: pathname === "/email-import",
          },
          {
            title: "Rules",
            to: "/email-import/rules" as const,
            isActive: pathname === "/email-import/rules",
          },
          {
            title: "Review inbox",
            to: "/email-import/review" as const,
            isActive: pathname === "/email-import/review",
          },
        ],
      },
    ],
    [pathname]
  )

  return (
    <Sidebar variant="sidebar" collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className="data-[slot=sidebar-menu-button]:p-1.5!" render={<Link to="/analytics/cashflow" />}>
              <HugeiconsIcon icon={CommandIcon} strokeWidth={2} className="size-5!" />
              <span className="text-base font-semibold">Flamette Money</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain
          items={navMainItems}
          quickAction={{
            title: "New transaction",
            onClick: onNewTransaction,
          }}
        />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} isLoggingOut={isLoggingOut} onLogout={onLogout} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
