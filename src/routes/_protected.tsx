import * as React from "react"

import { Outlet, createFileRoute, redirect, useRouter } from "@tanstack/react-router"

import { AppSidebar } from "@/components/app-sidebar"
import { LazyTransactionEditorDialog } from "@/components/lazy-transaction-editor-dialog"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { getAuthRedirect } from "@/lib/auth/auth-redirect"
import { pageActionTypes, usePageAction } from "@/lib/page-actions"
import { currentUserQueryOptions } from "@/features/app/query-options"
import { useLogout } from "@/features/app/hooks"

export const Route = createFileRoute("/_protected")({
  beforeLoad: async ({ location, context }) => {
    // Served from the query cache (60s staleTime) so link hovers and client-side navigations
    // don't fire an auth round-trip each time. Sign-in/out reset this cache entry.
    const user = await context.queryClient.ensureQueryData({
      ...currentUserQueryOptions(),
      revalidateIfStale: true,
    })

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
  const logoutMutation = useLogout()
  const [newTransactionOpen, setNewTransactionOpen] = React.useState(false)

  usePageAction(pageActionTypes.createTransaction, () => setNewTransactionOpen(true))

  const handleLogout = () => {
    // useLogout clears the query cache so the next sign-in never sees this user's data.
    logoutMutation.mutate(undefined, {
      onSuccess: () => router.navigate({ to: "/sign-in", search: { redirect: undefined } }),
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
        isLoggingOut={logoutMutation.isPending}
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
