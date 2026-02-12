import { createRootRoute, Link, Outlet, useRouterState } from '@tanstack/react-router'
import {
  AppShell,
  Avatar,
  Box,
  Burger,
  Container,
  Group,
  Text,
  Title,
  UnstyledButton,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { TransactionEditorModal, type TransactionModalMode } from '../components/TransactionEditorModal'
import type { TransactionType } from '../lib/api/types'
import classes from './rootLayout.module.css'

const navItems = [
  { label: 'Analytics', to: '/' },
  { label: 'Accounts', to: '/accounts' },
  { label: 'Categories', to: '/categories' },
  { label: 'Transactions', to: '/transactions' },
]

const user = {
  name: 'Alex Johnson',
  email: 'alex@flamette.money',
  image:
    'https://raw.githubusercontent.com/mantinedev/mantine/master/.demo/avatars/avatar-5.png',
}

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
  const [opened, { toggle }] = useDisclosure(false)
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
        <Container size="xl" className={classes.inner}>
          <Group gap="lg" align="center" wrap="nowrap">
            <Title order={3} className={classes.brand}>
              Flamette Money
            </Title>
            <Group gap={5} visibleFrom="xs" className={classes.links}>
              {navItems.map((item) => {
                const isActive =
                  item.to === '/'
                    ? location.pathname === '/'
                    : location.pathname.startsWith(item.to)

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={classes.link}
                    data-active={isActive || undefined}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </Group>
          </Group>
          <Group gap="sm" align="center" wrap="nowrap">
            <UnstyledButton className={classes.user}>
              <Group gap={7} wrap="nowrap">
                <Avatar src={user.image} alt={user.name} radius="xl" size={28} />
                <div className={classes.userInfo}>
                  <Text fw={500} size="sm" lh={1.1}>
                    {user.name}
                  </Text>
                  <Text size="xs" c="dimmed" lh={1.1}>
                    {user.email}
                  </Text>
                </div>
                <Text size="sm" c="dimmed" aria-hidden="true">
                  ▾
                </Text>
              </Group>
            </UnstyledButton>
            <Burger
              opened={opened}
              onClick={toggle}
              hiddenFrom="xs"
              size="sm"
              aria-label="Toggle navigation"
            />
          </Group>
        </Container>
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
