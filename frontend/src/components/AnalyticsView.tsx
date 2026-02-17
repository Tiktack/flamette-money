import { Link, Outlet, useRouterState } from '@tanstack/react-router'
import { Card, Group, Stack } from '@mantine/core'
import { IconChartBar, IconChartLine, IconCategory } from '@tabler/icons-react'
import classes from '../routes/analytics.module.css'

export function AnalyticsView() {
  const { location } = useRouterState()

  const links = [
    { label: 'Comparison', to: '/analytics/comparison', icon: IconChartBar },
    { label: 'Portfolio', to: '/analytics/portfolio', icon: IconChartLine },
    { label: 'Categories', to: '/analytics/categories', icon: IconCategory },
  ] as const

  return (
    <Stack className={classes.page}>
      <Card className={classes.dateCard}>
        <Group gap="xs" className={classes.analyticsNav}>
          {links.map((item) => {
            const isActive = location.pathname === item.to
            const Icon = item.icon

            return (
              <Link
                key={item.to}
                to={item.to}
                className={classes.analyticsLink}
                data-active={isActive || undefined}
              >
                <Icon size={16} stroke={1.8} className={classes.analyticsLinkIcon} />
                {item.label}
              </Link>
            )
          })}
        </Group>
      </Card>

      <Outlet />
    </Stack>
  )
}
