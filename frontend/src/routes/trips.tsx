import { createFileRoute } from '@tanstack/react-router'
import {
  Button,
  Card,
  Group,
  Image,
  Modal,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
} from '@mantine/core'
import { DatePickerInput } from '@mantine/dates'
import { useMemo, useState } from 'react'
import { useCreateTrip, useSettings, useTrips, useUpdateTrip } from '../lib/api/hooks'
import { getApiErrorMessage } from '../lib/api/errors'
import { queryClient } from '../lib/api/queryClient'
import { tripsQueryOptions } from '../lib/api/queryOptions'
import type { TripListItem } from '../lib/api/types'
import classes from './page.module.css'

export const Route = createFileRoute('/trips')({
  loader: () => queryClient.prefetchQuery(tripsQueryOptions()),
  component: TripsPage,
})

type TripFormState = {
  name: string
  startDate: string | null
  endDate: string | null
  imageUrl: string
}

const buildDefaultForm = (): TripFormState => ({
  name: '',
  startDate: null,
  endDate: null,
  imageUrl: '',
})

const parseDate = (value?: string | null) => {
  if (!value) {
    return null
  }

  return value.slice(0, 10)
}

const mapTripToForm = (trip: TripListItem): TripFormState => ({
  name: trip.name,
  startDate: parseDate(trip.startDate),
  endDate: parseDate(trip.endDate),
  imageUrl: trip.imageUrl ?? '',
})

