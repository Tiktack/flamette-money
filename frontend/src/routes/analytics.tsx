import { createFileRoute, redirect } from '@tanstack/react-router'
import { AnalyticsView } from '../components/AnalyticsView'

export const Route = createFileRoute('/analytics')({
  beforeLoad: ({ location }) => {
    if (location.pathname === '/analytics') {
      throw redirect({ to: '/analytics/comparison' })
    }
  },
  component: AnalyticsView,
})
