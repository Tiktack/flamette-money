import { and, eq, inArray, isNotNull, isNull } from "drizzle-orm"
import * as XLSX from "xlsx"

import { auth } from "@/lib/auth"
import { ensureUserBootstrap } from "@/lib/bootstrap.server"
import { normalizeCurrencyOrDefault, normalizeCurrencyOrNull } from "@/lib/currency"
import { db, runWithDb, type AppDatabase } from "@/lib/db/client.server"
import { forEachChunk, SQLITE_IN_CLAUSE_BATCH_SIZE, SQLITE_INSERT_BATCH_SIZE } from "@/lib/db/sqlite-batch.server"
import {
  accounts,
  accountTypes,
  categories,
  categoryTypes,
  subscriptionTypes,
  transactionItems,
  transactions,
  transactionTypes,
  trips,
  users,
} from "@/lib/db/schema"

import type { ImportBackupResponse } from "@/features/shared/types"

const backupMimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

const flametteBackupFormat = "flamette-money-backup"
const flametteBackupVersion = 1

const settingsSheetName = "Settings"
const accountsSheetName = "Accounts"
const categoriesSheetName = "Categories"
const tripsSheetName = "Trips"
const transactionsSheetName = "Transactions"
const transactionItemsSheetName = "TransactionItems"

const defaultAccountColor = "#4C6EF5"
const defaultAccountIcon = "IconWallet"
const defaultCategoryColor = "#000000"
const defaultParentCategoryIcon = "IconReceipt2"
const defaultChildCategoryIcon = "IconTag"
const defaultOneMoneyCurrency = "PLN"
const defaultOneMoneyAccountType = "DebitCard"

type AccountType = (typeof accountTypes)[number]
type CategoryType = (typeof categoryTypes)[number]
type SubscriptionType = (typeof subscriptionTypes)[number]
type TransactionType = (typeof transactionTypes)[number]

type UserRecord = typeof users.$inferSelect

type FlametteAccountRow = {
  id: string
  name: string
  description: string | null
  currency: string
  color: string
  icon: string
  type: AccountType
  currentBalance: number
  createdAt: Date | null
  updatedAt: Date | null
}

type FlametteCategoryRow = {
  id: string
  name: string
  color: string
  icon: string
  parentId: string | null
  type: CategoryType
  createdAt: Date | null
  updatedAt: Date | null
}

type FlametteTripRow = {
  id: string
  name: string
  country: string | null
  startDate: Date | null
  endDate: Date | null
  imageUrl: string | null
  createdAt: Date | null
  updatedAt: Date | null
}

type FlametteTransactionRow = {
  id: string
  date: Date
  type: TransactionType
  amount: number
  amount2: number | null
  currency: string | null
  currency2: string | null
  accountId: string
  categoryId: string | null
  subCategoryId: string | null
  targetAccountId: string | null
  relatedTransactionId: string | null
  originalTransactionId: string | null
  isRefund: boolean
  note: string | null
  merchantName: string | null
  location: string | null
  tripId: string | null
  createdAt: Date | null
  updatedAt: Date | null
}

type FlametteTransactionItemRow = {
  id: string
  transactionId: string
  name: string
  quantity: number
  unit: string | null
  unitPrice: number
  promotionAmount: number
  finalAmount: number
  categoryId: string | null
  subCategoryId: string | null
  createdAt: Date | null
  updatedAt: Date | null
}

type FlametteSettingsRow = {
  baseCurrency: string
  subscriptionType: SubscriptionType | null
}

type OneMoneyTransactionType = "Income" | "Expense" | "Transfer"

type OneMoneyTransactionRow = {
  date: Date
  type: OneMoneyTransactionType
  fromAccount: string
  target: string
  amount: number
  currency: string
  amount2: number
  currency2: string
  tags: string
  notes: string
}

type OneMoneyBalanceRow = {
  name: string
  balance: number
  currency: string
}

type OneMoneyParseResult = {
  transactions: OneMoneyTransactionRow[]
  balances: OneMoneyBalanceRow[]
  skippedRows: number
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

function normalizeText(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function formatIso(value: Date | null | undefined) {
  return value ? value.toISOString() : ""
}

function formatNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : ""
}

function formatBackupTimestamp(value: Date) {
  const year = value.getUTCFullYear()
  const month = String(value.getUTCMonth() + 1).padStart(2, "0")
  const day = String(value.getUTCDate()).padStart(2, "0")
  const hours = String(value.getUTCHours()).padStart(2, "0")
  const minutes = String(value.getUTCMinutes()).padStart(2, "0")
  const seconds = String(value.getUTCSeconds()).padStart(2, "0")

  return `${year}${month}${day}-${hours}${minutes}${seconds}`
}

function buildWorkbook() {
  return XLSX.utils.book_new()
}

function appendWorksheet(workbook: XLSX.WorkBook, name: string, rows: Array<Array<string | number>>) {
  const sheet = XLSX.utils.aoa_to_sheet(rows)
  XLSX.utils.book_append_sheet(workbook, sheet, name)
}

function getSheetRows(workbook: XLSX.WorkBook, sheetName: string, required = true) {
  const sheet = workbook.Sheets[sheetName]

  if (!sheet) {
    if (required) {
      fail(`Worksheet '${sheetName}' is missing in backup file.`)
    }

    return [] as string[][]
  }

  return XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: false,
    defval: "",
    blankrows: false,
  }) as string[][]
}

function getHeaderMap(headerRow: string[]) {
  return new Map(headerRow.map((header, index) => [header.trim().toLowerCase(), index]))
}

function getRowValue(row: string[], headers: Map<string, number>, name: string) {
  const index = headers.get(name.trim().toLowerCase())
  if (index === undefined) {
    return ""
  }

  return String(row[index] ?? "").trim()
}

function requireRowValue(row: string[], headers: Map<string, number>, name: string) {
  const value = getRowValue(row, headers, name)
  if (!value) {
    fail(`${name} is required in backup file.`)
  }

  return value
}

