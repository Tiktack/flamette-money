import { Link, Outlet, createFileRoute, useRouterState } from "@tanstack/react-router"

import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

const links = [
  { label: "Comparison", to: "/analytics/comparison" },
  { label: "Portfolio", to: "/analytics/portfolio" },
  { label: "Categories", to: "/analytics/categories" },
] as const

export const Route = createFileRoute("/analytics")({
  component: AnalyticsLayout,
})

function AnalyticsLayout() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Analytics"
        description="Track year-over-year changes, portfolio balance movement, and category performance from one reporting surface."
      />

      <Card className="border-border/60 bg-card/80 shadow-sm">
        <CardContent className="flex flex-wrap gap-2 p-3">
          {links.map((item) => (
            <Button
              key={item.to}
              variant={pathname === item.to ? "default" : "ghost"}
              size="sm"
              render={<Link to={item.to} />}
            >
              {item.label}
            </Button>
          ))}
        </CardContent>
      </Card>

      <Outlet />
    </div>
  )
}

