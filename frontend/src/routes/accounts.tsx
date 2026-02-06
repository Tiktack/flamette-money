import { Sparkline } from '@mantine/charts'
import { createFileRoute } from '@tanstack/react-router'
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  ColorInput,
  Group,
  Modal,
  NumberInput,
  Select,
  Skeleton,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { useState } from 'react'
import { useAccounts, useCreateAccount, useDeleteAccount, useUpdateAccount } from '../lib/api/hooks'
import type { AccountListItem, AccountType } from '../lib/api/types'
import classes from './page.module.css'

export const Route = createFileRoute('/accounts')({
  component: AccountsPage,
})

const accountTypeOptions: AccountType[] = ['Cash', 'DebitCard', 'CreditCard', 'Savings']
const currencyOptions = ['USD', 'PLN', 'EUR', 'CAD']
const defaultAccountColor = '#4C6EF5'

const createSeed = (value: string) => {
  let hash = 0

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0
  }

  return Math.abs(hash)
}

const buildSparkline = (seed: number, points = 14) => {
  const data: number[] = []
  let next = seed || 1
  let current = (seed % 40) + 30

  for (let index = 0; index < points; index += 1) {
    next = (next * 9301 + 49297) % 233280
    const delta = (next / 233280 - 0.5) * 12
    current = Math.max(8, current + delta)
    data.push(Number(current.toFixed(2)))
  }

  return data
}

const formatBalance = (amount: number, currency: string) =>
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount)

const normalizeHexColor = (value?: string | null) => {
  if (!value) {
    return defaultAccountColor
  }

  return value.startsWith('#') ? value : `#${value}`
}

const badgeStyleForColor = (color: string) => ({
  backgroundColor: `${color}1A`,
  color,
  border: `1px solid ${color}4D`,
})

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Please try again.'

const EditIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path d="M4 20h4l10.5-10.5-4-4L4 16v4z" />
    <path d="M13.5 5.5l4 4" />
  </svg>
)

const TrashIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path d="M3 6h18" />
    <path d="M8 6V4h8v2" />
    <path d="M6 6l1 14h10l1-14" />
  </svg>
)