function hasNonEmptyCell(row: string[]) {
  return row.some((cell) => String(cell ?? "").trim().length > 0)
}

function parseNumber(value: string, fieldName: string) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    fail(`${fieldName} has invalid number value '${value}'.`)
  }

  return parsed
}

function parseOptionalNumber(value: string) {
  const normalized = normalizeText(value)
  if (!normalized) {
    return null
  }

  return parseNumber(normalized, "Value")
}

function parseBoolean(value: string, fieldName: string) {
  if (value === "true" || value === "True") {
    return true
  }

  if (value === "false" || value === "False") {
    return false
  }

  fail(`${fieldName} has invalid boolean value '${value}'.`)
}

function parseDate(value: string, fieldName: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    fail(`${fieldName} has invalid date value '${value}'.`)
  }

  return parsed
}

function parseOptionalDate(value: string) {
  const normalized = normalizeText(value)
  if (!normalized) {
    return null
  }

  return parseDate(normalized, "Date")
}

function normalizeAccountType(value: string): AccountType {
  if ((accountTypes as readonly string[]).includes(value)) {
    return value as AccountType
  }

  fail(`Account type '${value}' is invalid.`)
}

function normalizeCategoryType(value: string): CategoryType {
  if ((categoryTypes as readonly string[]).includes(value)) {
    return value as CategoryType
  }

  fail(`Category type '${value}' is invalid.`)
}

function normalizeTransactionType(value: string): TransactionType {
  if ((transactionTypes as readonly string[]).includes(value)) {
    return value as TransactionType
  }

  fail(`Transaction type '${value}' is invalid.`)
}

function normalizeSubscriptionType(value: string | null | undefined) {
  if (!value) {
    return null
  }

  if ((subscriptionTypes as readonly string[]).includes(value)) {
    return value as SubscriptionType
  }

  return null
}

function parseFlametteSettings(workbook: XLSX.WorkBook): FlametteSettingsRow {
  const rows = getSheetRows(workbook, settingsSheetName)
  const values = new Map<string, string>()

  for (const row of rows.slice(1)) {
    if (!hasNonEmptyCell(row)) {
      continue
    }

    const key = normalizeText(String(row[0] ?? ""))
    if (!key) {
      continue
    }

    values.set(key, String(row[1] ?? "").trim())
  }

  const format = values.get("Format")?.trim()
  if (!format || format.toLowerCase() !== flametteBackupFormat) {
    fail(`Unsupported backup format. Expected '${flametteBackupFormat}'.`)
  }

  const version = Number(values.get("Version") ?? "")
  if (!Number.isFinite(version) || version !== flametteBackupVersion) {
    fail(`Unsupported backup version '${values.get("Version") ?? ""}'.`)
  }

  const baseCurrency = normalizeText(values.get("BaseCurrency"))
  if (!baseCurrency) {
    fail("Settings.BaseCurrency is required.")
  }

  return {
    baseCurrency,
    subscriptionType: normalizeSubscriptionType(normalizeText(values.get("SubscriptionType"))),
  }
}

function parseFlametteAccounts(workbook: XLSX.WorkBook) {
  const rows = getSheetRows(workbook, accountsSheetName)
  const headerRow = rows[0] ?? []
  const headers = getHeaderMap(headerRow)

  return rows
    .slice(1)
    .filter(hasNonEmptyCell)
    .map<FlametteAccountRow>((row) => ({
      id: requireRowValue(row, headers, "Id"),
      name: requireRowValue(row, headers, "Name"),
      description: normalizeText(getRowValue(row, headers, "Description")),
      currency: requireRowValue(row, headers, "Currency"),
      color: normalizeText(getRowValue(row, headers, "Color")) ?? defaultAccountColor,
      icon: normalizeText(getRowValue(row, headers, "Icon")) ?? defaultAccountIcon,
      type: normalizeAccountType(requireRowValue(row, headers, "Type")),
      currentBalance: parseNumber(requireRowValue(row, headers, "CurrentBalance"), "CurrentBalance"),
      createdAt: parseOptionalDate(getRowValue(row, headers, "CreatedAt")),
      updatedAt: parseOptionalDate(getRowValue(row, headers, "UpdatedAt")),
    }))
}

function parseFlametteCategories(workbook: XLSX.WorkBook) {
  const rows = getSheetRows(workbook, categoriesSheetName)
  const headerRow = rows[0] ?? []
  const headers = getHeaderMap(headerRow)

  return rows
    .slice(1)
    .filter(hasNonEmptyCell)
    .map<FlametteCategoryRow>((row) => ({
      id: requireRowValue(row, headers, "Id"),
      name: requireRowValue(row, headers, "Name"),
      color: normalizeText(getRowValue(row, headers, "Color")) ?? defaultCategoryColor,
      icon: normalizeText(getRowValue(row, headers, "Icon")) ?? defaultChildCategoryIcon,
      parentId: normalizeText(getRowValue(row, headers, "ParentId")),
      type: normalizeCategoryType(requireRowValue(row, headers, "Type")),
      createdAt: parseOptionalDate(getRowValue(row, headers, "CreatedAt")),
      updatedAt: parseOptionalDate(getRowValue(row, headers, "UpdatedAt")),
    }))
}

function parseFlametteTrips(workbook: XLSX.WorkBook) {
  const rows = getSheetRows(workbook, tripsSheetName, false)
  if (rows.length === 0) {
    return [] as FlametteTripRow[]
  }

  const headerRow = rows[0] ?? []
  const headers = getHeaderMap(headerRow)

  return rows
    .slice(1)
    .filter(hasNonEmptyCell)
    .map<FlametteTripRow>((row) => ({
      id: requireRowValue(row, headers, "Id"),
      name: requireRowValue(row, headers, "Name"),
      country: normalizeText(getRowValue(row, headers, "Country")),
      startDate: parseOptionalDate(getRowValue(row, headers, "StartDate")),
      endDate: parseOptionalDate(getRowValue(row, headers, "EndDate")),
      imageUrl: normalizeText(getRowValue(row, headers, "ImageUrl")),
      createdAt: parseOptionalDate(getRowValue(row, headers, "CreatedAt")),
      updatedAt: parseOptionalDate(getRowValue(row, headers, "UpdatedAt")),
    }))
}

