import { createFileRoute } from '@tanstack/react-router'
import { AnalyticsView } from './analyticsView'

export const Route = createFileRoute('/')({
  component: AnalyticsView,
})
