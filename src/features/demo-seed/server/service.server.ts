import { and, eq } from "drizzle-orm"

import { auth } from "@/lib/auth"
import { ensureUserBootstrap } from "@/lib/bootstrap.server"
import { db } from "@/lib/db/client.server"
import {
  forEachChunkSync,
  SQLITE_INSERT_BATCH_SIZE,
} from "@/lib/db/sqlite-batch.server"
import {
  accounts,
  accountTypes,
  categories,
  trips,
  transactions,
  transactionTypes,
} from "@/lib/db/schema"

import type { SeedDemoResponse } from "@/features/shared/types"

type AccountType = (typeof accountTypes)[number]
type TransactionType = (typeof transactionTypes)[number]

type AccountRow = typeof accounts.$inferSelect
type CategoryRow = typeof categories.$inferSelect
type TripRow = typeof trips.$inferSelect
type TransactionInsert = typeof transactions.$inferInsert

type AccountDefinition = {
  name: string
  description: string | null
  currency: string
  color: string
  icon: string
  type: AccountType
  currentBalance: number
}

type TripSeedDefinition = {
  name: string
  startDate: Date
  endDate: Date
  imageUrl: string | null
  country: string | null
}

type TripWindow = {
  id: string
  startDate: Date
  endDate: Date
}

class HttpError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = "HttpError"
    this.status = status
  }
}

function fail(message: string, status = 400): never {
  throw new HttpError(status, message)
}

async function requireUserIdForRequest(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })

  if (!session) {
    fail("Unauthorized", 401)
  }

  await ensureUserBootstrap(session.user.id)
  return session.user.id
}

function clampYears(value: number | null) {
  if (!Number.isFinite(value) || value === null) {
    return 3
  }

  return Math.max(2, Math.min(3, Math.trunc(value)))
}

