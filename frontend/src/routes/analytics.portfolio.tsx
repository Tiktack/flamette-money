import { createFileRoute } from '@tanstack/react-router'
import { AnalyticsPortfolioView } from '../components/AnalyticsPortfolioView'
import { queryClient } from '../lib/api/queryClient'
import { currentUserQueryOptions, portfolioBalanceSeriesQueryOptions } from '../lib/api/queryOptions'

export const Route = createFileRoute('/analytics/portfolio')({
  loader: async () => {
    const user = await queryClient.ensureQueryData(currentUserQueryOptions())
    await queryClient.prefetchQuery(
      portfolioBalanceSeriesQueryOptions({
        Interval: 'Auto',
        BaseCurrency: user?.baseCurrency ?? 'USD',
      }),
    )
  },
  component: AnalyticsPortfolioView,
})
