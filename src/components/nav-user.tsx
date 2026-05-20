"use client"

import { Link } from "@tanstack/react-router"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Logout01Icon,
  Moon02Icon,
  MoreVerticalCircle01Icon,
  Settings05Icon,
  Sun03Icon,
} from "@hugeicons/core-free-icons"

import { initials } from "@/lib/finance"

export function NavUser({
  user,
  theme,
  isLoggingOut,
  onToggleTheme,
  onLogout,
}: {
  user: {
    name: string
    email: string
    avatar?: string
  }
  theme: "light" | "dark"
  isLoggingOut: boolean
  onToggleTheme: () => void
  onLogout: () => void
}) {
  const { isMobile } = useSidebar()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton size="lg" className="aria-expanded:bg-muted" />
            }
          >
            <Avatar className="size-8 rounded-lg grayscale">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="rounded-lg">
                {initials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user.name}</span>
              <span className="truncate font-mono text-[11px] tracking-[0.08em] text-foreground/55">
                {user.email}
              </span>
            </div>
            <HugeiconsIcon
              icon={MoreVerticalCircle01Icon}
              strokeWidth={2}
              className="ml-auto size-4"
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="size-8">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="rounded-lg">
                      {initials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user.email}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem render={<Link to="/settings" />}>
                <HugeiconsIcon icon={Settings05Icon} strokeWidth={2} />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onToggleTheme}>
                <HugeiconsIcon
                  icon={theme === "dark" ? Sun03Icon : Moon02Icon}
                  strokeWidth={2}
                />
                {theme === "dark" ? "Light theme" : "Dark theme"}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onLogout} disabled={isLoggingOut}>
              <HugeiconsIcon icon={Logout01Icon} strokeWidth={2} />
              {isLoggingOut ? "Logging out" : "Log out"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
