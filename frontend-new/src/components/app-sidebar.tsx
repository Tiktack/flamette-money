import * as React from "react"

import { Link, useRouterState } from "@tanstack/react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ChartRingIcon,
  CommandIcon,
  CreditCardIcon,
  LogoutIcon,
  MapsIcon,
  Moon02Icon,
  PieChartIcon,
  SentIcon,
  Settings05Icon,
  Sun03Icon,
} from "@hugeicons/core-free-icons"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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

import { initials } from "@/lib/finance"

type SidebarChildItem = {
  title: string
  to: "/analytics/comparison" | "/analytics/portfolio" | "/analytics/categories"
}

type SidebarNavItem = {
  title: string
  to: "/analytics" | "/accounts" | "/categories" | "/trips" | "/transactions" | "/settings"
  icon: typeof ChartRingIcon
  children?: SidebarChildItem[]
}

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  user: {
    name: string
    email: string
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
  { title: "Settings", to: "/settings", icon: Settings05Icon },
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

        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel>Highlights</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="rounded-2xl border border-sidebar-border/80 bg-sidebar-accent/50 p-4 text-sm">
              <p className="font-medium text-sidebar-foreground">Same backend, new shell</p>
              <p className="mt-1 text-sidebar-foreground/70">
                Rebuilt on shadcn/ui with a sidebar-first workspace and compact reporting views.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="secondary">Charts</Badge>
                <Badge variant="secondary">CRUD</Badge>
                <Badge variant="secondary">Filters</Badge>
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="rounded-2xl border border-sidebar-border/80 bg-sidebar-accent/40 p-3">
          <div className="flex items-center gap-3">
            <Avatar className="size-10 border border-sidebar-border bg-sidebar-primary/10">
              <AvatarFallback>{initials(user.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-sidebar-foreground">{user.name}</p>
              <p className="truncate text-xs text-sidebar-foreground/70">{user.email}</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onToggleTheme}>
              <HugeiconsIcon
                icon={theme === "dark" ? Sun03Icon : Moon02Icon}
                strokeWidth={2}
                data-icon="inline-start"
              />
              {theme === "dark" ? "Light" : "Dark"}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={onLogout} disabled={isLoggingOut}>
              <HugeiconsIcon icon={LogoutIcon} strokeWidth={2} data-icon="inline-start" />
              {isLoggingOut ? "Leaving" : "Logout"}
            </Button>
          </div>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
