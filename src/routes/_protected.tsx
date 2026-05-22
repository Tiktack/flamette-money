import * as React from "react"

import { Outlet, createFileRoute, redirect, useRouter } from "@tanstack/react-router"

import { AppSidebar } from "@/components/app-sidebar"
import { LazyTransactionEditorDialog } from "@/components/lazy-transaction-editor-dialog"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { getAuthRedirect } from "@/lib/auth/auth-redirect"
import { PAGE_ACTION_EVENT, pageActionTypes, type PageActionType } from "@/lib/page-actions"
import { getCurrentUserProfile } from "@/lib/auth/functions"
import { authClient } from "@/lib/auth/client"

export const Route = createFileRoute("/_protected")({
  beforeLoad: async ({ location }) => {
    const user = await getCurrentUserProfile()

    if (!user) {
      throw redirect({
        to: "/sign-in",
        search: { redirect: getAuthRedirect(location.href) },
      })
    }

    return { user }
  },
  component: ProtectedLayout,
})

function ProtectedLayout() {
  const { user } = Route.useRouteContext()
  const router = useRouter()
  const [newTransactionOpen, setNewTransactionOpen] = React.useState(false)
  const [isLoggingOut, setIsLoggingOut] = React.useState(false)

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

  const handleLogout = () => {
    setIsLoggingOut(true)
    authClient.signOut({
      fetchOptions: {
        onSuccess: () => router.history.push("/sign-in"),
        onError: () => setIsLoggingOut(false),
      },
    })
  }

  return (
    <SidebarProvider defaultOpen>
      <AppSidebar
        user={{
          name: user.name,
          email: user.email,
          avatar: undefined,
        }}
        isLoggingOut={isLoggingOut}
        onNewTransaction={() => setNewTransactionOpen(true)}
        onLogout={handleLogout}
      />
      <SidebarInset className="bg-[radial-gradient(circle_at_top,oklch(0.56_0.20_50/5%),transparent_34%),linear-gradient(180deg,oklch(0.99_0.006_58/55%),transparent_28%)] dark:bg-[radial-gradient(circle_at_top,oklch(0.72_0.16_55/8%),transparent_32%)]">
        <SiteHeader />
        <div className="min-h-[calc(100svh-3.5rem)] px-4 py-4 sm:px-6 sm:py-6">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
            <Outlet />
          </div>
        </div>
        <LazyTransactionEditorDialog open={newTransactionOpen} mode="new" onOpenChange={setNewTransactionOpen} />
      </SidebarInset>
    </SidebarProvider>
  )
}
