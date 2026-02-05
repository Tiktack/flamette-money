import { createFileRoute } from '@tanstack/react-router'
import { AnalyticsView } from '../components/AnalyticsView'

export const Route = createFileRoute('/analytics')({
  component: AnalyticsView,
})
