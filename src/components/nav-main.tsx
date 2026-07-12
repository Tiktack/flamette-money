import { Link } from "@tanstack/react-router"

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowRight01Icon, PlusSignCircleIcon } from "@hugeicons/core-free-icons"

type AppRoute =
  | "/analytics/cashflow"
  | "/analytics/portfolio"
  | "/analytics/categories"
  | "/analytics/compare"
  | "/accounts"
  | "/categories"
  | "/trips"
  | "/transactions"
  | "/email-import"
  | "/email-import/rules"
  | "/email-import/review"

export function NavMain({
  items,
  quickAction,
}: {
  items: {
    title: string
    to: AppRoute
    icon?: React.ReactNode
    isActive?: boolean
    items?: {
      title: string
      to: AppRoute
      isActive?: boolean
    }[]
  }[]
  quickAction?: {
    title: string
    onClick?: () => void
  }
}) {
  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        {quickAction ? (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip={quickAction.title}
                className="min-w-8 bg-primary text-primary-foreground duration-200 ease-linear hover:bg-primary/95 hover:text-primary-foreground active:bg-primary/95 active:text-primary-foreground"
                onClick={quickAction.onClick}
              >
                <HugeiconsIcon icon={PlusSignCircleIcon} strokeWidth={2} />
                <span>{quickAction.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        ) : null}

        <SidebarMenu>
          {items.map((item) =>
            item.items?.length ? (
              <Collapsible key={item.title} defaultOpen={item.isActive} render={<SidebarMenuItem />}>
                <SidebarMenuButton tooltip={item.title} isActive={item.isActive} render={<CollapsibleTrigger />}>
                  {item.icon}
                  <span>{item.title}</span>
                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    strokeWidth={2}
                    className="ml-auto text-sidebar-foreground/60 transition-transform duration-200 group-data-[collapsible=icon]:hidden group-data-[panel-open]/menu-button:rotate-90"
                  />
                </SidebarMenuButton>

                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.to}>
                        <SidebarMenuSubButton render={<Link to={subItem.to} />} isActive={subItem.isActive}>
                          {subItem.title}
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </Collapsible>
            ) : (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton tooltip={item.title} isActive={item.isActive} render={<Link to={item.to} />}>
                  {item.icon}
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