function nextMoney(random: RandomSource, min: number, max: number) {
  const major = random.nextInt(min, max + 1)
  const minor = random.nextInt(0, 100)
  return roundMoney(major + minor / 100)
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function getDailyTransactionCount(random: RandomSource, isTripDay: boolean) {
  if (isTripDay) {
    const tripRoll = random.nextInt(0, 100)
    if (tripRoll < 8) return 0
    if (tripRoll < 50) return random.nextInt(2, 5)
    if (tripRoll < 82) return random.nextInt(3, 7)
    return random.nextInt(5, 10)
  }

  const roll = random.nextInt(0, 100)
  if (roll < 20) return 0
  if (roll < 70) return random.nextInt(1, 3)
  if (roll < 90) return random.nextInt(2, 5)
  return random.nextInt(4, 8)
}

function pickTransactionType(
  random: RandomSource,
  hasExpenses: boolean,
  hasIncome: boolean
): TransactionType {
  const roll = random.next()
  if (roll < 0.12 && hasIncome) return "Income"
  if (roll < 0.88) return "Expense"
  if (roll < 0.97) return "Transfer"
  return hasExpenses ? "Refund" : "Expense"
}

function pickValue<T>(random: RandomSource, values: T[]) {
  if (values.length === 0) {
    return null
  }

  return values[random.nextInt(0, values.length)]
}

function shouldAssign(random: RandomSource, probability: number) {
  return random.next() < probability
}

function pickDifferentAccount(
  random: RandomSource,
  values: AccountRow[],
  source: AccountRow
) {
  if (values.length <= 1) {
    return source
  }

  let target = source
  while (target.id === source.id) {
    target = values[random.nextInt(0, values.length)]
  }

  return target
}

function applyBalances(
  account: AccountRow,
  targetAccount: AccountRow | null,
  type: TransactionType,
  amount: number
) {
  switch (type) {
    case "Expense":
      account.currentBalance = roundMoney(account.currentBalance - amount)
      break
    case "Income":
    case "Refund":
      account.currentBalance = roundMoney(account.currentBalance + amount)
      break
    case "Transfer":
      account.currentBalance = roundMoney(account.currentBalance - amount)
      if (targetAccount) {
        targetAccount.currentBalance = roundMoney(
          targetAccount.currentBalance + amount
        )
      }
      break
  }
}

function pickActiveTripForDate(
  random: RandomSource,
  tripWindows: TripWindow[],
  date: Date
) {
  const activeTrips = tripWindows.filter(
    (trip) => date >= trip.startDate && date <= trip.endDate
  )
  if (activeTrips.length === 0) {
    return null
  }

  return activeTrips[random.nextInt(0, activeTrips.length)]
}

function getAccountDefinitions(): AccountDefinition[] {
  return [
    {
      name: "Cash PLN",
      description: "Local cash for daily spending.",
      currency: "PLN",
      color: "#2F9E44",
      icon: "IconCash",
      type: "Cash",
      currentBalance: 1200,
    },
    {
      name: "Cash EUR",
      description: "Travel cash reserved in euros.",
      currency: "EUR",
      color: "#0B7285",
      icon: "IconCash",
      type: "Cash",
      currentBalance: 400,
    },
    {
      name: "Card PLN",
      description: "Primary debit card for domestic purchases.",
      currency: "PLN",
      color: "#1971C2",
      icon: "IconCreditCard",
      type: "DebitCard",
      currentBalance: 3500,
    },
    {
      name: "Card EUR",
      description: "Secondary debit card for euro expenses.",
      currency: "EUR",
      color: "#364FC7",
      icon: "IconCreditCard",
      type: "DebitCard",
      currentBalance: 800,
    },
    {
      name: "Revolut Card",
      description: "Flexible travel card with multi-currency balance.",
      currency: "EUR",
      color: "#7048E8",
      icon: "IconWallet",
      type: "DebitCard",
      currentBalance: 1600,
    },
  ]
}

function getMerchants() {
  return [
    "Luna Market",
    "Urban Cafe",
    "Metro Fuel",
    "Green Basket",
    "Skyline Pharmacy",
    "Cloud Media",
    "Sunrise Bakery",
    "Blue Harbor",
    "North Gym",
    "Corner Books",
  ]
}

function getLocations() {
  return ["Warsaw", "Krakow", "Gdansk", "Wroclaw", "Poznan", "Lodz"]
}

function getIncomeNotes() {
  return ["Monthly salary", "Bonus payout", "Freelance invoice", "Tax return"]
}

function getExpenseNotes() {
  return [
    "Groceries",
    "Coffee",
    "Transport",
    "Home supplies",
    "Online order",
    "Subscription",
  ]
}

function buildTripDefinitions(startDate: Date, endDate: Date) {
  const allDefinitions: TripSeedDefinition[] = [
    {
      name: "Paris, France",
      startDate: new Date("2022-06-10T00:00:00.000Z"),
      endDate: new Date("2022-06-19T00:00:00.000Z"),
      imageUrl:
        "https://tse3.mm.bing.net/th/id/OIP.6Yrhn7ORfVo_4tS4VaSPxQHaEo?rs=1&pid=ImgDetMain&o=7&rm=3",
      country: "FR",
    },
    {
      name: "Berlin, Germany",
      startDate: new Date("2022-10-03T00:00:00.000Z"),
      endDate: new Date("2022-10-09T00:00:00.000Z"),
      imageUrl:
        "https://th.bing.com/th/id/OIP.t6dxttYixG86lZzVESWdygHaEK?w=286&h=180&c=7&r=0&o=7&dpr=1.5&pid=1.7&rm=3",
      country: "DE",
    },
    {
      name: "London, United Kingdom",
      startDate: new Date("2023-03-15T00:00:00.000Z"),
      endDate: new Date("2023-03-20T00:00:00.000Z"),
      imageUrl:
        "https://th.bing.com/th/id/OIP.mPLXOEAwULJlqrItJA0j2gHaFj?w=226&h=180&c=7&r=0&o=7&dpr=1.5&pid=1.7&rm=3",
      country: "GB",
    },
    {
      name: "Lisbon, Portugal",
      startDate: new Date("2023-08-05T00:00:00.000Z"),
      endDate: new Date("2023-08-16T00:00:00.000Z"),
      imageUrl:
        "https://th.bing.com/th/id/R.8838157e1c8a414875b906139e026bb2?rik=IFMzsIMBmauv8w&pid=ImgRaw&r=0",
      country: "PT",
    },
    {
      name: "Nice, France",
      startDate: new Date("2024-05-20T00:00:00.000Z"),
      endDate: new Date("2024-05-28T00:00:00.000Z"),
      imageUrl:
        "https://tse3.mm.bing.net/th/id/OIP.6Yrhn7ORfVo_4tS4VaSPxQHaEo?rs=1&pid=ImgDetMain&o=7&rm=3",
      country: "FR",
    },
    {
      name: "Munich, Germany",
      startDate: new Date("2024-09-20T00:00:00.000Z"),
      endDate: new Date("2024-09-26T00:00:00.000Z"),
      imageUrl:
        "https://th.bing.com/th/id/OIP.t6dxttYixG86lZzVESWdygHaEK?w=286&h=180&c=7&r=0&o=7&dpr=1.5&pid=1.7&rm=3",
      country: "DE",
    },
    {
      name: "Edinburgh, United Kingdom",
      startDate: new Date("2025-04-10T00:00:00.000Z"),
      endDate: new Date("2025-04-15T00:00:00.000Z"),
      imageUrl:
        "https://th.bing.com/th/id/OIP.mPLXOEAwULJlqrItJA0j2gHaFj?w=226&h=180&c=7&r=0&o=7&dpr=1.5&pid=1.7&rm=3",
      country: "GB",
    },
    {
      name: "Porto, Portugal",
      startDate: new Date("2025-07-02T00:00:00.000Z"),
      endDate: new Date("2025-07-12T00:00:00.000Z"),
      imageUrl:
        "https://th.bing.com/th/id/R.8838157e1c8a414875b906139e026bb2?rik=IFMzsIMBmauv8w&pid=ImgRaw&r=0",
      country: "PT",
    },
  ]

  return allDefinitions.filter(
    (definition) =>
      definition.endDate >= startDate && definition.startDate <= endDate
  )
}

class RandomSource {
  private state: number
  private readonly useMathRandom: boolean

  constructor(seed?: number) {
    if (typeof seed === "number" && Number.isFinite(seed)) {
      this.state = Math.trunc(seed) >>> 0 || 1
      this.useMathRandom = false
      return
    }

    this.state = 0
    this.useMathRandom = true
  }

  next() {
    if (this.useMathRandom) {
      return Math.random()
    }

    this.state = (1664525 * this.state + 1013904223) >>> 0
    return this.state / 0x100000000
  }

  nextInt(minInclusive: number, maxExclusive: number) {
    return (
      Math.floor(this.next() * (maxExclusive - minInclusive)) + minInclusive
    )
  }
}

export async function handleSeedDemoRequest(request: Request) {
  const userId = await requireUserIdForRequest(request)
  const url = new URL(request.url)
  const years = clampYears(
    url.searchParams.get("Years") ? Number(url.searchParams.get("Years")) : null
  )
  const seed = url.searchParams.get("Seed")
    ? Number(url.searchParams.get("Seed"))
    : undefined

  const startDate = new Date()
  startDate.setUTCHours(0, 0, 0, 0)
  startDate.setUTCFullYear(startDate.getUTCFullYear() - years)

  const endDate = new Date()
  endDate.setUTCHours(0, 0, 0, 0)

  const random = new RandomSource(seed)

  const [allCategories, existingAccounts, existingTrips] = await Promise.all([
    db.query.categories.findMany({ where: eq(categories.userId, userId) }),
    db.query.accounts.findMany({ where: eq(accounts.userId, userId) }),
    db.query.trips.findMany({ where: eq(trips.userId, userId) }),
  ])

  const expenseCategories = allCategories.filter(
    (category) => category.type === "Expense"
  )
  const incomeCategories = allCategories.filter(
    (category) => category.type === "Income"
  )
  const travelParentIds = new Set(
    expenseCategories
      .filter(
        (category) =>
          category.parentId === null &&
          category.name.trim().toLowerCase() === "travel"
      )
      .map((category) => category.id)
  )

  const nonTravelExpenseCategories = expenseCategories.filter(
    (category) =>
      !travelParentIds.has(category.id) &&
      !(category.parentId && travelParentIds.has(category.parentId))
  )
  const expenseParents = nonTravelExpenseCategories.filter(
    (category) => category.parentId === null
  )
  const expenseChildrenByParent = new Map<string, CategoryRow[]>()
  for (const category of nonTravelExpenseCategories) {
    if (!category.parentId) continue
    const existing = expenseChildrenByParent.get(category.parentId) ?? []
    existing.push(category)
    expenseChildrenByParent.set(category.parentId, existing)
  }

  const accountLookup = new Map(
    existingAccounts.map((account) => [
      account.name.toLowerCase(),
      { ...account },
    ])
  )
  const allAccounts = [...accountLookup.values()]
  const newAccounts: AccountRow[] = []

  for (const definition of getAccountDefinitions()) {
    if (accountLookup.has(definition.name.toLowerCase())) {
      continue
    }

    const account: AccountRow = {
      id: crypto.randomUUID(),
      userId,
      name: definition.name,
      description: definition.description,
      currency: definition.currency,
      color: definition.color,
      icon: definition.icon,
      type: definition.type,
      currentBalance: definition.currentBalance,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    newAccounts.push(account)
    allAccounts.push(account)
    accountLookup.set(account.name.toLowerCase(), account)
  }

  const tripWindows: TripWindow[] = existingTrips
    .filter((trip) => trip.startDate)
    .map((trip) => ({
      id: trip.id,
      startDate: trip.startDate ?? new Date(),
      endDate: trip.endDate ?? trip.startDate ?? new Date(),
    }))

  const newTrips: TripRow[] = []
  for (const definition of buildTripDefinitions(startDate, endDate)) {
    const exists = existingTrips.some(
      (trip) =>
        trip.name.toLowerCase() === definition.name.toLowerCase() &&
        trip.startDate?.getTime() === definition.startDate.getTime() &&
        trip.endDate?.getTime() === definition.endDate.getTime()
    )
    if (exists) continue

    const trip: TripRow = {
      id: crypto.randomUUID(),
      userId,
      name: definition.name,
      country: definition.country,
      startDate: definition.startDate,
      endDate: definition.endDate,
      imageUrl: definition.imageUrl,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    newTrips.push(trip)
    tripWindows.push({
      id: trip.id,
      startDate: definition.startDate,
      endDate: definition.endDate,
    })
  }

  if (
    allAccounts.length === 0 ||
    (expenseParents.length === 0 && incomeCategories.length === 0)
  ) {
    const response: SeedDemoResponse = {
      accountsAdded: newAccounts.length,
      transactionsAdded: 0,
      transfersAdded: 0,
      refundsAdded: 0,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    }
    return Response.json(response)
  }

  const merchants = getMerchants()
  const locations = getLocations()
  const incomeNotes = getIncomeNotes()
  const expenseNotes = getExpenseNotes()
  const transactionBuffer: TransactionInsert[] = []
  const expenseTransactions: TransactionInsert[] = []
  let transfersAdded = 0
  let refundsAdded = 0

  for (
    let date = new Date(startDate);
    date <= endDate;
    date = new Date(date.getTime() + 24 * 60 * 60 * 1000)
  ) {
    const isTripDay = tripWindows.some(
      (trip) => date >= trip.startDate && date <= trip.endDate
    )
    const count = getDailyTransactionCount(random, isTripDay)
    for (let index = 0; index < count; index++) {
      let type = pickTransactionType(
        random,
        expenseTransactions.length > 0,
        incomeCategories.length > 0
      )
      const timestamp = new Date(
        date.getTime() + random.nextInt(0, 24 * 60) * 60 * 1000
      )

      if (type === "Transfer") {
        const source = allAccounts[random.nextInt(0, allAccounts.length)]
        const target = pickDifferentAccount(random, allAccounts, source)
        const amount = nextMoney(random, 20, 600)
        transactionBuffer.push({
          id: crypto.randomUUID(),
          userId,
          date: timestamp,
          type: "Transfer",
          amount,
          amount2: null,
          currency: null,
          currency2: null,
          accountId: source.id,
          categoryId: null,
          subCategoryId: null,
          targetAccountId: target.id,
          relatedTransactionId: null,
          originalTransactionId: null,
          tripId: null,
          isRefund: false,
          note: shouldAssign(random, 0.06) ? "Transfer between accounts" : null,
          merchantName: null,
          location: null,
        })
        applyBalances(source, target, "Transfer", amount)
        transfersAdded++
        continue
      }

      if (type === "Refund") {
        const original = pickValue(random, expenseTransactions)
        if (!original) {
          type = "Expense"
        } else {
          const refundAmount = roundMoney(
            original.amount * (0.2 + random.next() * 0.6)
          )
          const source = allAccounts.find(
            (account) => account.id === original.accountId
          )
          if (!source) continue

          transactionBuffer.push({
            id: crypto.randomUUID(),
            userId,
            date: timestamp,
            type: "Refund",
            amount: refundAmount,
            amount2: null,
            currency: null,
            currency2: null,
            accountId: original.accountId,
            categoryId: original.categoryId,
            subCategoryId: original.subCategoryId,
            targetAccountId: null,
            relatedTransactionId: null,
            originalTransactionId: original.id,
            tripId: original.tripId,
            isRefund: true,
            note: shouldAssign(random, 0.1) ? "Partial refund" : null,
            merchantName: original.merchantName,
            location: original.location,
          })
          applyBalances(source, null, "Refund", refundAmount)
          refundsAdded++
          continue
        }
      }

      if (type === "Income") {
        const account = allAccounts[random.nextInt(0, allAccounts.length)]
        const category =
          pickValue(random, incomeCategories) ??
          pickValue(random, expenseParents)
        const amount = nextMoney(random, 500, 3500)
        transactionBuffer.push({
          id: crypto.randomUUID(),
          userId,
          date: timestamp,
          type: "Income",
          amount,
          amount2: null,
          currency: null,
          currency2: null,
          accountId: account.id,
          categoryId: category?.id ?? null,
          subCategoryId: null,
          targetAccountId: null,
          relatedTransactionId: null,
          originalTransactionId: null,
          tripId: null,
          isRefund: false,
          note: shouldAssign(random, 0.2)
            ? pickValue(random, incomeNotes)
            : null,
          merchantName: "Employer",
          location: pickValue(random, locations),
        })
        applyBalances(account, null, "Income", amount)
        continue
      }

      const expenseAccount = allAccounts[random.nextInt(0, allAccounts.length)]
      const expenseAmount =
        random.next() < 0.1
          ? nextMoney(random, 200, 900)
          : nextMoney(random, 5, 200)
      const expenseParent = pickValue(random, expenseParents)
      const expenseChild =
        expenseParent && random.next() < 0.6
          ? pickValue(
              random,
              expenseChildrenByParent.get(expenseParent.id) ?? []
            )
          : null
      const activeTrip = pickActiveTripForDate(random, tripWindows, timestamp)
      const tripId =
        activeTrip && shouldAssign(random, 0.75) ? activeTrip.id : null

      const expense: TransactionInsert = {
        id: crypto.randomUUID(),
        userId,
        date: timestamp,
        type: "Expense",
        amount: expenseAmount,
        amount2: null,
        currency: null,
        currency2: null,
        accountId: expenseAccount.id,
        categoryId: expenseParent?.id ?? null,
        subCategoryId: expenseChild?.id ?? null,
        targetAccountId: null,
        relatedTransactionId: null,
        originalTransactionId: null,
        tripId,
        isRefund: false,
        note: shouldAssign(random, 0.12)
          ? pickValue(random, expenseNotes)
          : null,
        merchantName: pickValue(random, merchants),
        location: pickValue(random, locations),
      }

      transactionBuffer.push(expense)
      expenseTransactions.push(expense)
      applyBalances(expenseAccount, null, "Expense", expenseAmount)
    }
  }

  db.transaction((tx) => {
    if (newAccounts.length > 0) {
      forEachChunkSync(newAccounts, SQLITE_INSERT_BATCH_SIZE, (chunk) => {
        tx.insert(accounts).values(chunk).run()
      })
    }

    if (newTrips.length > 0) {
      forEachChunkSync(newTrips, SQLITE_INSERT_BATCH_SIZE, (chunk) => {
        tx.insert(trips).values(chunk).run()
      })
    }

    if (transactionBuffer.length > 0) {
      forEachChunkSync(transactionBuffer, SQLITE_INSERT_BATCH_SIZE, (chunk) => {
        tx.insert(transactions).values(chunk).run()
      })
    }

    for (const account of allAccounts) {
      tx.update(accounts)
        .set({ currentBalance: account.currentBalance, updatedAt: new Date() })
        .where(and(eq(accounts.id, account.id), eq(accounts.userId, userId)))
        .run()
    }
  })

  const response: SeedDemoResponse = {
    accountsAdded: newAccounts.length,
    transactionsAdded: transactionBuffer.length,
    transfersAdded,
    refundsAdded,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  }

  return Response.json(response)
}

export function toSeedErrorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return new Response(error.message, { status: error.status })
  }

  console.error("demo seed failed", error)
  return new Response("Unable to seed demo data.", { status: 500 })
}
