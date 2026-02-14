import { createFileRoute } from '@tanstack/react-router'
import { AnalyticsCategoriesView } from '../components/AnalyticsCategoriesView'
import { queryClient } from '../lib/api/queryClient'
import { categorySeriesQueryOptions } from '../lib/api/queryOptions'

export const Route = createFileRoute('/analytics/categories')({
  loader: () =>
    queryClient.prefetchQuery(
      categorySeriesQueryOptions({
        Type: 'Expense',
        Interval: 'Auto',
      }),
    ),
  component: AnalyticsCategoriesView,
})
