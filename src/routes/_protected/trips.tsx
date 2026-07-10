import * as React from "react"

import { Airplane01Icon, ArrowRight01Icon, EarthIcon, Edit01Icon, PlusSignIcon, Wallet01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"

import { EmptyState } from "@/components/empty-state"
import { LazyTransactionEditorDialog } from "@/components/lazy-transaction-editor-dialog"
import { MetricCard } from "@/components/metric-card"
import { CardSkeleton, MetricCardsSkeleton } from "@/components/page-skeletons"
import { TripWorldMap } from "@/components/trip-world-map"
import type { TripMapItem } from "@/components/trip-world-map"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardFooter } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { getApiErrorMessage } from "@/features/shared/errors"
import { useSettings } from "@/features/settings/hooks"
import { useCreateTrip, useTrips, useUpdateTrip } from "@/features/trips/hooks"
import { COUNTRY_OPTIONS, countryFlag, getCountryName } from "@/lib/countries"
import { pageActionTypes, usePageAction } from "@/lib/page-actions"
import type { TripListItem } from "@/features/trips/types"
import { formatCurrency, formatDateLabel, toNumber } from "@/lib/finance"
import { useTransactionsFilters } from "@/lib/state/transactionsFilters"

export const Route = createFileRoute("/_protected/trips")({
  head: () => ({ meta: [{ title: "Trips — Flamette Money" }] }),
  component: TripsPage,
})

type ViewMode = "cards" | "map"

type TripFormState = {
  name: string
  country: string
  startDate: string
  endDate: string
  imageUrl: string
}

const defaultTripForm: TripFormState = {
  name: "",
  country: "",
  startDate: "",
  endDate: "",
  imageUrl: "",
}