function TripsPage() {
  const tripsQuery = useTrips()
  const settingsQuery = useSettings()
  const createTrip = useCreateTrip()
  const updateTrip = useUpdateTrip()
  const [createOpened, setCreateOpened] = useState(false)
  const [editTrip, setEditTrip] = useState<TripListItem | null>(null)
  const [createForm, setCreateForm] = useState<TripFormState>(() => buildDefaultForm())
  const [editForm, setEditForm] = useState<TripFormState>(() => buildDefaultForm())

  const trips = tripsQuery.data ?? []
  const baseCurrency = settingsQuery.data?.baseCurrency ?? 'USD'
  const formatBaseCurrency = (value: number) =>
    new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: baseCurrency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value)

  const orderedTrips = useMemo(() => {
    return [...trips].sort((left, right) => {
      const leftDate = left.startDate ? new Date(left.startDate).getTime() : Number.MAX_SAFE_INTEGER
      const rightDate = right.startDate
        ? new Date(right.startDate).getTime()
        : Number.MAX_SAFE_INTEGER

      if (leftDate !== rightDate) {
        return leftDate - rightDate
      }

      return left.name.localeCompare(right.name)
    })
  }, [trips])

  const openCreate = () => {
    createTrip.reset()
    setCreateForm(buildDefaultForm())
    setCreateOpened(true)
  }

  const openEdit = (trip: TripListItem) => {
    updateTrip.reset()
    setEditTrip(trip)
    setEditForm(mapTripToForm(trip))
  }

  const closeEdit = () => {
    setEditTrip(null)
  }

  const toRequest = (form: TripFormState) => ({
    name: form.name.trim(),
    startDate: form.startDate ? new Date(`${form.startDate}T00:00:00`).toISOString() : null,
    endDate: form.endDate ? new Date(`${form.endDate}T00:00:00`).toISOString() : null,
    imageUrl: form.imageUrl.trim() ? form.imageUrl.trim() : null,
  })

  const submitCreate = () => {
    if (!createForm.name.trim()) {
      return
    }

    createTrip.mutate(toRequest(createForm), {
      onSuccess: () => {
        setCreateOpened(false)
        setCreateForm(buildDefaultForm())
      },
    })
  }

  const submitEdit = () => {
    if (!editTrip) {
      return
    }

    if (!editForm.name.trim()) {
      return
    }

    updateTrip.mutate(
      { id: editTrip.id, request: toRequest(editForm) },
      { onSuccess: () => closeEdit() },
    )
  }

  return (
    <Stack className={classes.page}>
      <Group justify="space-between" align="center">
        <Button onClick={openCreate}>Add trip</Button>
      </Group>

      {tripsQuery.isPending ? (
        <Card className={classes.card} radius="md" padding="lg">
          <Text c="dimmed">Loading trips...</Text>
        </Card>
      ) : tripsQuery.isError ? (
        <Card className={classes.card} radius="md" padding="lg">
          <Text c="red">{getApiErrorMessage(tripsQuery.error, 'Unable to load trips.')}</Text>
        </Card>
      ) : orderedTrips.length === 0 ? (
        <Card className={classes.card} radius="md" padding="lg">
          <Text c="dimmed">No trips yet. Create your first trip to tag expenses.</Text>
        </Card>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
          {orderedTrips.map((trip) => (
            <Card key={trip.id} className={classes.card} radius="md" padding="md">
              <Stack gap="sm">
                {trip.imageUrl ? (
                  <Image src={trip.imageUrl} alt={trip.name} radius="sm" h={140} fit="cover" />
                ) : null}
                <Group justify="space-between" align="start">
                  <Stack gap={2}>
                    <Text fw={700}>{trip.name}</Text>
                    <Text size="sm" c="dimmed">
                      {trip.startDate ? new Date(trip.startDate).toLocaleDateString() : 'No start date'}
                      {' · '}
                      {trip.endDate ? new Date(trip.endDate).toLocaleDateString() : 'No end date'}
                    </Text>
                  </Stack>
                  <Button variant="light" size="xs" onClick={() => openEdit(trip)}>
                    Edit
                  </Button>
                </Group>
                <Group gap="xs">
                  <Text size="sm" c="dimmed">Expenses:</Text>
                  <Text size="sm" fw={600}>{formatBaseCurrency(Number(trip.totalExpenseAmount))}</Text>
                </Group>
                <Group gap="xs">
                  <Text size="sm" c="dimmed">Transactions:</Text>
                  <Text size="sm" fw={600}>{trip.transactionCount}</Text>
                </Group>
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
      )}

      <Modal opened={createOpened} onClose={() => setCreateOpened(false)} title="Create trip" centered>
        <Stack>
          <TextInput
            label="Name"
            value={createForm.name}
            onChange={(event) => {
              const name = event.currentTarget.value
              setCreateForm((state) => ({ ...state, name }))
            }}
            required
          />
          <DatePickerInput
            label="Start date"
            value={createForm.startDate}
            onChange={(value) =>
              setCreateForm((state) => ({
                ...state,
                startDate: value,
              }))
            }
            valueFormat="YYYY-MM-DD"
            clearable
          />
          <DatePickerInput
            label="End date"
            value={createForm.endDate}
            onChange={(value) =>
              setCreateForm((state) => ({
                ...state,
                endDate: value,
              }))
            }
            valueFormat="YYYY-MM-DD"
            clearable
          />
          <TextInput
            label="Image URL"
            value={createForm.imageUrl}
            onChange={(event) => {
              const imageUrl = event.currentTarget.value
              setCreateForm((state) => ({ ...state, imageUrl }))
            }}
            placeholder="https://..."
          />
          {createTrip.isError ? (
            <Text size="sm" c="red">
              {getApiErrorMessage(createTrip.error, 'Unable to create trip.')}
            </Text>
          ) : null}
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setCreateOpened(false)}>
              Cancel
            </Button>
            <Button onClick={submitCreate} loading={createTrip.isPending} disabled={!createForm.name.trim()}>
              Create
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={Boolean(editTrip)} onClose={closeEdit} title="Edit trip" centered>
        <Stack>
          <TextInput
            label="Name"
            value={editForm.name}
            onChange={(event) => {
              const name = event.currentTarget.value
              setEditForm((state) => ({ ...state, name }))
            }}
            required
          />
          <DatePickerInput
            label="Start date"
            value={editForm.startDate}
            onChange={(value) =>
              setEditForm((state) => ({
                ...state,
                startDate: value,
              }))
            }
            valueFormat="YYYY-MM-DD"
            clearable
          />
          <DatePickerInput
            label="End date"
            value={editForm.endDate}
            onChange={(value) =>
              setEditForm((state) => ({
                ...state,
                endDate: value,
              }))
            }
            valueFormat="YYYY-MM-DD"
            clearable
          />
          <TextInput
            label="Image URL"
            value={editForm.imageUrl}
            onChange={(event) => {
              const imageUrl = event.currentTarget.value
              setEditForm((state) => ({ ...state, imageUrl }))
            }}
            placeholder="https://..."
          />
          {updateTrip.isError ? (
            <Text size="sm" c="red">
              {getApiErrorMessage(updateTrip.error, 'Unable to update trip.')}
            </Text>
          ) : null}
          <Group justify="flex-end">
            <Button variant="default" onClick={closeEdit}>
              Cancel
            </Button>
            <Button onClick={submitEdit} loading={updateTrip.isPending} disabled={!editForm.name.trim()}>
              Save
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  )
}