function AccountsPage() {
  const accountsQuery = useAccounts()
  const createAccount = useCreateAccount()
  const updateAccount = useUpdateAccount()
  const deleteAccount = useDeleteAccount()
  const [createOpened, setCreateOpened] = useState(false)
  const [editAccount, setEditAccount] = useState<AccountListItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AccountListItem | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const [editError, setEditError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [createForm, setCreateForm] = useState({
    name: '',
    currency: 'USD',
    color: defaultAccountColor,
    type: 'Cash' as AccountType,
    initialBalance: 0,
  })
  const [editForm, setEditForm] = useState({
    name: '',
    color: defaultAccountColor,
    type: 'Cash' as AccountType,
  })

  const openCreate = () => {
    setCreateError(null)
    setCreateForm({
      name: '',
      currency: 'USD',
      color: defaultAccountColor,
      type: 'Cash',
      initialBalance: 0,
    })
    setCreateOpened(true)
  }

  const openEdit = (account: AccountListItem) => {
    setEditError(null)
    setEditAccount(account)
    setEditForm({
      name: account.name,
      color: normalizeHexColor(account.color),
      type: account.type,
    })
  }

  const openDelete = (account: AccountListItem) => {
    setDeleteError(null)
    setDeleteTarget(account)
  }

  const handleCreate = async () => {
    setCreateError(null)
    try {
      await createAccount.mutateAsync({
        name: createForm.name,
        currency: createForm.currency,
        color: createForm.color,
        type: createForm.type,
        initialBalance: createForm.initialBalance,
      })
      setCreateOpened(false)
    } catch (error) {
      setCreateError(getErrorMessage(error))
    }
  }

  const handleEdit = async () => {
    if (!editAccount) {
      return
    }

    setEditError(null)
    try {
      await updateAccount.mutateAsync({
        id: editAccount.id,
        request: {
          name: editForm.name,
          color: editForm.color,
          type: editForm.type,
        },
      })
      setEditAccount(null)
    } catch (error) {
      setEditError(getErrorMessage(error))
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) {
      return
    }

    setDeleteError(null)
    try {
      await deleteAccount.mutateAsync(deleteTarget.id)
      setDeleteTarget(null)
    } catch (error) {
      setDeleteError(getErrorMessage(error))
    }
  }

  return (
    <Stack className={classes.page}>
      <Group className={classes.header} justify="space-between" wrap="wrap" gap="md">
        <Stack gap={4}>
          <Title order={2}>Accounts</Title>
          <Text size="sm" c="dimmed">
            Overview of balances and types
          </Text>
        </Stack>
        <Button radius="md" onClick={openCreate}>
          Create account
        </Button>
      </Group>

      <Card shadow="sm" radius="lg" padding="lg" className={classes.card}>
        {accountsQuery.isLoading ? (
          <Skeleton height={200} />
        ) : (
          <div className={classes.tableWrap}>
            <Table
              verticalSpacing="sm"
              horizontalSpacing="md"
              className={classes.table}
            >
              <Table.Thead>
                <Table.Tr className={classes.headRow}>
                  <Table.Th>Account</Table.Th>
                  <Table.Th>Type</Table.Th>
                  <Table.Th>Currency</Table.Th>
                  <Table.Th>Current balance</Table.Th>
                  <Table.Th className={classes.sparklineHeader}>Activity</Table.Th>
                  <Table.Th className={classes.actionsHeader}>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {(accountsQuery.data ?? []).map((account) => {
                  const seed = createSeed(account.id)
                  const color = normalizeHexColor(account.color)
                  const sparkline = buildSparkline(seed)
                  const badgeStyle = badgeStyleForColor(color)

                  return (
                    <Table.Tr key={account.id} className={classes.row}>
                      <Table.Td>
                        <div className={classes.nameCell}>
                          <span
                            className={classes.colorDot}
                            style={{
                              backgroundColor: color,
                            }}
                          />
                          <div>
                            <Text fw={600}>{account.name}</Text>
                            <Text size="xs" c="dimmed">
                              {account.type}
                            </Text>
                          </div>
                        </div>
                      </Table.Td>
                      <Table.Td>
                        <Badge variant="light" radius="sm" style={badgeStyle}>
                          {account.type}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Badge variant="light" radius="sm" style={badgeStyle}>
                          {account.currency}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text fw={600} className={classes.balance}>
                          {formatBalance(account.currentBalance, account.currency)}
                        </Text>
                      </Table.Td>
                      <Table.Td className={classes.sparklineCell}>
                        <Sparkline
                          data={sparkline}
                          h={36}
                          w={140}
                          curveType="monotone"
                          color={color}
                          fillOpacity={0.15}
                        />
                      </Table.Td>
                      <Table.Td>
                        <div className={classes.actions}>
                          <ActionIcon
                            variant="subtle"
                            aria-label="Edit account"
                            onClick={() => openEdit(account)}
                          >
                            <EditIcon width={18} height={18} />
                          </ActionIcon>
                          <ActionIcon
                            color="red"
                            variant="subtle"
                            aria-label="Remove account"
                            onClick={() => openDelete(account)}
                          >
                            <TrashIcon width={18} height={18} />
                          </ActionIcon>
                        </div>
                      </Table.Td>
                    </Table.Tr>
                  )
                })}
              </Table.Tbody>
            </Table>
          </div>
        )}
      </Card>

      <Modal opened={createOpened} onClose={() => setCreateOpened(false)} title="Create account">
        <Stack gap="sm">
          <TextInput
            label="Account name"
            placeholder="Everyday checking"
            value={createForm.name}
            onChange={(event) =>
              setCreateForm((current) => ({
                ...current,
                name: event.currentTarget?.value ?? '',
              }))
            }
          />
          <ColorInput
            label="Color"
            format="hex"
            value={createForm.color}
            onChange={(value) =>
              setCreateForm((current) => ({
                ...current,
                color: normalizeHexColor(value),
              }))
            }
          />
          <Select
            label="Type"
            data={accountTypeOptions}
            value={createForm.type}
            onChange={(value) =>
              setCreateForm((current) => ({
                ...current,
                type: (value ?? 'Cash') as AccountType,
              }))
            }
            allowDeselect={false}
          />
          <Select
            label="Currency"
            data={currencyOptions}
            value={createForm.currency}
            onChange={(value) =>
              setCreateForm((current) => ({
                ...current,
                currency: value ?? 'USD',
              }))
            }
            allowDeselect={false}
          />
          <NumberInput
            label="Initial balance"
            min={0}
            value={createForm.initialBalance}
            onChange={(value) =>
              setCreateForm((current) => ({
                ...current,
                initialBalance: typeof value === 'number' ? value : 0,
              }))
            }
          />
          {createError ? (
            <Text size="sm" c="red">
              {createError}
            </Text>
          ) : null}
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setCreateOpened(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} loading={createAccount.isPending}>
              Create
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={!!editAccount} onClose={() => setEditAccount(null)} title="Edit account">
        <Stack gap="sm">
          <TextInput
            label="Account name"
            value={editForm.name}
            onChange={(event) =>
              setEditForm((current) => ({
                ...current,
                name: event.currentTarget?.value ?? '',
              }))
            }
          />
          <ColorInput
            label="Color"
            format="hex"
            value={editForm.color}
            onChange={(value) =>
              setEditForm((current) => ({
                ...current,
                color: normalizeHexColor(value),
              }))
            }
          />
          <Select
            label="Type"
            data={accountTypeOptions}
            value={editForm.type}
            onChange={(value) =>
              setEditForm((current) => ({
                ...current,
                type: (value ?? 'Cash') as AccountType,
              }))
            }
            allowDeselect={false}
          />
          {editAccount ? (
            <Text size="sm" c="dimmed">
              Currency: {editAccount.currency}
            </Text>
          ) : null}
          {editError ? (
            <Text size="sm" c="red">
              {editError}
            </Text>
          ) : null}
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setEditAccount(null)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} loading={updateAccount.isPending}>
              Save
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Remove account">
        <Stack gap="sm">
          <Text size="sm">
            Remove {deleteTarget?.name}? This action cannot be undone.
          </Text>
          {deleteError ? (
            <Text size="sm" c="red">
              {deleteError}
            </Text>
          ) : null}
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button color="red" onClick={handleDelete} loading={deleteAccount.isPending}>
              Remove
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  )
}
