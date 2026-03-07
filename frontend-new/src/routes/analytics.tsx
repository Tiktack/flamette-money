import { Outlet, createFileRoute } from "@tanstack/react-router"

import { PageHeader } from "@/components/page-header"

export const Route = createFileRoute("/analytics")({
  component: AnalyticsLayout,
})

function AnalyticsLayout() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Analytics" />
      <Outlet />
    </div>
  )
}

