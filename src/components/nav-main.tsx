"use client"

import { Link } from "@tanstack/react-router"

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenuAction,
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
  | "/analytics/comparison"
  | "/analytics/portfolio"
  | "/analytics/categories"
  | "/accounts"
  | "/categories"
  | "/trips"
  | "/transactions"

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
    to?: AppRoute
    onClick?: () => void
  }
}) {
  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        {quickAction ? (
          <SidebarMenu>
            <SidebarMenuItem>
              {quickAction.to ? (
                <SidebarMenuButton
                  tooltip={quickAction.title}
                  className="min-w-8 bg-primary text-primary-foreground duration-200 ease-linear hover:bg-primary/95 hover:text-primary-foreground active:bg-primary/95 active:text-primary-foreground"
                  render={<Link to={quickAction.to} />}
                >
                  <HugeiconsIcon icon={PlusSignCircleIcon} strokeWidth={2} />
                  <span>{quickAction.title}</span>
                </SidebarMenuButton>
              ) : (
                <SidebarMenuButton
                  tooltip={quickAction.title}
                  className="min-w-8 bg-primary text-primary-foreground duration-200 ease-linear hover:bg-primary/95 hover:text-primary-foreground active:bg-primary/95 active:text-primary-foreground"
                  onClick={quickAction.onClick}
                >
                  <HugeiconsIcon icon={PlusSignCircleIcon} strokeWidth={2} />
                  <span>{quickAction.title}</span>
                </SidebarMenuButton>
              )}
            </SidebarMenuItem>
          </SidebarMenu>
        ) : null}

        <SidebarMenu>
          {items.map((item) => (
            <Collapsible key={item.title} defaultOpen={item.isActive} render={<SidebarMenuItem />}>
              <SidebarMenuButton tooltip={item.title} isActive={item.isActive} render={<Link to={item.to} />}>
                {item.icon}
                <span>{item.title}</span>
              </SidebarMenuButton>

              {item.items?.length ? (
                <>
                  <CollapsibleTrigger render={<SidebarMenuAction className="aria-expanded:rotate-90" />}>
                    <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
                    <span className="sr-only">Toggle {item.title}</span>
                  </CollapsibleTrigger>

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
                </>
              ) : null}
            </Collapsible>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
