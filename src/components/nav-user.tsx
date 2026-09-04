import * as React from "react"

import { Link } from "@tanstack/react-router"
import { useTheme } from "next-themes"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar"
import { HugeiconsIcon } from "@hugeicons/react"
import { ComputerIcon, Logout01Icon, Moon02Icon, MoreVerticalCircle01Icon, Settings05Icon, Sun03Icon } from "@hugeicons/core-free-icons"

import { initials } from "@/lib/finance"
import { isThemeMode, themeLabels, themeModes, type ThemeMode } from "@/lib/theme"

const themeIcons: Record<ThemeMode, typeof Sun03Icon> = {
  light: Sun03Icon,
  dark: Moon02Icon,
  system: ComputerIcon,
}

const subscribeToHydration = () => () => {}

export function NavUser({
  user,
  isLoggingOut,
  onLogout,
}: {
  user: {
    name: string
    email: string
    avatar?: string
  }
  isLoggingOut: boolean
  onLogout: () => void
}) {
  const { isMobile } = useSidebar()
  const { theme, setTheme } = useTheme()
  const mounted = React.useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false
  )
  const selectedTheme: ThemeMode = mounted && isThemeMode(theme) ? theme : "system"

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger render={<SidebarMenuButton size="lg" className="aria-expanded:bg-muted" />}>
            <Avatar className="size-8 rounded-lg grayscale">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="rounded-lg">{initials(user.name)}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user.name}</span>
              <span className="truncate font-mono text-[11px] tracking-[0.08em] text-foreground/55">{user.email}</span>
            </div>
            <HugeiconsIcon icon={MoreVerticalCircle01Icon} strokeWidth={2} className="ml-auto" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="min-w-60" side={isMobile ? "bottom" : "right"} align="end" sideOffset={4}>
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="size-8">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="rounded-lg">{initials(user.name)}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="truncate text-xs text-muted-foreground">{user.email}</span>
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
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <HugeiconsIcon icon={ComputerIcon} strokeWidth={2} />
                  Appearance
                  {mounted ? <DropdownMenuShortcut>{themeLabels[selectedTheme]}</DropdownMenuShortcut> : null}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Theme</DropdownMenuLabel>
                    {mounted ? (
                      <DropdownMenuRadioGroup
                        value={selectedTheme}
                        onValueChange={(value) => {
                          if (isThemeMode(value)) {
                            setTheme(value)
                          }
                        }}
                      >
                        {themeModes.map((mode) => (
                          <DropdownMenuRadioItem key={mode} value={mode}>
                            <HugeiconsIcon icon={themeIcons[mode]} strokeWidth={2} />
                            {themeLabels[mode]}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    ) : null}
                  </DropdownMenuGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
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
