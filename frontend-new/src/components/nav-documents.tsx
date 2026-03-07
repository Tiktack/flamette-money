import { Link } from "@tanstack/react-router"

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

type AnalyticsRoute =
  | "/analytics/comparison"
  | "/analytics/portfolio"
  | "/analytics/categories"

export function NavDocuments({
  label = "Analytics Views",
  items,
}: {
  label?: string
  items: {
    name: string
    to: AnalyticsRoute
    isActive?: boolean
  }[]
}) {
  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.name}>
            <SidebarMenuButton
              render={<Link to={item.to} />}
              isActive={item.isActive}
            >
              <span>{item.name}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
