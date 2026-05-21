import { and, asc, desc, eq } from "drizzle-orm"

import { normalizeCurrencyOrDefault } from "@/lib/currency"
import { db } from "@/lib/db/client.server"
import { accounts, transactions, trips } from "@/lib/db/schema"
import { getRatesToBase } from "@/lib/exchange-rate.server"
import { roundMoney } from "@/lib/finance"
import { parseDateInput } from "@/lib/server/parsing.server"

import {
  requireTrip,
  requireUser,
} from "@/features/shared/server/lookups.server"
import {
  normalizeCountry,
  normalizeImageUrl,
  normalizeRequiredName,
} from "@/features/shared/server/normalizers.server"

import type {
  CreateTripRequest,
  CreateTripResponse,
  TripListItemResponse,
  UpdateTripRequest,
  UpdateTripResponse,
} from "@/features/shared/types"

function fail(message: string): never {
  throw new Error(message)
}

export async function listTripsData(): Promise<TripListItemResponse[]> {
  const user = await requireUser()
  const baseCurrency = normalizeCurrencyOrDefault(user.baseCurrency, "USD")
  const fx = await getRatesToBase(baseCurrency)
  const tripRows = await db.query.trips.findMany({
    where: eq(trips.userId, user.id),
    orderBy: [desc(trips.startDate), asc(trips.name)],
  })
  const tripExpenseRows = await db.query.transactions.findMany({
    where: and(
      eq(transactions.userId, user.id),
      eq(transactions.type, "Expense")
    ),
  })
  const accountRows = await db.query.accounts.findMany({
    where: eq(accounts.userId, user.id),
  })
  const accountCurrencyById = new Map(
    accountRows.map((account) => [account.id, account.currency])
  )
  const totalsByTrip = new Map<string, number>()
  const transactionCountByTrip = new Map<string, number>()

  for (const transaction of tripExpenseRows) {
    if (!transaction.tripId) {
      continue
    }

    const currency = normalizeCurrencyOrDefault(
      transaction.currency ??
        accountCurrencyById.get(transaction.accountId) ??
        user.baseCurrency,
      baseCurrency
    )
    const converted = transaction.amount * (fx.ratesToBase[currency] ?? 1)

    totalsByTrip.set(
      transaction.tripId,
      roundMoney((totalsByTrip.get(transaction.tripId) ?? 0) + converted)
    )
    transactionCountByTrip.set(
      transaction.tripId,
      (transactionCountByTrip.get(transaction.tripId) ?? 0) + 1
    )
  }

  return tripRows
    .sort((left, right) => {
      const leftEmpty = left.startDate === null
      const rightEmpty = right.startDate === null

      if (leftEmpty !== rightEmpty) {
        return leftEmpty ? 1 : -1
      }

      const leftTime = left.startDate?.getTime() ?? 0
      const rightTime = right.startDate?.getTime() ?? 0
      if (leftTime !== rightTime) {
        return rightTime - leftTime
      }

      return left.name.localeCompare(right.name)
    })
    .map((trip) => ({
      id: trip.id,
      name: trip.name,
      country: trip.country,
      startDate: trip.startDate?.toISOString() ?? null,
      endDate: trip.endDate?.toISOString() ?? null,
      imageUrl: trip.imageUrl,
      transactionCount: transactionCountByTrip.get(trip.id) ?? 0,
      totalExpenseAmount: roundMoney(totalsByTrip.get(trip.id) ?? 0),
    }))
}

export async function createTripData(
  request: CreateTripRequest
): Promise<CreateTripResponse> {
  const user = await requireUser()
  const name = normalizeRequiredName(request.name)
  const country = normalizeCountry(request.country)
  const startDate = parseDateInput(request.startDate, "StartDate")
  const endDate = parseDateInput(request.endDate, "EndDate")
  const imageUrl = normalizeImageUrl(request.imageUrl)

  if (startDate > endDate) {
    fail("StartDate cannot be after EndDate.")
  }

  const id = crypto.randomUUID()
  const now = new Date()

  await db.insert(trips).values({
    id,
    userId: user.id,
    name,
    country,
    startDate,
    endDate,
    imageUrl,
    createdAt: now,
    updatedAt: now,
  })

  return {
    id,
    name,
    country,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    imageUrl,
  }
}

export async function updateTripData(
  tripId: string,
  request: UpdateTripRequest
): Promise<UpdateTripResponse> {
  const user = await requireUser()
  const trip = await requireTrip(user.id, tripId)
  const name = normalizeRequiredName(request.name)
  const country = normalizeCountry(request.country)
  const startDate = parseDateInput(request.startDate, "StartDate")
  const endDate = parseDateInput(request.endDate, "EndDate")
  const imageUrl = normalizeImageUrl(request.imageUrl)

  if (startDate > endDate) {
    fail("StartDate cannot be after EndDate.")
  }

  await db
    .update(trips)
    .set({
      name,
      country,
      startDate,
      endDate,
      imageUrl,
      updatedAt: new Date(),
    })
    .where(and(eq(trips.userId, user.id), eq(trips.id, trip.id)))

  return {
    id: trip.id,
    name,
    country,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    imageUrl,
  }
}
