import { createRootRoute, Link, Outlet, useRouterState } from '@tanstack/react-router'
import {
  ActionIcon,
  AppShell,
  Avatar,
  Button,
  Box,
  Burger,
  Center,
  Container,
  Group,
  Menu,
  Paper,
  Stack,
  Switch,
  Text,
  Title,
  useComputedColorScheme,
  useMantineColorScheme,
  UnstyledButton,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { useState } from 'react'
import { TransactionEditorModal, type TransactionModalMode } from '../components/TransactionEditorModal'
import { useCurrentUser, useLogout } from '../lib/api/hooks'
import type { TransactionType } from '../lib/api/types'
import classes from './rootLayout.module.css'

const navItems = [
  { label: 'Analytics', to: '/' },
  { label: 'Accounts', to: '/accounts' },
  { label: 'Categories', to: '/categories' },
  { label: 'Trips', to: '/trips' },
  { label: 'Transactions', to: '/transactions' },
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
  const [opened, { toggle }] = useDisclosure(false)
  const [userMenuOpened, setUserMenuOpened] = useState(false)
  const currentUserQuery = useCurrentUser()
  const logoutMutation = useLogout()
  const { setColorScheme } = useMantineColorScheme()
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true })
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const user = currentUserQuery.data

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? ''
  const loginHref = `${apiBaseUrl}/api/auth/login/google?returnUrl=${encodeURIComponent(window.location.href)}`

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

  const handleToggleColorScheme = () => {
    setColorScheme(computedColorScheme === 'dark' ? 'light' : 'dark')
  }

  if (currentUserQuery.isLoading) {
    return (
      <Center h="100dvh">
        <Text c="dimmed">Loading session…</Text>
      </Center>
    )
  }

  if (!user) {
    return (
      <Center h="100dvh" p="lg">
        <Paper withBorder radius="md" p="xl" maw={420} w="100%">
          <Stack gap="md">
            <Title order={3}>Sign in to Flamette Money</Title>
            <Text c="dimmed" size="sm">
              Continue with Google to access your personal accounts, categories, trips and transactions.
            </Text>
            <Button component="a" href={loginHref} fullWidth>
              Continue with Google
            </Button>
          </Stack>
        </Paper>
      </Center>
    )
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
            <ActionIcon
              variant="light"
              size="lg"
              radius="sm"
              aria-label="New transaction"
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
              <Text fw={700} size="lg" lh={1}>
                +
              </Text>
            </ActionIcon>
            <Menu
              width={240}
              position="bottom-end"
              onOpen={() => setUserMenuOpened(true)}
              onClose={() => setUserMenuOpened(false)}
              transitionProps={{ transition: 'pop-top-right' }}
              withinPortal
            >
              <Menu.Target>
                <UnstyledButton className={`${classes.user} ${userMenuOpened ? classes.userActive : ''}`}>
                  <Group gap={7} wrap="nowrap">
                    <Avatar alt={user.name} radius="xl" size={28}>
                      {user.name.slice(0, 1).toUpperCase()}
                    </Avatar>
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
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Label>Account</Menu.Label>
                <Menu.Item>Settings</Menu.Item>
                <Menu.Item>Profile</Menu.Item>
                <Menu.Divider />
                <Box px="sm" py={6}>
                  <Group justify="space-between" wrap="nowrap" gap="sm">
                    <Text size="sm">Dark mode</Text>
                    <Switch
                      size="sm"
                      checked={computedColorScheme === 'dark'}
                      onChange={handleToggleColorScheme}
                      aria-label="Toggle dark mode"
                    />
                  </Group>
                </Box>
                <Menu.Divider />
                <Menu.Item
                  color="red"
                  onClick={async () => {
                    await logoutMutation.mutateAsync()
                    window.location.href = '/'
                  }}
                >
                  Logout
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
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
