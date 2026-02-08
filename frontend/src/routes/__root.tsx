import { createRootRoute, Link, Outlet, useRouterState } from '@tanstack/react-router'
import {
  AppShell,
  Box,
  Button,
  Group,
  Menu,
  Title,
} from '@mantine/core'
import { TransactionEditorModal, type TransactionModalMode } from '../components/TransactionEditorModal'
import type { TransactionType } from '../lib/api/types'
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

type RootSearch = {
  transactionMode?: TransactionModalMode
  transactionId?: string
  transactionCategoryId?: string
  transactionType?: TransactionType
}

const isTransactionMode = (value: unknown): value is TransactionModalMode =>
  value === 'new' || value === 'edit'

const isTransactionType = (value: unknown): value is TransactionType =>
  value === 'Income' || value === 'Expense' || value === 'Transfer' || value === 'Refund'

export const Route = createRootRoute({
  component: RootLayout,
  validateSearch: (search: Record<string, unknown>): RootSearch => ({
    transactionMode: isTransactionMode(search.transactionMode) ? search.transactionMode : undefined,
    transactionId: typeof search.transactionId === 'string' ? search.transactionId : undefined,
    transactionCategoryId:
      typeof search.transactionCategoryId === 'string' ? search.transactionCategoryId : undefined,
    transactionType: isTransactionType(search.transactionType) ? search.transactionType : undefined,
  }),
})

function RootLayout() {
  const { location } = useRouterState()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  const modalOpened = Boolean(search.transactionMode)
  const handleClose = () => {
    navigate({
      search: (previous) => ({
        ...previous,
        transactionMode: undefined,
        transactionId: undefined,
        transactionCategoryId: undefined,
        transactionType: undefined,
      }),
    })
  }

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
            <Button
              variant="light"
              onClick={() =>
                navigate({
                  search: (previous) => ({
                    ...previous,
                    transactionMode: 'new',
                    transactionId: undefined,
                    transactionCategoryId: undefined,
                    transactionType: undefined,
                  }),
                })
              }
            >
              New transaction
            </Button>
            <Button variant="outline">New account</Button>
          </Group>
        </Group>
      </AppShell.Header>
      <AppShell.Main className={classes.content}>
        <Box>
          <Outlet />
        </Box>
      </AppShell.Main>
      <TransactionEditorModal
        opened={modalOpened}
        mode={search.transactionMode ?? 'new'}
        transactionId={search.transactionId}
        presetCategoryId={search.transactionCategoryId}
        presetType={search.transactionType}
        onClose={handleClose}
      />
    </AppShell>
  )
}