function parseFlametteTransactions(workbook: XLSX.WorkBook) {
  const rows = getSheetRows(workbook, transactionsSheetName)
  const headerRow = rows[0] ?? []
  const headers = getHeaderMap(headerRow)

  return rows
    .slice(1)
    .filter(hasNonEmptyCell)
    .map<FlametteTransactionRow>((row) => ({
      id: requireRowValue(row, headers, "Id"),
      date: parseDate(requireRowValue(row, headers, "Date"), "Date"),
      type: normalizeTransactionType(requireRowValue(row, headers, "Type")),
      amount: parseNumber(requireRowValue(row, headers, "Amount"), "Amount"),
      amount2: parseOptionalNumber(getRowValue(row, headers, "Amount2")),
      currency: normalizeText(getRowValue(row, headers, "Currency")),
      currency2: normalizeText(getRowValue(row, headers, "Currency2")),
      accountId: requireRowValue(row, headers, "AccountId"),
      categoryId: normalizeText(getRowValue(row, headers, "CategoryId")),
      subCategoryId: normalizeText(getRowValue(row, headers, "SubCategoryId")),
      targetAccountId: normalizeText(getRowValue(row, headers, "TargetAccountId")),
      relatedTransactionId: normalizeText(getRowValue(row, headers, "RelatedTransactionId")),
      originalTransactionId: normalizeText(getRowValue(row, headers, "OriginalTransactionId")),
      isRefund: parseBoolean(requireRowValue(row, headers, "IsRefund"), "IsRefund"),
      note: normalizeText(getRowValue(row, headers, "Note")),
      merchantName: normalizeText(getRowValue(row, headers, "MerchantName")),
      location: normalizeText(getRowValue(row, headers, "Location")),
      tripId: normalizeText(getRowValue(row, headers, "TripId")),
      createdAt: parseOptionalDate(getRowValue(row, headers, "CreatedAt")),
      updatedAt: parseOptionalDate(getRowValue(row, headers, "UpdatedAt")),
    }))
}

function parseFlametteTransactionItems(workbook: XLSX.WorkBook) {
  const rows = getSheetRows(workbook, transactionItemsSheetName)
  const headerRow = rows[0] ?? []
  const headers = getHeaderMap(headerRow)

  return rows
    .slice(1)
    .filter(hasNonEmptyCell)
    .map<FlametteTransactionItemRow>((row) => ({
      id: requireRowValue(row, headers, "Id"),
      transactionId: requireRowValue(row, headers, "TransactionId"),
      name: requireRowValue(row, headers, "Name"),
      quantity: parseNumber(requireRowValue(row, headers, "Quantity"), "Quantity"),
      unit: normalizeText(getRowValue(row, headers, "Unit")),
      unitPrice: parseNumber(requireRowValue(row, headers, "UnitPrice"), "UnitPrice"),
      promotionAmount: parseNumber(requireRowValue(row, headers, "PromotionAmount"), "PromotionAmount"),
      finalAmount: parseNumber(requireRowValue(row, headers, "FinalAmount"), "FinalAmount"),
      categoryId: normalizeText(getRowValue(row, headers, "CategoryId")),
      subCategoryId: normalizeText(getRowValue(row, headers, "SubCategoryId")),
      createdAt: parseOptionalDate(getRowValue(row, headers, "CreatedAt")),
      updatedAt: parseOptionalDate(getRowValue(row, headers, "UpdatedAt")),
    }))
}

async function requireUserForRequest(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })

  if (!session) {
    fail("Unauthorized", 401)
  }

  await ensureUserBootstrap(session.user.id)

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  })

  if (!user) {
    fail("User profile was not found.")
  }

  return user
}

async function clearUserScopedData(database: AppDatabase, userId: string) {
  const existingTransactions = await database.query.transactions
    .findMany({
      where: eq(transactions.userId, userId),
      columns: { id: true },
    })

  const transactionIds = existingTransactions.map((transaction) => transaction.id)

  await database.update(transactions)
    .set({
      originalTransactionId: null,
      relatedTransactionId: null,
    })
    .where(eq(transactions.userId, userId))

  if (transactionIds.length > 0) {
    await forEachChunk(transactionIds, SQLITE_IN_CLAUSE_BATCH_SIZE, async (chunk) => {
      await database.delete(transactionItems).where(inArray(transactionItems.transactionId, chunk))
    })
  }

  await database.delete(transactions).where(eq(transactions.userId, userId))
  await database.delete(trips).where(eq(trips.userId, userId))
  await database.delete(categories)
    .where(and(eq(categories.userId, userId), isNotNull(categories.parentId)))
  await database.delete(categories)
    .where(and(eq(categories.userId, userId), isNull(categories.parentId)))
  await database.delete(accounts).where(eq(accounts.userId, userId))
}

function pickAccountColor(accountName: string) {
  const palette = ["#4C6EF5", "#339AF0", "#22B8CF", "#20C997", "#51CF66", "#FCC419", "#FF922B", "#FF6B6B", "#CC5DE8"]
  const hash = Array.from(accountName.trim().toUpperCase()).reduce((total, character) => total * 31 + character.charCodeAt(0), 0)
  return palette[Math.abs(hash) % palette.length] ?? defaultAccountColor
}

