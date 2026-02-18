import { createFileRoute } from '@tanstack/react-router'
import {
  ActionIcon,
  Box,
  Button,
  Group,
  Loader,
  Modal,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core'
import { DatePickerInput } from '@mantine/dates'
import { IconCalendar, IconList, IconMapPin, IconPencil, IconPlaneDeparture } from '@tabler/icons-react'
import { useMemo, useState } from 'react'
import { useCreateTrip, useSettings, useTrips, useUpdateTrip } from '../lib/api/hooks'
import { getApiErrorMessage } from '../lib/api/errors'
import { queryClient } from '../lib/api/queryClient'
import { tripsQueryOptions } from '../lib/api/queryOptions'
import type { TripListItem } from '../lib/api/types'
import pageClasses from './page.module.css'
import classes from './trips.module.css'

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
  if (!value) return null
  return value.slice(0, 10)
}

const mapTripToForm = (trip: TripListItem): TripFormState => ({
  name: trip.name,
  startDate: parseDate(trip.startDate),
  endDate: parseDate(trip.endDate),
  imageUrl: trip.imageUrl ?? '',
})

function fmt(value?: string | null): string {
  if (!value) return '-'
  return new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

function fmtDuration(start?: string | null, end?: string | null): string {
  if (!start || !end) return ''
  const days = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86_400_000)
  return `${days + 1}d`
}

