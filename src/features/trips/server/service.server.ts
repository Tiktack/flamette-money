import { and, eq, isNotNull } from "drizzle-orm"

import { normalizeCurrencyOrDefault } from "@/lib/currency"
import { db } from "@/lib/db/client.server"
import { transactions, trips } from "@/lib/db/schema"
import { getRatesToBase } from "@/lib/exchange-rate.server"
import { roundMoney } from "@/lib/finance"
import { parseDateInput } from "@/lib/server/parsing.server"

import { convertAmountToBase, loadAccountCurrencyMap, resolveTransactionCurrency } from "@/features/shared/server/fx.server"
import { requireTrip, requireUser } from "@/features/shared/server/lookups.server"
import { normalizeCountry, normalizeImageUrl, normalizeRequiredName } from "@/features/shared/server/normalizers.server"

import type { TripListItemResponse, TripResponse, TripWriteRequest } from "@/features/shared/types"

export async function listTripsData(): Promise<TripListItemResponse[]> {
  const user = await requireUser()
  const baseCurrency = normalizeCurrencyOrDefault(user.baseCurrency, "USD")
  const fx = await getRatesToBase(baseCurrency)
  // Ordering happens in JS below (dateless trips last); a query orderBy would be redundant.
  const tripRows = await db.query.trips.findMany({
    where: eq(trips.userId, user.id),
  })
  const tripExpenseRows = await db
    .select({
      tripId: transactions.tripId,
      accountId: transactions.accountId,
      amount: transactions.amount,
      currency: transactions.currency,
    })
    .from(transactions)
    .where(and(eq(transactions.userId, user.id), eq(transactions.type, "Expense"), isNotNull(transactions.tripId)))
  const accountCurrencyById = await loadAccountCurrencyMap(user.id)
  const totalsByTrip = new Map<string, number>()
  const transactionCountByTrip = new Map<string, number>()

  for (const transaction of tripExpenseRows) {
    const tripId = transaction.tripId
    if (!tripId) {
      continue
    }

    const currency = resolveTransactionCurrency(transaction, accountCurrencyById, baseCurrency)
    const converted = convertAmountToBase(transaction.amount, currency, baseCurrency, fx.ratesToBase)

    totalsByTrip.set(tripId, roundMoney((totalsByTrip.get(tripId) ?? 0) + converted))
    transactionCountByTrip.set(tripId, (transactionCountByTrip.get(tripId) ?? 0) + 1)
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

export async function createTripData(request: TripWriteRequest): Promise<TripResponse> {
  const user = await requireUser()
  const name = normalizeRequiredName(request.name)
  const country = normalizeCountry(request.country)
  const startDate = parseDateInput(request.startDate, "StartDate")
  const endDate = parseDateInput(request.endDate, "EndDate")
  const imageUrl = normalizeImageUrl(request.imageUrl)

  if (startDate > endDate) {
    throw new Error("StartDate cannot be after EndDate.")
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

export async function updateTripData(tripId: string, request: TripWriteRequest): Promise<TripResponse> {
  const user = await requireUser()
  const trip = await requireTrip(user.id, tripId)
  const name = normalizeRequiredName(request.name)
  const country = normalizeCountry(request.country)
  const startDate = parseDateInput(request.startDate, "StartDate")
  const endDate = parseDateInput(request.endDate, "EndDate")
  const imageUrl = normalizeImageUrl(request.imageUrl)

  if (startDate > endDate) {
    throw new Error("StartDate cannot be after EndDate.")
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
