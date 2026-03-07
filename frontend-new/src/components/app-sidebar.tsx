import * as React from "react"

import { Link, useRouterState } from "@tanstack/react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ChartRingIcon,
  CommandIcon,
  CreditCardIcon,
  MapsIcon,
  PieChartIcon,
  SentIcon,
} from "@hugeicons/core-free-icons"

import { NavUser } from "@/components/nav-user"
import { SidebarRail } from "@/components/ui/sidebar"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"

type SidebarChildItem = {
  title: string
  to: "/analytics/comparison" | "/analytics/portfolio" | "/analytics/categories"
}

type SidebarNavItem = {
  title: string
  to: "/analytics" | "/accounts" | "/categories" | "/trips" | "/transactions"
  icon: typeof ChartRingIcon
  children?: SidebarChildItem[]
}

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  user: {
    name: string
    email: string
    avatar?: string
  }
  theme: "light" | "dark"
  isLoggingOut: boolean
  onToggleTheme: () => void
  onLogout: () => void
}

const navigation: SidebarNavItem[] = [
  {
    title: "Analytics",
    to: "/analytics",
    icon: ChartRingIcon,
    children: [
      { title: "Comparison", to: "/analytics/comparison" },
      { title: "Portfolio", to: "/analytics/portfolio" },
      { title: "Categories", to: "/analytics/categories" },
    ],
  },
  { title: "Accounts", to: "/accounts", icon: CreditCardIcon },
  { title: "Categories", to: "/categories", icon: PieChartIcon },
  { title: "Trips", to: "/trips", icon: MapsIcon },
  { title: "Transactions", to: "/transactions", icon: SentIcon },
]

export function AppSidebar({
  user,
  theme,
  isLoggingOut,
  onToggleTheme,
  onLogout,
  ...props
}: AppSidebarProps) {
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  return (
    <Sidebar variant="inset" collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link to="/analytics/comparison" />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-2xl bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
                <HugeiconsIcon icon={CommandIcon} strokeWidth={2} data-icon="inline-start" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">Flamette Money</span>
                <span className="truncate text-xs text-sidebar-foreground/70">Personal finance cockpit</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => {
                const isActive =
                  item.to === "/analytics"
                    ? pathname.startsWith("/analytics")
                    : pathname.startsWith(item.to)

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      render={<Link to={item.to} />}
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <HugeiconsIcon icon={item.icon} strokeWidth={2} data-icon="inline-start" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                    {item.children?.length ? (
                      <SidebarMenuSub>
                        {item.children.map((child) => (
                          <SidebarMenuSubItem key={child.to}>
                            <SidebarMenuSubButton
                              render={<Link to={child.to} />}
                              isActive={pathname === child.to}
                            >
                              {child.title}
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    ) : null}
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          user={user}
          theme={theme}
          isLoggingOut={isLoggingOut}
          onToggleTheme={onToggleTheme}
          onLogout={onLogout}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