function pickCategoryColor(seed: string) {
  const hash = Array.from(seed.trim().toUpperCase()).reduce((total, character) => total * 31 + character.charCodeAt(0), 17)
  const red = 48 + (Math.abs(hash) % 160)
  const green = 48 + (Math.abs(hash * 3) % 160)
  const blue = 48 + (Math.abs(hash * 7) % 160)

  return `#${red.toString(16).padStart(2, "0")}${green.toString(16).padStart(2, "0")}${blue.toString(16).padStart(2, "0")}`.toUpperCase()
}

function parseCsvLine(line: string) {
  const cells: string[] = []
  let current = ""
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]

    if (character === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }

      continue
    }

    if (character === "," && !inQuotes) {
      cells.push(current)
      current = ""
      continue
    }

    current += character
  }

  cells.push(current)
  return cells
}

function matchesCsvHeader(cells: string[], first: string, second: string) {
  return cells.length >= 2 && cells[0]?.trim().toUpperCase() === first && cells[1]?.trim().toUpperCase() === second
}

function tryParseOneMoneyDate(raw: string) {
  const normalized = raw.trim()
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(normalized)
  if (!match) {
    return null
  }

  const month = Number(match[1])
  const day = Number(match[2])
  const yearPart = Number(match[3])
  const year = match[3]?.length === 2 ? 2000 + yearPart : yearPart
  const parsed = new Date(year, month - 1, day)

  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function parseOneMoneyType(raw: string): OneMoneyTransactionType | null {
  const normalized = raw.trim().toLowerCase()
  if (normalized === "income") {
    return "Income"
  }

  if (normalized === "expense") {
    return "Expense"
  }

  if (normalized === "transfer") {
    return "Transfer"
  }

  return null
}

function tryParseOneMoneyTransaction(cells: string[]) {
  if (cells.length < 10) {
    return null
  }

  const date = tryParseOneMoneyDate(cells[0] ?? "")
  const type = parseOneMoneyType(cells[1] ?? "")
  const amount = Number(cells[4] ?? "")

  if (!date || !type || !Number.isFinite(amount)) {
    return null
  }

  const amount2 = Number(cells[6] ?? "")

  return {
    date,
    type,
    fromAccount: (cells[2] ?? "").trim(),
    target: (cells[3] ?? "").trim(),
    amount,
    currency: (cells[5] ?? "").trim(),
    amount2: Number.isFinite(amount2) ? amount2 : 0,
    currency2: (cells[7] ?? "").trim(),
    tags: (cells[8] ?? "").trim(),
    notes: (cells[9] ?? "").trim(),
  } satisfies OneMoneyTransactionRow
}

function tryParseOneMoneyBalance(cells: string[]) {
  if (cells.length < 3) {
    return null
  }

  const name = (cells[0] ?? "").trim()
  const balance = Number(cells[1] ?? "")

  if (!name || !Number.isFinite(balance)) {
    return null
  }

  return {
    name,
    balance,
    currency: (cells[2] ?? "").trim(),
  } satisfies OneMoneyBalanceRow
}

function parseOneMoneyCsv(content: string): OneMoneyParseResult {
  const result: OneMoneyParseResult = {
    transactions: [],
    balances: [],
    skippedRows: 0,
  }

  let section: "none" | "transactions" | "balances" = "none"

  for (const rawLine of content.split(/\r?\n/u)) {
    if (!rawLine.trim()) {
      continue
    }

    const cells = parseCsvLine(rawLine)
    if (cells.every((cell) => !cell.trim())) {
      continue
    }

    if (matchesCsvHeader(cells, "DATE", "TYPE")) {
      section = "transactions"
      continue
    }

    if (matchesCsvHeader(cells, "NAME", "BALANCE")) {
      section = "balances"
      continue
    }

    if (section === "transactions") {
      const row = tryParseOneMoneyTransaction(cells)
      if (!row) {
        result.skippedRows += 1
      } else {
        result.transactions.push(row)
      }

      continue
    }

    if (section === "balances") {
      const row = tryParseOneMoneyBalance(cells)
      if (!row) {
        result.skippedRows += 1
      } else {
        result.balances.push(row)
      }
    }
  }

  return result
}

function buildOneMoneyNote(tags: string, notes: string) {
  const parts = [normalizeText(tags) ? `Tags: ${tags.trim()}` : null, normalizeText(notes)].filter((value): value is string => Boolean(value))

  return parts.length > 0 ? parts.join(" | ") : null
}

function parseCategoryParts(rawValue: string) {
  const value = rawValue.trim()
  if (!value) {
    return { parentName: "Other", childName: null as string | null }
  }

  const openIndex = value.lastIndexOf("(")
  const closeIndex = value.endsWith(")") ? value.length - 1 : -1

  if (openIndex > 0 && closeIndex > openIndex) {
    const parentName = value.slice(0, openIndex).trim()
    const childName = value.slice(openIndex + 1, closeIndex).trim()

    if (parentName && childName) {
      return { parentName, childName }
    }
  }

  return { parentName: value, childName: null as string | null }
}

function buildCategoryKey(name: string, type: CategoryType, parentId: string | null) {
  return `${name.trim()}|${type}|${parentId ?? "ROOT"}`
}

function normalizeBackupType(rawType: string | null | undefined) {
  const normalized = rawType?.trim().toLowerCase() ?? ""
  if (normalized === "flamette") {
    return "flamette" as const
  }

  if (normalized === "one-money" || normalized === "onemoney" || normalized === "1money") {
    return "one-money" as const
  }

  return null
}

async function exportFlametteBackup(user: UserRecord) {
  const userAccounts = await db.query.accounts.findMany({
    where: eq(accounts.userId, user.id),
    orderBy: (table, { asc }) => [asc(table.name), asc(table.id)],
  })

  const userCategories = await db.query.categories.findMany({
    where: eq(categories.userId, user.id),
    orderBy: (table, { asc }) => [asc(table.parentId), asc(table.name), asc(table.id)],
  })

  const userTrips = await db.query.trips.findMany({
    where: eq(trips.userId, user.id),
    orderBy: (table, { asc }) => [asc(table.name), asc(table.id)],
  })

  const userTransactions = await db.query.transactions.findMany({
    where: eq(transactions.userId, user.id),
    orderBy: (table, { asc }) => [asc(table.date), asc(table.id)],
  })

  const transactionIds = userTransactions.map((transaction) => transaction.id)
  const userTransactionItems: Array<typeof transactionItems.$inferSelect> = []

  if (transactionIds.length > 0) {
    await forEachChunk(transactionIds, SQLITE_IN_CLAUSE_BATCH_SIZE, async (chunk) => {
      const items = await db.query.transactionItems.findMany({
        where: inArray(transactionItems.transactionId, chunk),
        orderBy: (table, { asc }) => [asc(table.transactionId), asc(table.id)],
      })

      userTransactionItems.push(...items)
    })
  }

  const workbook = buildWorkbook()

  appendWorksheet(workbook, settingsSheetName, [
    ["Key", "Value"],
    ["Format", flametteBackupFormat],
    ["Version", String(flametteBackupVersion)],
    ["ExportedAtUtc", new Date().toISOString()],
    ["BaseCurrency", user.baseCurrency],
    ["SubscriptionType", user.subscriptionType],
  ])

  appendWorksheet(workbook, accountsSheetName, [
    ["Id", "Name", "Description", "Currency", "Color", "Icon", "Type", "CurrentBalance", "CreatedAt", "UpdatedAt"],
    ...userAccounts.map((account) => [
      account.id,
      account.name,
      account.description ?? "",
      account.currency,
      account.color,
      account.icon,
      account.type,
      formatNumber(account.currentBalance),
      formatIso(account.createdAt),
      formatIso(account.updatedAt),
    ]),
  ])

  appendWorksheet(workbook, categoriesSheetName, [
    ["Id", "Name", "Color", "Icon", "ParentId", "Type", "CreatedAt", "UpdatedAt"],
    ...userCategories.map((category) => [
      category.id,
      category.name,
      category.color,
      category.icon,
      category.parentId ?? "",
      category.type,
      formatIso(category.createdAt),
      formatIso(category.updatedAt),
    ]),
  ])

  appendWorksheet(workbook, tripsSheetName, [
    ["Id", "Name", "Country", "StartDate", "EndDate", "ImageUrl", "CreatedAt", "UpdatedAt"],
    ...userTrips.map((trip) => [
      trip.id,
      trip.name,
      trip.country ?? "",
      formatIso(trip.startDate),
      formatIso(trip.endDate),
      trip.imageUrl ?? "",
      formatIso(trip.createdAt),
      formatIso(trip.updatedAt),
    ]),
  ])

  appendWorksheet(workbook, transactionsSheetName, [
    [
      "Id",
      "Date",
      "Type",
      "Amount",
      "Amount2",
      "Currency",
      "Currency2",
      "AccountId",
      "CategoryId",
      "SubCategoryId",
      "TargetAccountId",
      "RelatedTransactionId",
      "OriginalTransactionId",
      "IsRefund",
      "Note",
      "MerchantName",
      "Location",
      "TripId",
      "CreatedAt",
      "UpdatedAt",
    ],
    ...userTransactions.map((transaction) => [
      transaction.id,
      transaction.date.toISOString(),
      transaction.type,
      formatNumber(transaction.amount),
      formatNumber(transaction.amount2),
      transaction.currency ?? "",
      transaction.currency2 ?? "",
      transaction.accountId,
      transaction.categoryId ?? "",
      transaction.subCategoryId ?? "",
      transaction.targetAccountId ?? "",
      transaction.relatedTransactionId ?? "",
      transaction.originalTransactionId ?? "",
      transaction.isRefund ? "true" : "false",
      transaction.note ?? "",
      transaction.merchantName ?? "",
      transaction.location ?? "",
      transaction.tripId ?? "",
      formatIso(transaction.createdAt),
      formatIso(transaction.updatedAt),
    ]),
  ])

  appendWorksheet(workbook, transactionItemsSheetName, [
    ["Id", "TransactionId", "Name", "Quantity", "Unit", "UnitPrice", "PromotionAmount", "FinalAmount", "CategoryId", "SubCategoryId", "CreatedAt", "UpdatedAt"],
    ...userTransactionItems.map((item) => [
      item.id,
      item.transactionId,
      item.name,
      formatNumber(item.quantity),
      item.unit ?? "",
      formatNumber(item.unitPrice),
      formatNumber(item.promotionAmount),
      formatNumber(item.finalAmount),
      item.categoryId ?? "",
      item.subCategoryId ?? "",
      formatIso(item.createdAt),
      formatIso(item.updatedAt),
    ]),
  ])

  const payload = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
    compression: true,
  }) as Uint8Array
  const payloadBuffer = Uint8Array.from(payload).buffer

  return new Response(new Blob([payloadBuffer], { type: backupMimeType }), {
    status: 200,
    headers: {
      "Content-Disposition": `attachment; filename="flamette-backup-${formatBackupTimestamp(new Date())}.xlsx"`,
      "Content-Type": backupMimeType,
    },
  })
}

