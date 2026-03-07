import * as React from "react"

import { Outlet, createRootRoute } from "@tanstack/react-router"
import { QueryClientProvider } from "@tanstack/react-query"

import { AppSidebar } from "@/components/app-sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TooltipProvider } from "@/components/ui/tooltip"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { queryClient } from "@/lib/api/queryClient"
import { useCurrentUser, useLogout } from "@/lib/api/hooks"
import { initials } from "@/lib/finance"
import { Toaster } from "sonner"

export const Route = createRootRoute({
  component: RootApp,
})

function RootApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster richColors position="top-right" />
        <FinanceWorkspace />
      </TooltipProvider>
    </QueryClientProvider>
  )
}

function FinanceWorkspace() {
  const [theme, setTheme] = React.useState<"light" | "dark">("light")
  const currentUserQuery = useCurrentUser()
  const logoutMutation = useLogout()

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const storedTheme = window.localStorage.getItem("flamette-theme")
    const preferredTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light"
    const nextTheme = storedTheme === "dark" || storedTheme === "light" ? storedTheme : preferredTheme
    setTheme(nextTheme)
  }, [])

  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
    window.localStorage.setItem("flamette-theme", theme)
  }, [theme])

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? ""
  const returnUrl = typeof window === "undefined" ? "/" : window.location.href
  const loginHref = `${apiBaseUrl}/api/auth/login/google?returnUrl=${encodeURIComponent(returnUrl)}`

  if (currentUserQuery.isPending) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(217,107,79,0.18),_transparent_42%),radial-gradient(circle_at_bottom_right,_rgba(185,168,138,0.22),_transparent_40%)] px-6 py-10">
        <Card className="w-full max-w-md rounded-[1.75rem] border-border/60 bg-card/85 shadow-xl backdrop-blur">
          <CardHeader>
            <CardTitle>Loading workspace</CardTitle>
            <CardDescription>Restoring your session and finance dashboard.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (!currentUserQuery.data) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(217,107,79,0.22),_transparent_46%),radial-gradient(circle_at_bottom_left,_rgba(185,168,138,0.24),_transparent_42%)] px-6 py-10">
        <Card className="w-full max-w-lg rounded-[2rem] border-border/60 bg-card/85 shadow-2xl backdrop-blur">
          <CardHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <span className="text-lg font-semibold">{initials("Flamette Money")}</span>
              </div>
              <div>
                <CardTitle className="text-3xl tracking-tight">Flamette Money</CardTitle>
                <CardDescription>Sidebar-first personal finance workspace</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm leading-6 text-muted-foreground">
              Continue with Google to manage accounts, categories, trips, transactions, and reporting from a single finance cockpit.
            </p>
            <Button className="w-full" render={<a href={loginHref} />}>
              Continue with Google
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <SidebarProvider defaultOpen>
      <AppSidebar
        user={{
          name: currentUserQuery.data.name,
          email: currentUserQuery.data.email,
        }}
        theme={theme}
        isLoggingOut={logoutMutation.isPending}
        onToggleTheme={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
        onLogout={() => logoutMutation.mutate()}
      />
      <SidebarInset className="bg-[radial-gradient(circle_at_top,_rgba(217,107,79,0.12),_transparent_34%),linear-gradient(180deg,_rgba(255,255,255,0.5),_transparent_28%)] dark:bg-[radial-gradient(circle_at_top,_rgba(217,107,79,0.14),_transparent_30%),linear-gradient(180deg,_rgba(20,20,20,0.6),_transparent_32%)]">
        <div className="min-h-svh px-4 py-4 sm:px-6 sm:py-6">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
            <Outlet />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
