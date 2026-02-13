import { createFileRoute } from '@tanstack/react-router'
import { AnalyticsView } from '../components/AnalyticsView'
import { queryClient } from '../lib/api/queryClient'
import { categorySeriesQueryOptions } from '../lib/api/queryOptions'

export const Route = createFileRoute('/analytics')({
  loader: () =>
    queryClient.prefetchQuery(
      categorySeriesQueryOptions({
        Type: 'Expense',
        Interval: 'Auto',
      }),
    ),
  component: AnalyticsView,
})