async function importFlametteBackup(user: UserRecord, file: File): Promise<ImportBackupResponse> {
  const workbook = XLSX.read(Buffer.from(await file.arrayBuffer()), {
    type: "buffer",
  })

  const settings = parseFlametteSettings(workbook)
  const accountRows = parseFlametteAccounts(workbook)
  const categoryRows = parseFlametteCategories(workbook)
  const tripRows = parseFlametteTrips(workbook)
  const transactionRows = parseFlametteTransactions(workbook)
  const transactionItemRows = parseFlametteTransactionItems(workbook)

  const now = new Date()

  return runWithDb(async (database) => {
    await clearUserScopedData(database, user.id)

    const importedAccounts = accountRows
      .filter((row) => row.id && row.name.trim())
      .map((row) => ({
        id: row.id,
        userId: user.id,
        name: row.name.trim(),
        description: row.description,
        currency: normalizeCurrencyOrDefault(row.currency, user.baseCurrency),
        color: row.color || defaultAccountColor,
        icon: row.icon || defaultAccountIcon,
        type: row.type,
        currentBalance: row.currentBalance,
        createdAt: row.createdAt ?? now,
        updatedAt: row.updatedAt ?? now,
      }))

    const accountIds = new Set(importedAccounts.map((row) => row.id))
    const categoryRowsById = new Map(categoryRows.filter((row) => row.id && row.name.trim()).map((row) => [row.id, row]))
    const insertedCategoryIds = new Set<string>()
    const importedCategories: Array<typeof categories.$inferInsert> = []
    let skippedRows = 0

    while (insertedCategoryIds.size < categoryRowsById.size) {
      let madeProgress = false

      for (const row of categoryRowsById.values()) {
        if (insertedCategoryIds.has(row.id)) {
          continue
        }

        if (row.parentId && !insertedCategoryIds.has(row.parentId)) {
          continue
        }

        importedCategories.push({
          id: row.id,
          userId: user.id,
          name: row.name.trim(),
          color: row.color || defaultCategoryColor,
          icon: row.icon || (row.parentId ? defaultChildCategoryIcon : defaultParentCategoryIcon),
          parentId: row.parentId,
          type: row.type,
          createdAt: row.createdAt ?? now,
          updatedAt: row.updatedAt ?? now,
        })

        insertedCategoryIds.add(row.id)
        madeProgress = true
      }

      if (!madeProgress) {
        skippedRows += categoryRowsById.size - insertedCategoryIds.size
        break
      }
    }

    const categoryIds = new Set(importedCategories.map((row) => row.id))
    const importedTrips = tripRows
      .filter((row) => row.id && row.name.trim())
      .map((row) => ({
        id: row.id,
        userId: user.id,
        name: row.name.trim(),
        country: row.country,
        startDate: row.startDate,
        endDate: row.endDate,
        imageUrl: row.imageUrl,
        createdAt: row.createdAt ?? now,
        updatedAt: row.updatedAt ?? now,
      }))

    const tripIds = new Set(importedTrips.map((row) => row.id))
    const importedTransactions: Array<typeof transactions.$inferInsert> = []
    const relatedReferences: Array<{
      id: string
      relatedTransactionId: string | null
      originalTransactionId: string | null
    }> = []

    for (const row of transactionRows) {
      if (!accountIds.has(row.accountId)) {
        skippedRows += 1
        continue
      }

      if (row.targetAccountId && !accountIds.has(row.targetAccountId)) {
        skippedRows += 1
        continue
      }

      if (row.categoryId && !categoryIds.has(row.categoryId)) {
        skippedRows += 1
        continue
      }

      if (row.subCategoryId && !categoryIds.has(row.subCategoryId)) {
        skippedRows += 1
        continue
      }

      if (row.tripId && !tripIds.has(row.tripId)) {
        skippedRows += 1
        continue
      }

      importedTransactions.push({
        id: row.id,
        userId: user.id,
        date: row.date,
        type: row.type,
        amount: row.amount,
        amount2: row.amount2,
        currency: normalizeCurrencyOrNull(row.currency),
        currency2: normalizeCurrencyOrNull(row.currency2),
        accountId: row.accountId,
        categoryId: row.categoryId,
        subCategoryId: row.subCategoryId,
        targetAccountId: row.targetAccountId,
        relatedTransactionId: null,
        originalTransactionId: null,
        tripId: row.tripId,
        isRefund: row.isRefund,
        note: row.note,
        merchantName: row.merchantName,
        location: row.location,
        createdAt: row.createdAt ?? now,
        updatedAt: row.updatedAt ?? now,
      })

      relatedReferences.push({
        id: row.id,
        relatedTransactionId: row.relatedTransactionId,
        originalTransactionId: row.originalTransactionId,
      })
    }

    const importedTransactionIds = new Set(importedTransactions.map((row) => row.id))
    const importedTransactionItems: Array<typeof transactionItems.$inferInsert> = []

    for (const row of transactionItemRows) {
      if (!importedTransactionIds.has(row.transactionId)) {
        skippedRows += 1
        continue
      }

      if (row.categoryId && !categoryIds.has(row.categoryId)) {
        skippedRows += 1
        continue
      }

      if (row.subCategoryId && !categoryIds.has(row.subCategoryId)) {
        skippedRows += 1
        continue
      }

      importedTransactionItems.push({
        id: row.id,
        transactionId: row.transactionId,
        name: row.name,
        quantity: row.quantity,
        unit: row.unit,
        unitPrice: row.unitPrice,
        promotionAmount: row.promotionAmount,
        finalAmount: row.finalAmount,
        categoryId: row.categoryId,
        subCategoryId: row.subCategoryId,
        createdAt: row.createdAt ?? now,
        updatedAt: row.updatedAt ?? now,
      })
    }

    if (importedAccounts.length > 0) {
      await forEachChunk(importedAccounts, SQLITE_INSERT_BATCH_SIZE, async (chunk) => {
        await database.insert(accounts).values(chunk)
      })
    }

    if (importedCategories.length > 0) {
      await forEachChunk(importedCategories, SQLITE_INSERT_BATCH_SIZE, async (chunk) => {
        await database.insert(categories).values(chunk)
      })
    }

    if (importedTrips.length > 0) {
      await forEachChunk(importedTrips, SQLITE_INSERT_BATCH_SIZE, async (chunk) => {
        await database.insert(trips).values(chunk)
      })
    }

    if (importedTransactions.length > 0) {
      await forEachChunk(importedTransactions, SQLITE_INSERT_BATCH_SIZE, async (chunk) => {
        await database.insert(transactions).values(chunk)
      })
    }

    for (const reference of relatedReferences) {
      const nextRelatedId = reference.relatedTransactionId && importedTransactionIds.has(reference.relatedTransactionId) ? reference.relatedTransactionId : null
      const nextOriginalId =
        reference.originalTransactionId && importedTransactionIds.has(reference.originalTransactionId) ? reference.originalTransactionId : null

      if (!nextRelatedId && !nextOriginalId) {
        continue
      }

      await database.update(transactions)
        .set({
          relatedTransactionId: nextRelatedId,
          originalTransactionId: nextOriginalId,
        })
        .where(eq(transactions.id, reference.id))
    }

    if (importedTransactionItems.length > 0) {
      await forEachChunk(importedTransactionItems, SQLITE_INSERT_BATCH_SIZE, async (chunk) => {
        await database.insert(transactionItems).values(chunk)
      })
    }

    const nextBaseCurrency = normalizeCurrencyOrDefault(settings.baseCurrency, user.baseCurrency)
    const nextSubscriptionType = settings.subscriptionType ?? user.subscriptionType
    const settingsChanged = nextBaseCurrency !== user.baseCurrency || nextSubscriptionType !== user.subscriptionType

    if (settingsChanged) {
      await database.update(users)
        .set({
          baseCurrency: nextBaseCurrency,
          subscriptionType: nextSubscriptionType,
          updatedAt: now,
        })
        .where(eq(users.id, user.id))
    }

    return {
      type: "flamette",
      importedTransactions: importedTransactions.length,
      importedAccounts: importedAccounts.length,
      importedCategories: importedCategories.length,
      importedSubCategories: importedCategories.filter((row) => row.parentId).length,
      importedTransactionItems: importedTransactionItems.length,
      updatedBalanceSnapshots: importedAccounts.length,
      updatedSettings: settingsChanged ? 1 : 0,
      skippedRows,
    } satisfies ImportBackupResponse
  })
}

