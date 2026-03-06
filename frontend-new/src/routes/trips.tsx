import * as React from "react"

import { createFileRoute } from "@tanstack/react-router"

import { EmptyState } from "@/components/empty-state"
import { PageHeader } from "@/components/page-header"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { getApiErrorMessage } from "@/lib/api/errors"
import { useCreateTrip, useSettings, useTrips, useUpdateTrip } from "@/lib/api/hooks"
import type { TripListItem } from "@/lib/api/types"
import { formatCurrency, formatDateLabel, toNumber } from "@/lib/finance"

export const Route = createFileRoute("/trips")({
  component: TripsPage,
})

type TripFormState = {
  name: string
  startDate: string
  endDate: string
  imageUrl: string
}

const defaultTripForm: TripFormState = {
  name: "",
  startDate: "",
  endDate: "",
  imageUrl: "",
}

function TripsPage() {
  const tripsQuery = useTrips()
  const settingsQuery = useSettings()
  const createTrip = useCreateTrip()
  const updateTrip = useUpdateTrip()
  const [createOpen, setCreateOpen] = React.useState(false)
  const [editTrip, setEditTrip] = React.useState<TripListItem | null>(null)
  const [createForm, setCreateForm] = React.useState<TripFormState>(defaultTripForm)
  const [editForm, setEditForm] = React.useState<TripFormState>(defaultTripForm)

  const baseCurrency = settingsQuery.data?.baseCurrency ?? "USD"
  const trips = React.useMemo(
    () =>
      [...(tripsQuery.data ?? [])].sort((left, right) => {
        const leftDate = left.startDate ? new Date(left.startDate).getTime() : 0
        const rightDate = right.startDate ? new Date(right.startDate).getTime() : 0
        return rightDate - leftDate
      }),
    [tripsQuery.data],
  )

  const totalSpent = trips.reduce((sum, trip) => sum + toNumber(trip.totalExpenseAmount), 0)

  const openEdit = (trip: TripListItem) => {
    setEditTrip(trip)
    setEditForm({
      name: trip.name,
      startDate: trip.startDate?.slice(0, 10) ?? "",
      endDate: trip.endDate?.slice(0, 10) ?? "",
      imageUrl: trip.imageUrl ?? "",
    })
  }

  const handleCreate = async () => {
    try {
      await createTrip.mutateAsync({
        name: createForm.name.trim(),
        startDate: new Date(`${createForm.startDate}T00:00:00`).toISOString(),
        endDate: new Date(`${createForm.endDate}T00:00:00`).toISOString(),
        imageUrl: createForm.imageUrl.trim() || null,
      })
      setCreateOpen(false)
      setCreateForm(defaultTripForm)
    } catch {
      // rendered below
    }
  }

  const handleEdit = async () => {
    if (!editTrip) {
      return
    }

    try {
      await updateTrip.mutateAsync({
        id: editTrip.id,
        request: {
          name: editForm.name.trim(),
          startDate: new Date(`${editForm.startDate}T00:00:00`).toISOString(),
          endDate: new Date(`${editForm.endDate}T00:00:00`).toISOString(),
          imageUrl: editForm.imageUrl.trim() || null,
        },
      })
      setEditTrip(null)
    } catch {
      // rendered below
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Trips"
        description="Track travel periods as separate contexts, complete with dates, cover images, and expense totals."
        actions={<Button onClick={() => setCreateOpen(true)}>Add trip</Button>}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Trips" value={String(trips.length)} helper="Travel periods recorded in the workspace" />
        <MetricCard label="Total spent" value={formatCurrency(totalSpent, baseCurrency)} helper="Combined trip expenses in your base currency" />
        <MetricCard label="Transactions" value={String(trips.reduce((sum, trip) => sum + trip.transactionCount, 0))} helper="Transactions attached to all trips" />
      </div>

      {tripsQuery.isPending ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-72 animate-pulse rounded-[1.75rem] bg-muted" />
          ))}
        </div>
      ) : tripsQuery.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load trips</AlertTitle>
          <AlertDescription>{getApiErrorMessage(tripsQuery.error, "Try again in a moment.")}</AlertDescription>
        </Alert>
      ) : trips.length === 0 ? (
        <EmptyState
          eyebrow="Trips"
          title="No trips yet"
          description="Create your first trip to separate travel-related transactions from the rest of your ledger."
          action={<Button onClick={() => setCreateOpen(true)}>Add trip</Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {trips.map((trip) => (
            <Card key={trip.id} className="overflow-hidden border-border/60 bg-card/80 shadow-sm">
              <div className="relative h-40 bg-gradient-to-br from-primary/25 via-background to-chart-2/20">
                {trip.imageUrl ? <img alt={trip.name} className="h-full w-full object-cover" src={trip.imageUrl} /> : null}
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/25 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <p className="text-lg font-semibold tracking-tight text-foreground">{trip.name}</p>
                  <p className="text-sm text-muted-foreground">{formatDateLabel(trip.startDate)} to {formatDateLabel(trip.endDate)}</p>
                </div>
              </div>
              <CardContent className="grid gap-4 p-5">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{trip.transactionCount} transactions</Badge>
                  <Badge variant="secondary">{formatCurrency(trip.totalExpenseAmount, baseCurrency)}</Badge>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => openEdit(trip)}>Edit</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <TripDialog
        open={createOpen}
        title="Create trip"
        description="Add a named travel period with optional cover imagery."
        value={createForm}
        onChange={setCreateForm}
        pending={createTrip.isPending}
        error={createTrip.isError ? getApiErrorMessage(createTrip.error, "Unable to create trip.") : null}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
        submitLabel="Create trip"
      />

      <TripDialog
        open={Boolean(editTrip)}
        title="Edit trip"
        description="Adjust dates, naming, or the cover image URL."
        value={editForm}
        onChange={setEditForm}
        pending={updateTrip.isPending}
        error={updateTrip.isError ? getApiErrorMessage(updateTrip.error, "Unable to update trip.") : null}
        onOpenChange={(open) => !open && setEditTrip(null)}
        onSubmit={handleEdit}
        submitLabel="Save changes"
      />
    </div>
  )
}

function TripDialog({
  open,
  title,
  description,
  value,
  onChange,
  pending,
  error,
  onOpenChange,
  onSubmit,
  submitLabel,
}: {
  open: boolean
  title: string
  description: string
  value: TripFormState
  onChange: React.Dispatch<React.SetStateAction<TripFormState>>
  pending: boolean
  error: string | null
  onOpenChange: (open: boolean) => void
  onSubmit: () => void
  submitLabel: string
}) {
  const isValid = value.name.trim() && value.startDate && value.endDate

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <FieldGroup className="grid gap-4 md:grid-cols-2">
          <Field className="md:col-span-2">
            <FieldLabel>Name</FieldLabel>
            <Input value={value.name} onChange={(event) => onChange((state) => ({ ...state, name: event.target.value }))} />
          </Field>
          <Field>
            <FieldLabel>Start date</FieldLabel>
            <Input type="date" value={value.startDate} onChange={(event) => onChange((state) => ({ ...state, startDate: event.target.value }))} />
          </Field>
          <Field>
            <FieldLabel>End date</FieldLabel>
            <Input type="date" min={value.startDate || undefined} value={value.endDate} onChange={(event) => onChange((state) => ({ ...state, endDate: event.target.value }))} />
          </Field>
          <Field className="md:col-span-2">
            <FieldLabel>Image URL</FieldLabel>
            <Input value={value.imageUrl} onChange={(event) => onChange((state) => ({ ...state, imageUrl: event.target.value }))} placeholder="https://..." />
          </Field>
        </FieldGroup>
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Save failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSubmit} disabled={!isValid || pending}>{pending ? "Saving" : submitLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function MetricCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <Card className="border-border/60 bg-card/80 shadow-sm">
      <CardContent className="space-y-2 p-5">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold tracking-tight text-foreground">{value}</p>
        <p className="text-xs leading-5 text-muted-foreground">{helper}</p>
      </CardContent>
    </Card>
  )
}