function TripsPage() {
  const navigate = useNavigate()
  const tripsQuery = useTrips()
  const settingsQuery = useSettings()
  const createTrip = useCreateTrip()
  const updateTrip = useUpdateTrip()
  const setTripIds = useTransactionsFilters((state) => state.setTripIds)
  const [view, setView] = React.useState<ViewMode>("cards")
  const [createOpen, setCreateOpen] = React.useState(false)
  const [editTrip, setEditTrip] = React.useState<TripListItem | null>(null)
  const [createForm, setCreateForm] = React.useState<TripFormState>(defaultTripForm)
  const [editForm, setEditForm] = React.useState<TripFormState>(defaultTripForm)
  const [newTxTripId, setNewTxTripId] = React.useState<string | null>(null)

  // mutation.reset is a stable reference; destructured so the callback below stays stable too.
  const { reset: resetCreateTrip } = createTrip

  const openCreate = React.useCallback(() => {
    setCreateForm(defaultTripForm)
    resetCreateTrip()
    setCreateOpen(true)
  }, [resetCreateTrip])

  usePageAction(pageActionTypes.createTrip, openCreate)

  const baseCurrency = settingsQuery.data?.baseCurrency ?? "USD"
  const trips = React.useMemo(
    () =>
      [...(tripsQuery.data ?? [])].sort((left, right) => {
        const leftDate = left.startDate ? new Date(left.startDate).getTime() : 0
        const rightDate = right.startDate ? new Date(right.startDate).getTime() : 0
        return rightDate - leftDate
      }),
    [tripsQuery.data]
  )

  const mapTrips: TripMapItem[] = React.useMemo(
    () =>
      trips.map((trip) => ({
        id: trip.id,
        name: trip.name,
        country: trip.country ?? null,
        startDate: trip.startDate ?? null,
        endDate: trip.endDate ?? null,
        totalExpenseAmount: trip.totalExpenseAmount,
        transactionCount: trip.transactionCount,
      })),
    [trips]
  )

  const totalSpent = trips.reduce((sum, trip) => sum + toNumber(trip.totalExpenseAmount), 0)
  const countriesVisited = new Set(trips.map((t) => t.country).filter(Boolean)).size

  const viewTransactions = async (tripId: string) => {
    setTripIds([tripId])
    await navigate({ to: "/transactions" })
  }

  const addTransaction = (tripId: string) => {
    setNewTxTripId(tripId)
  }

  const openEdit = (trip: TripListItem) => {
    updateTrip.reset()
    setEditTrip(trip)
    setEditForm({
      name: trip.name,
      country: trip.country ?? "",
      startDate: trip.startDate?.slice(0, 10) ?? "",
      endDate: trip.endDate?.slice(0, 10) ?? "",
      imageUrl: trip.imageUrl ?? "",
    })
  }

  const handleCreate = async () => {
    try {
      await createTrip.mutateAsync({
        name: createForm.name.trim(),
        country: createForm.country || null,
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
          country: editForm.country || null,
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
      {tripsQuery.isPending ? (
        <MetricCardsSkeleton className="md:grid-cols-3" />
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard
            label="Trips"
            value={String(trips.length)}
            icon={Airplane01Icon}
            iconBgClassName="bg-blue-500/10 dark:bg-blue-400/15"
            iconColorClassName="text-blue-600 dark:text-blue-400"
          />
          <MetricCard
            label="Total spent"
            value={formatCurrency(totalSpent, baseCurrency)}
            icon={Wallet01Icon}
            iconBgClassName="bg-amber-500/10 dark:bg-amber-500/15"
            iconColorClassName="text-amber-600 dark:text-amber-400"
          />
          <MetricCard
            label="Countries visited"
            value={String(countriesVisited)}
            icon={EarthIcon}
            iconBgClassName="bg-emerald-500/10 dark:bg-emerald-500/15"
            iconColorClassName="text-emerald-600 dark:text-emerald-400"
          />
        </div>
      )}

      {tripsQuery.isPending ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <CardSkeleton key={index} className="h-72" />
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
          action={
            <Button onClick={openCreate}>
              <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} />
              Add trip
            </Button>
          }
        />
      ) : (
        <>
          <div className="flex items-center justify-between">
            <ToggleGroup
              value={[view]}
              onValueChange={(value) => {
                const next = value[0] as ViewMode | undefined
                if (next) setView(next)
              }}
              variant="outline"
              size="sm"
            >
              <ToggleGroupItem value="cards">Cards</ToggleGroupItem>
              <ToggleGroupItem value="map">Map</ToggleGroupItem>
            </ToggleGroup>
          </div>

          {view === "map" ? (
            <TripWorldMap trips={mapTrips} baseCurrency={baseCurrency} />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {trips.map((trip) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  baseCurrency={baseCurrency}
                  onEdit={() => openEdit(trip)}
                  onViewTransactions={() => viewTransactions(trip.id)}
                  onAddTransaction={() => addTransaction(trip.id)}
                />
              ))}
            </div>
          )}
        </>
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

      <LazyTransactionEditorDialog
        open={Boolean(newTxTripId)}
        mode="new"
        presetTripId={newTxTripId ?? undefined}
        onOpenChange={(open) => !open && setNewTxTripId(null)}
      />
    </div>
  )
}

function TripCard({
  trip,
  baseCurrency,
  onEdit,
  onViewTransactions,
  onAddTransaction,
}: {
  trip: TripListItem
  baseCurrency: string
  onEdit: () => void
  onViewTransactions: () => void
  onAddTransaction: () => void
}) {
  const countryName = getCountryName(trip.country)
  const spent = toNumber(trip.totalExpenseAmount)
  const txnCount = toNumber(trip.transactionCount)

  return (
    <Card className="group gap-0 overflow-hidden p-0 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
      <div className="relative h-48 overflow-hidden">
        {trip.imageUrl ? (
          <img alt={trip.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" src={trip.imageUrl} />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 via-primary/10 to-muted">
            <span className="text-5xl">{trip.country ? countryFlag(trip.country) : "✈️"}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4">
          <p className="text-base font-semibold tracking-tight text-white drop-shadow-sm">{trip.name}</p>
          <p className="mt-0.5 text-sm text-white/80">
            {countryName ? `${countryName} · ` : ""}
            {formatDateLabel(trip.startDate)} – {formatDateLabel(trip.endDate)}
          </p>
        </div>
      </div>

      <CardFooter className="flex items-center justify-between gap-3 border-t border-border/40 px-4 py-3">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs tabular-nums">
            {formatCurrency(spent, baseCurrency)}
          </Badge>
          {txnCount > 0 ? (
            <Badge variant="outline" className="text-xs tabular-nums">
              {txnCount} transactions
            </Badge>
          ) : null}
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" onClick={onAddTransaction}>
            <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} />
            <span className="sr-only">Add transaction to {trip.name}</span>
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onViewTransactions}>
            <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
            <span className="sr-only">View transactions for {trip.name}</span>
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onEdit}>
            <HugeiconsIcon icon={Edit01Icon} strokeWidth={2} />
            <span className="sr-only">Edit {trip.name}</span>
          </Button>
        </div>
      </CardFooter>
    </Card>
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
          <Field className="md:col-span-2">
            <FieldLabel>Country</FieldLabel>
            <Select
              value={value.country}
              items={[{ value: "", label: "None" }, ...COUNTRY_OPTIONS.map((option) => ({ value: option.value, label: option.label }))]}
              onValueChange={(val) => onChange((state) => ({ ...state, country: val as string }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {COUNTRY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel>Start date</FieldLabel>
            <Input
              type="date"
              value={value.startDate}
              onChange={(event) =>
                onChange((state) => ({
                  ...state,
                  startDate: event.target.value,
                }))
              }
            />
          </Field>
          <Field>
            <FieldLabel>End date</FieldLabel>
            <Input
              type="date"
              min={value.startDate || undefined}
              value={value.endDate}
              onChange={(event) => onChange((state) => ({ ...state, endDate: event.target.value }))}
            />
          </Field>
          <Field className="md:col-span-2">
            <FieldLabel>Image URL</FieldLabel>
            <Input
              value={value.imageUrl}
              onChange={(event) =>
                onChange((state) => ({
                  ...state,
                  imageUrl: event.target.value,
                }))
              }
              placeholder="https://..."
            />
          </Field>
        </FieldGroup>
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Save failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={!isValid || pending}>
            {pending ? "Saving" : submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
