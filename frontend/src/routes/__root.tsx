import { createRootRoute, Link, Outlet, useRouterState } from '@tanstack/react-router'
import {
  AppShell,
  Box,
  Button,
  Group,
  Menu,
  Title,
} from '@mantine/core'
import classes from './rootLayout.module.css'

const navItems = [
  { label: 'Analytics', to: '/' },
  { label: 'Accounts', to: '/accounts' },
  { label: 'Categories', to: '/categories' },
  { label: 'Transactions', to: '/transactions' },
]

const menuItems = [
  { label: 'Budgets', to: '/analytics' },
  { label: 'Reports', to: '/analytics' },
  { label: 'Import', to: '/transactions' },
]

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  const { location } = useRouterState()

  return (
    <AppShell header={{ height: 72 }} padding="lg">
      <AppShell.Header className={classes.header}>
        <Group h="100%" px="lg" justify="space-between" align="center">
          <Group gap="lg" align="center" wrap="nowrap">
            <Title order={3} className={classes.brand}>
              Flamette Money
            </Title>
            <Group gap="xs" className={classes.navGroup}>
              {navItems.map((item) => {
                const isActive =
                  item.to === '/'
                    ? location.pathname === '/'
                    : location.pathname.startsWith(item.to)

                return (
                  <Button
                    key={item.to}
                    component={Link}
                    to={item.to}
                    variant={isActive ? 'light' : 'subtle'}
                    className={classes.navLink}
                  >
                    {item.label}
                  </Button>
                )
              })}
              <Menu position="bottom-start" withinPortal>
                <Menu.Target>
                  <Button variant="subtle" className={classes.navLink}>
                    More
                  </Button>
                </Menu.Target>
                <Menu.Dropdown>
                  {menuItems.map((item) => (
                    <Menu.Item key={item.label} component={Link} to={item.to}>
                      {item.label}
                    </Menu.Item>
                  ))}
                </Menu.Dropdown>
              </Menu>
            </Group>
          </Group>
          <Group gap="xs" className={classes.toolbar}>
            <Button variant="light">New transaction</Button>
            <Button variant="outline">New account</Button>
          </Group>
        </Group>
      </AppShell.Header>
      <AppShell.Main className={classes.content}>
        <Box>
          <Outlet />
        </Box>
      </AppShell.Main>
    </AppShell>
  )
}