type Row = { kind: 'year'; year: number } | { kind: 'trip'; trip: TripListItem; side: 'left' | 'right' }

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

  const fmtMoney = (value: number) =>
    new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: baseCurrency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)

  const rows = useMemo<Row[]>(() => {
    const sorted = [...trips].sort((a, b) => {
      const at = a.startDate ? new Date(a.startDate).getTime() : 0
      const bt = b.startDate ? new Date(b.startDate).getTime() : 0
      return bt - at
    })
    const result: Row[] = []
    let lastYear: number | null = null
    let tripIndex = 0
    for (const trip of sorted) {
      const year = trip.startDate ? new Date(trip.startDate).getFullYear() : null
      if (year !== null && year !== lastYear) {
        result.push({ kind: 'year', year })
        lastYear = year
        tripIndex = 0
      }
      result.push({ kind: 'trip', trip, side: tripIndex % 2 === 0 ? 'left' : 'right' })
      tripIndex++
    }
    return result
  }, [trips])

  const openCreate = () => { createTrip.reset(); setCreateForm(buildDefaultForm()); setCreateOpened(true) }
  const openEdit = (trip: TripListItem) => { updateTrip.reset(); setEditTrip(trip); setEditForm(mapTripToForm(trip)) }
  const closeEdit = () => setEditTrip(null)

  const toRequest = (form: TripFormState) => ({
    name: form.name.trim(),
    startDate: form.startDate ? new Date(`${form.startDate}T00:00:00`).toISOString() : null,
    endDate: form.endDate ? new Date(`${form.endDate}T00:00:00`).toISOString() : null,
    imageUrl: form.imageUrl.trim() || null,
  })

  const isValid = (f: TripFormState) => f.name.trim().length > 0 && f.startDate !== null && f.endDate !== null

  const submitCreate = () => {
    if (!isValid(createForm)) return
    createTrip.mutate(toRequest(createForm), {
      onSuccess: () => { setCreateOpened(false); setCreateForm(buildDefaultForm()) },
    })
  }

  const submitEdit = () => {
    if (!editTrip || !isValid(editForm)) return
    updateTrip.mutate({ id: editTrip.id, request: toRequest(editForm) }, { onSuccess: () => closeEdit() })
  }

  return (
    <Stack className={pageClasses.page}>
      <Group justify="space-between" align="center">
        <Stack gap={2}>
          <Text fw={700} size="xl">Travel History</Text>
          <Text size="sm" c="dimmed">
            {trips.length} {trips.length === 1 ? 'trip' : 'trips'} &middot; hover a card to see stats
          </Text>
        </Stack>
        <Button leftSection={<IconPlaneDeparture size={16} />} onClick={openCreate}>
          Add trip
        </Button>
      </Group>

      {tripsQuery.isPending ? (
        <Group justify="center" py="xl"><Loader size="md" /></Group>
      ) : tripsQuery.isError ? (
        <Box className={classes.emptyState}>
          <Text c="red">{getApiErrorMessage(tripsQuery.error, 'Unable to load trips.')}</Text>
        </Box>
      ) : rows.length === 0 ? (
        <Box className={classes.emptyState}>
          <IconMapPin size={36} style={{ opacity: 0.2, marginBottom: 10 }} />
          <Text fw={600} mb={4}>No trips yet</Text>
          <Text size="sm" c="dimmed">Create your first trip to start tracking travel expenses.</Text>
        </Box>
      ) : (
        <Box className={classes.timeline}>
          <Box className={classes.centerLine} />
          {rows.map((row, i) => {
            if (row.kind === 'year') {
              return (
                <Box key={`y-${row.year}-${i}`} className={classes.yearMark}>
                  <span className={classes.yearBadge}>{row.year}</span>
                </Box>
              )
            }
            const { trip, side } = row
            return (
              <Box key={trip.id} className={`${classes.item} ${side === 'left' ? classes.itemLeft : classes.itemRight}`}>
                <Box className={classes.dot} />
                <Box className={classes.connector} />
                <Box className={classes.card}>
                  {/* cardInner clips image corners; card itself stays overflow:visible for the icon */}
                  <Box className={classes.cardInner}>
                    {trip.imageUrl ? (
                      <Box className={classes.imageWrap}>
                        <img src={trip.imageUrl} alt={trip.name} className={classes.img} />
                        <Box className={classes.imgOverlay} />
                        <Text className={classes.imgTitle}>{trip.name}</Text>
                      </Box>
                    ) : (
                      <Box className={classes.noImgHeader}>
                        <Text fw={700} size="md" c="dark.7">{trip.name}</Text>
                      </Box>
                    )}

                    <Box className={classes.cardBody}>
                      <Box className={classes.dateRow}>
                        <IconCalendar size={12} />
                        <Text size="xs" c="dimmed" component="span">
                          {fmt(trip.startDate)} &rarr; {fmt(trip.endDate)}
                        </Text>
                        {trip.startDate && trip.endDate && (
                          <span className={classes.duration}>{fmtDuration(trip.startDate, trip.endDate)}</span>
                        )}
                      </Box>

                      <Box className={classes.statsStrip}>
                        <Box className={classes.statCell}>
                          <span className={classes.statLabel}>Spent</span>
                          <span className={classes.statValue}>{fmtMoney(Number(trip.totalExpenseAmount))}</span>
                        </Box>
                        <Box className={classes.statCell}>
                          <span className={classes.statLabel}>Transactions</span>
                          <span className={classes.statValue}>{trip.transactionCount}</span>
                        </Box>
                      </Box>
                    </Box>
                    {/* Action strip — revealed on hover */}
                    <Group className={classes.cardActions} gap="xs">
                      <Tooltip label="Edit trip" withArrow position="top">
                        <ActionIcon
                          variant="subtle"
                          color="gray"
                          size="sm"
                          onClick={() => openEdit(trip)}
                          aria-label="Edit trip"
                        >
                          <IconPencil size={13} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="View transactions" withArrow position="top">
                        <ActionIcon
                          variant="subtle"
                          color="gray"
                          size="sm"
                          aria-label="View transactions"
                        >
                          <IconList size={13} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Box>
                </Box>
              </Box>
            )
          })}
        </Box>
      )}

      <Modal opened={createOpened} onClose={() => setCreateOpened(false)} title="New trip" centered>
        <Stack>
          <TextInput label="Destination name" placeholder="e.g. Paris, France" value={createForm.name} required
            onChange={(e) => { const v = e.currentTarget.value; setCreateForm((s) => ({ ...s, name: v })) }} />
          <Box className={classes.formDateGrid}>
            <DatePickerInput label="Start date" placeholder="Pick date" valueFormat="YYYY-MM-DD" required
              value={createForm.startDate}
              onChange={(v) => setCreateForm((s) => ({ ...s, startDate: v }))} />
            <DatePickerInput label="End date" placeholder="Pick date" valueFormat="YYYY-MM-DD" required
              value={createForm.endDate}
              minDate={createForm.startDate ? new Date(createForm.startDate) : undefined}
              onChange={(v) => setCreateForm((s) => ({ ...s, endDate: v }))} />
          </Box>
          <TextInput label="Image URL (optional)" placeholder="https://..." value={createForm.imageUrl}
            onChange={(e) => { const v = e.currentTarget.value; setCreateForm((s) => ({ ...s, imageUrl: v })) }} />
          {createTrip.isError && (
            <Text size="sm" c="red">{getApiErrorMessage(createTrip.error, 'Unable to create trip.')}</Text>
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setCreateOpened(false)}>Cancel</Button>
            <Button onClick={submitCreate} loading={createTrip.isPending} disabled={!isValid(createForm)}>Create</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={Boolean(editTrip)} onClose={closeEdit} title="Edit trip" centered>
        <Stack>
          <TextInput label="Destination name" placeholder="e.g. Paris, France" value={editForm.name} required
            onChange={(e) => { const v = e.currentTarget.value; setEditForm((s) => ({ ...s, name: v })) }} />
          <Box className={classes.formDateGrid}>
            <DatePickerInput label="Start date" placeholder="Pick date" valueFormat="YYYY-MM-DD" required
              value={editForm.startDate}
              onChange={(v) => setEditForm((s) => ({ ...s, startDate: v }))} />
            <DatePickerInput label="End date" placeholder="Pick date" valueFormat="YYYY-MM-DD" required
              value={editForm.endDate}
              minDate={editForm.startDate ? new Date(editForm.startDate) : undefined}
              onChange={(v) => setEditForm((s) => ({ ...s, endDate: v }))} />
          </Box>
          <TextInput label="Image URL (optional)" placeholder="https://..." value={editForm.imageUrl}
            onChange={(e) => { const v = e.currentTarget.value; setEditForm((s) => ({ ...s, imageUrl: v })) }} />
          {updateTrip.isError && (
            <Text size="sm" c="red">{getApiErrorMessage(updateTrip.error, 'Unable to update trip.')}</Text>
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={closeEdit}>Cancel</Button>
            <Button onClick={submitEdit} loading={updateTrip.isPending} disabled={!isValid(editForm)}>Save</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  )
}