async function importOneMoneyBackup(user: UserRecord, file: File): Promise<ImportBackupResponse> {
  const parsed = parseOneMoneyCsv(await file.text())

  if (parsed.transactions.length === 0) {
    fail("No transaction rows were found in the CSV.")
  }

  const accountCurrencyHints = new Map<string, string>()
  const allAccountNames = new Set<string>()

  for (const balance of parsed.balances) {
    allAccountNames.add(balance.name.trim())
    const normalized = normalizeCurrencyOrNull(balance.currency) ?? normalizeText(balance.currency)?.toUpperCase() ?? null
    if (normalized) {
      accountCurrencyHints.set(balance.name.trim(), normalized)
    }
  }

  for (const transaction of parsed.transactions) {
    if (transaction.fromAccount.trim()) {
      allAccountNames.add(transaction.fromAccount.trim())
      const sourceCurrency = normalizeCurrencyOrNull(transaction.currency) ?? normalizeText(transaction.currency)?.toUpperCase() ?? null
      if (sourceCurrency && !accountCurrencyHints.has(transaction.fromAccount.trim())) {
        accountCurrencyHints.set(transaction.fromAccount.trim(), sourceCurrency)
      }
    }

    if (transaction.type === "Transfer" && transaction.target.trim()) {
      allAccountNames.add(transaction.target.trim())
      const targetCurrency = normalizeCurrencyOrNull(transaction.currency2) ?? normalizeText(transaction.currency2)?.toUpperCase() ?? null
      if (targetCurrency && !accountCurrencyHints.has(transaction.target.trim())) {
        accountCurrencyHints.set(transaction.target.trim(), targetCurrency)
      }
    }
  }

  const now = new Date()

  return runWithDb(async (database) => {
    await clearUserScopedData(database, user.id)

    const accountsByName = new Map<string, typeof accounts.$inferInsert>()
    const importedAccounts: Array<typeof accounts.$inferInsert> = []

    for (const accountName of Array.from(allAccountNames).sort((left, right) => left.localeCompare(right))) {
      if (!accountName) {
        continue
      }

      const currencyHint = accountCurrencyHints.get(accountName) ?? defaultOneMoneyCurrency
      const account = {
        id: crypto.randomUUID(),
        userId: user.id,
        name: accountName,
        description: null,
        currency: normalizeCurrencyOrDefault(currencyHint, defaultOneMoneyCurrency),
        color: pickAccountColor(accountName),
        icon: defaultAccountIcon,
        type: defaultOneMoneyAccountType as AccountType,
        currentBalance: 0,
        createdAt: now,
        updatedAt: now,
      }

      accountsByName.set(accountName, account)
      importedAccounts.push(account)
    }

    const categoriesByKey = new Map<string, typeof categories.$inferInsert>()
    const importedCategories: Array<typeof categories.$inferInsert> = []
    let createdCategories = 0
    let createdSubCategories = 0

    const ensureCategory = (name: string, type: CategoryType, parentId: string | null) => {
      const key = buildCategoryKey(name, type, parentId)
      const existing = categoriesByKey.get(key)
      if (existing) {
        return existing
      }

      const category = {
        id: crypto.randomUUID(),
        userId: user.id,
        name: name.trim(),
        color: pickCategoryColor(key),
        icon: parentId ? defaultChildCategoryIcon : type === "Income" ? "IconCoins" : defaultParentCategoryIcon,
        parentId,
        type,
        createdAt: now,
        updatedAt: now,
      }

      categoriesByKey.set(key, category)
      importedCategories.push(category)

      if (parentId) {
        createdSubCategories += 1
      } else {
        createdCategories += 1
      }

      return category
    }

    for (const row of parsed.transactions) {
      if (row.type !== "Income" && row.type !== "Expense") {
        continue
      }

      if (!row.target.trim()) {
        continue
      }

      const categoryType: CategoryType = row.type === "Income" ? "Income" : "Expense"
      const { parentName, childName } = parseCategoryParts(row.target)
      const parent = ensureCategory(parentName, categoryType, null)

      if (childName) {
        ensureCategory(childName, categoryType, parent.id)
      }
    }

    const importedTransactions: Array<typeof transactions.$inferInsert> = []
    let skippedRows = parsed.skippedRows

    for (const row of [...parsed.transactions].sort((left, right) => left.date.getTime() - right.date.getTime())) {
      const sourceAccount = accountsByName.get(row.fromAccount.trim())

      if (!sourceAccount || row.amount <= 0) {
        skippedRows += 1
        continue
      }

      if (row.type === "Expense" || row.type === "Income") {
        const categoryType: CategoryType = row.type === "Income" ? "Income" : "Expense"
        const { parentName, childName } = parseCategoryParts(row.target)
        const parent = categoriesByKey.get(buildCategoryKey(parentName, categoryType, null))

        if (!parent) {
          skippedRows += 1
          continue
        }

        const child = childName ? (categoriesByKey.get(buildCategoryKey(childName, categoryType, parent.id)) ?? null) : null

        importedTransactions.push({
          id: crypto.randomUUID(),
          userId: user.id,
          date: row.date,
          type: row.type,
          amount: row.amount,
          amount2: row.amount2 > 0 ? row.amount2 : null,
          currency: normalizeCurrencyOrNull(row.currency) ?? sourceAccount.currency,
          currency2: normalizeCurrencyOrNull(row.currency2),
          accountId: sourceAccount.id,
          categoryId: parent.id,
          subCategoryId: child?.id ?? null,
          targetAccountId: null,
          relatedTransactionId: null,
          originalTransactionId: null,
          tripId: null,
          isRefund: false,
          note: buildOneMoneyNote(row.tags, row.notes),
          merchantName: null,
          location: null,
          createdAt: now,
          updatedAt: now,
        })

        sourceAccount.currentBalance = (sourceAccount.currentBalance ?? 0) + (row.type === "Income" ? row.amount : -row.amount)
        continue
      }

      if (row.type === "Transfer") {
        const targetAccount = accountsByName.get(row.target.trim())
        if (!targetAccount) {
          skippedRows += 1
          continue
        }

        const targetAmount = row.amount2 > 0 ? row.amount2 : row.amount

        importedTransactions.push({
          id: crypto.randomUUID(),
          userId: user.id,
          date: row.date,
          type: "Transfer",
          amount: row.amount,
          amount2: targetAmount,
          currency: normalizeCurrencyOrNull(row.currency) ?? sourceAccount.currency,
          currency2: normalizeCurrencyOrNull(row.currency2) ?? targetAccount.currency,
          accountId: sourceAccount.id,
          categoryId: null,
          subCategoryId: null,
          targetAccountId: targetAccount.id,
          relatedTransactionId: null,
          originalTransactionId: null,
          tripId: null,
          isRefund: false,
          note: buildOneMoneyNote(row.tags, row.notes),
          merchantName: null,
          location: null,
          createdAt: now,
          updatedAt: now,
        })

        sourceAccount.currentBalance = (sourceAccount.currentBalance ?? 0) - row.amount
        targetAccount.currentBalance = (targetAccount.currentBalance ?? 0) + targetAmount
        continue
      }

      skippedRows += 1
    }

    let updatedBalanceSnapshots = 0

    for (const balance of parsed.balances) {
      const account = accountsByName.get(balance.name.trim())
      if (!account) {
        continue
      }

      account.currentBalance = balance.balance
      const normalizedCurrency = normalizeCurrencyOrNull(balance.currency)
      if (normalizedCurrency) {
        account.currency = normalizedCurrency
      }

      updatedBalanceSnapshots += 1
    }

    if (importedAccounts.length > 0) {
      await forEachChunk(importedAccounts, SQLITE_INSERT_BATCH_SIZE, async (chunk) => {
        await database.insert(accounts).values(chunk)
      })
    }

    if (importedCategories.length > 0) {
      await forEachChunk(importedCategories, SQLITE_INSERT_BATCH_SIZE, async (chunk) => {
        await database.insert(categories).values(chunk)
      })
    }

    if (importedTransactions.length > 0) {
      await forEachChunk(importedTransactions, SQLITE_INSERT_BATCH_SIZE, async (chunk) => {
        await database.insert(transactions).values(chunk)
      })
    }

    return {
      type: "one-money",
      importedTransactions: importedTransactions.length,
      importedAccounts: importedAccounts.length,
      importedCategories: createdCategories,
      importedSubCategories: createdSubCategories,
      importedTransactionItems: 0,
      updatedBalanceSnapshots,
      updatedSettings: 0,
      skippedRows,
    } satisfies ImportBackupResponse
  })
}

export async function handleExportBackupRequest(request: Request) {
  const url = new URL(request.url)
  const type = normalizeBackupType(url.searchParams.get("type") ?? "flamette")

  if (type !== "flamette") {
    fail("Unsupported backup type. Use 'flamette'.")
  }

  const user = await requireUserForRequest(request)
  return exportFlametteBackup(user)
}

export async function handleImportBackupRequest(request: Request) {
  const user = await requireUserForRequest(request)
  const formData = await request.formData()

  const typeValue = formData.get("type")
  const fileValue = formData.get("file")
  const type = normalizeBackupType(typeof typeValue === "string" ? typeValue : null)

  if (!(fileValue instanceof File) || fileValue.size === 0) {
    fail("Backup file is required.")
  }

  if (!type) {
    fail("Unsupported backup type. Use 'one-money' or 'flamette'.")
  }

  if (type === "flamette") {
    return Response.json(await importFlametteBackup(user, fileValue))
  }

  return Response.json(await importOneMoneyBackup(user, fileValue))
}

export function toBackupErrorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return new Response(error.message, { status: error.status })
  }

  console.error("backup request failed", error)
  const message = error instanceof Error ? error.message : "Unexpected backup error."
  return new Response(message, { status: 500 })
}
