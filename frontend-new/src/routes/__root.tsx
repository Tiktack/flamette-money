import * as React from "react"

import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router"
import type { QueryClient } from "@tanstack/react-query"
import { QueryClientProvider } from "@tanstack/react-query"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { TransactionEditorDialog } from "@/components/transaction-editor-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TooltipProvider } from "@/components/ui/tooltip"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { PAGE_ACTION_EVENT, pageActionTypes, type PageActionType } from "@/lib/page-actions"
import { initials } from "@/lib/finance"
import {
  useCurrentUserProfile,
  useEmailSignIn,
  useEmailSignUp,
  useLogoutProfile,
} from "@/lib/auth/use-auth"
import { Toaster } from "sonner"
import appCss from "@/styles.css?url"

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  head: () => ({
    title: "Flamette Money",
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico" },
      { rel: "manifest", href: "/manifest.json" },
    ],
  }),
  component: RootApp,
})

function RootApp() {
  const { queryClient } = Route.useRouteContext()

  return (
    <RootDocument>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <FinanceWorkspace />
        </TooltipProvider>
      </QueryClientProvider>
    </RootDocument>
  )
}

function FinanceWorkspace() {
  const [theme, setTheme] = React.useState<"light" | "dark">("light")
  const [newTransactionOpen, setNewTransactionOpen] = React.useState(false)
  const currentUserQuery = useCurrentUserProfile()
  const logoutMutation = useLogoutProfile()

  React.useEffect(() => {
    const handlePageAction = (event: Event) => {
      const customEvent = event as CustomEvent<PageActionType>

      if (customEvent.detail === pageActionTypes.createTransaction) {
        setNewTransactionOpen(true)
      }
    }

    window.addEventListener(PAGE_ACTION_EVENT, handlePageAction)
    return () => window.removeEventListener(PAGE_ACTION_EVENT, handlePageAction)
  }, [])

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
      <AuthScreen />
    )
  }

  return (
    <SidebarProvider defaultOpen>
      <AppSidebar
        user={{
          name: currentUserQuery.data.name,
          email: currentUserQuery.data.email,
          avatar: undefined,
        }}
        theme={theme}
        isLoggingOut={logoutMutation.isPending}
        onNewTransaction={() => setNewTransactionOpen(true)}
        onToggleTheme={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
        onLogout={() => logoutMutation.mutate()}
      />
      <SidebarInset className="bg-[radial-gradient(circle_at_top,_rgba(217,107,79,0.12),_transparent_34%),linear-gradient(180deg,_rgba(255,255,255,0.5),_transparent_28%)] dark:bg-[radial-gradient(circle_at_top,_rgba(217,107,79,0.14),_transparent_30%),linear-gradient(180deg,_rgba(20,20,20,0.6),_transparent_32%)]">
        <SiteHeader />
        <div className="min-h-[calc(100svh-3.5rem)] px-4 py-4 sm:px-6 sm:py-6">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
            <Outlet />
          </div>
        </div>
        <TransactionEditorDialog
          open={newTransactionOpen}
          mode="new"
          onOpenChange={setNewTransactionOpen}
        />
      </SidebarInset>
    </SidebarProvider>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}

function AuthScreen() {
  const [mode, setMode] = React.useState<"sign-in" | "sign-up">("sign-in")
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const signInMutation = useEmailSignIn()
  const signUpMutation = useEmailSignUp()

  const isBusy = signInMutation.isPending || signUpMutation.isPending

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage(null)

    try {
      if (mode === "sign-up") {
        await signUpMutation.mutateAsync({
          name,
          email,
          password,
        })
        return
      }

      await signInMutation.mutateAsync({
        email,
        password,
      })
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to continue.")
    }
  }

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
            Manage accounts, categories, trips, transactions, and reporting from a single finance cockpit.
          </p>

          <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
            <Button
              type="button"
              variant={mode === "sign-in" ? "default" : "ghost"}
              onClick={() => setMode("sign-in")}
            >
              Sign in
            </Button>
            <Button
              type="button"
              variant={mode === "sign-up" ? "default" : "ghost"}
              onClick={() => setMode("sign-up")}
            >
              Sign up
            </Button>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {mode === "sign-up" ? (
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  autoComplete="name"
                  disabled={isBusy}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Alek"
                  value={name}
                />
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                autoComplete="email"
                disabled={isBusy}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="alek@example.com"
                type="email"
                value={email}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
                disabled={isBusy}
                minLength={8}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="********"
                type="password"
                value={password}
              />
            </div>

            {errorMessage ? (
              <p className="text-sm text-destructive">{errorMessage}</p>
            ) : null}

            <Button className="w-full" disabled={isBusy} type="submit">
              {isBusy
                ? "Working..."
                : mode === "sign-up"
                  ? "Create account"
                  : "Continue"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
