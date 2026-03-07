import { Outlet, createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/analytics")({
  component: AnalyticsLayout,
})

function AnalyticsLayout() {
  return (
    <div className="flex flex-col gap-6">
      <Outlet />
    </div>
  )
}

