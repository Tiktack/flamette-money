import { createFileRoute } from '@tanstack/react-router'
import { AnalyticsComparisonView } from '../components/AnalyticsComparisonView'
import { queryClient } from '../lib/api/queryClient'
import { monthlyYoyQueryOptions } from '../lib/api/queryOptions'

export const Route = createFileRoute('/analytics/comparison')({
  loader: () =>
    queryClient.prefetchQuery(
      monthlyYoyQueryOptions({
        Type: 'Expense',
        StartYear: new Date().getFullYear() - 2,
        EndYear: new Date().getFullYear(),
      }),
    ),
  component: AnalyticsComparisonView,
})
