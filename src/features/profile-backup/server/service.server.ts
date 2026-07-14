import { eq } from "drizzle-orm"
import * as XLSX from "xlsx"

import { normalizeCurrencyOrDefault, normalizeCurrencyOrNull } from "@/lib/currency"
import { db, runDbTransaction } from "@/lib/db/client.server"
import { forEachChunkSync, SQLITE_INSERT_BATCH_SIZE } from "@/lib/db/sqlite-batch.server"
import { accounts, accountTypes, categories, categoryTypes, subscriptionTypes, transactions, transactionTypes, trips, users } from "@/lib/db/schema"
import { fail, requireUserForRequest } from "@/lib/server/http.server"

import {
  normalizeAccountType as toAccountType,
  normalizeCategoryType as toCategoryType,
  normalizeTransactionType as toTransactionType,
  normalizeTrimmed,
} from "@/features/shared/server/normalizers.server"
import { clearUserScopedData } from "@/features/shared/server/user-data.server"

import type { ImportBackupResponse } from "@/features/shared/types"

const backupMimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

const flametteBackupFormat = "flamette-money-backup"
const flametteBackupVersion = 1

const settingsSheetName = "Settings"
const accountsSheetName = "Accounts"
const categoriesSheetName = "Categories"
const tripsSheetName = "Trips"
const transactionsSheetName = "Transactions"

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
  const normalized = normalizeTrimmed(value)
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
  const normalized = normalizeTrimmed(value)
  if (!normalized) {
    return null
  }

  return parseDate(normalized, "Date")
}

/** Converts the shared normalizers' plain Errors into 400 HttpErrors so imports reject cleanly. */
function asBadRequest<T>(normalize: () => T): T {
  try {
    return normalize()
  } catch (error) {
    fail(error instanceof Error ? error.message : "Backup file contains an invalid value.")
  }
}

function normalizeAccountType(value: string): AccountType {
  return asBadRequest(() => toAccountType(value))
}

function normalizeCategoryType(value: string): CategoryType {
  return asBadRequest(() => toCategoryType(value))
}

function normalizeTransactionType(value: string): TransactionType {
  return asBadRequest(() => toTransactionType(value))
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

    const key = normalizeTrimmed(String(row[0] ?? ""))
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

  const baseCurrency = normalizeTrimmed(values.get("BaseCurrency"))
  if (!baseCurrency) {
    fail("Settings.BaseCurrency is required.")
  }

  return {
    baseCurrency,
    subscriptionType: normalizeSubscriptionType(normalizeTrimmed(values.get("SubscriptionType"))),
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
      description: normalizeTrimmed(getRowValue(row, headers, "Description")),
      currency: requireRowValue(row, headers, "Currency"),
      color: normalizeTrimmed(getRowValue(row, headers, "Color")) ?? defaultAccountColor,
      icon: normalizeTrimmed(getRowValue(row, headers, "Icon")) ?? defaultAccountIcon,
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
      color: normalizeTrimmed(getRowValue(row, headers, "Color")) ?? defaultCategoryColor,
      icon: normalizeTrimmed(getRowValue(row, headers, "Icon")) ?? defaultChildCategoryIcon,
      parentId: normalizeTrimmed(getRowValue(row, headers, "ParentId")),
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
      country: normalizeTrimmed(getRowValue(row, headers, "Country")),
      startDate: parseOptionalDate(getRowValue(row, headers, "StartDate")),
      endDate: parseOptionalDate(getRowValue(row, headers, "EndDate")),
      imageUrl: normalizeTrimmed(getRowValue(row, headers, "ImageUrl")),
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
      currency: normalizeTrimmed(getRowValue(row, headers, "Currency")),
      currency2: normalizeTrimmed(getRowValue(row, headers, "Currency2")),
      accountId: requireRowValue(row, headers, "AccountId"),
      categoryId: normalizeTrimmed(getRowValue(row, headers, "CategoryId")),
      subCategoryId: normalizeTrimmed(getRowValue(row, headers, "SubCategoryId")),
      targetAccountId: normalizeTrimmed(getRowValue(row, headers, "TargetAccountId")),
      relatedTransactionId: normalizeTrimmed(getRowValue(row, headers, "RelatedTransactionId")),
      originalTransactionId: normalizeTrimmed(getRowValue(row, headers, "OriginalTransactionId")),
      isRefund: parseBoolean(requireRowValue(row, headers, "IsRefund"), "IsRefund"),
      note: normalizeTrimmed(getRowValue(row, headers, "Note")),
      merchantName: normalizeTrimmed(getRowValue(row, headers, "MerchantName")),
      location: normalizeTrimmed(getRowValue(row, headers, "Location")),
      tripId: normalizeTrimmed(getRowValue(row, headers, "TripId")),
      createdAt: parseOptionalDate(getRowValue(row, headers, "CreatedAt")),
      updatedAt: parseOptionalDate(getRowValue(row, headers, "UpdatedAt")),
    }))
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
  const parts = [normalizeTrimmed(tags) ? `Tags: ${tags.trim()}` : null, normalizeTrimmed(notes)].filter((value): value is string => Boolean(value))

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

  const now = new Date()
  let skippedRows = 0

  // Every imported row gets a fresh id so client-supplied ids can never collide with
  // existing rows (ids are global TEXT primary keys). These maps remap the file's own
  // ids to the freshly generated ones; references that do not resolve within the file
  // are treated exactly like before (rows skipped or references nulled).
  const accountIdMap = new Map<string, string>()
  const importedAccounts = accountRows
    .filter((row) => row.id && row.name.trim())
    .map((row) => {
      const id = crypto.randomUUID()
      accountIdMap.set(row.id, id)

      return {
        id,
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
      }
    })

  const validCategoryRows = categoryRows.filter((row) => row.id && row.name.trim())
  const categoryIdMap = new Map<string, string>()
  const parentCategoryIdMap = new Map<string, string>()
  const importedCategories: Array<typeof categories.$inferInsert> = []

  const addCategory = (row: FlametteCategoryRow, parentId: string | null) => {
    const id = crypto.randomUUID()
    categoryIdMap.set(row.id, id)

    importedCategories.push({
      id,
      userId: user.id,
      name: row.name.trim(),
      color: row.color || defaultCategoryColor,
      icon: row.icon || (parentId ? defaultChildCategoryIcon : defaultParentCategoryIcon),
      parentId,
      type: row.type,
      createdAt: row.createdAt ?? now,
      updatedAt: row.updatedAt ?? now,
    })

    return id
  }

  // Parents first, then children — only one nesting level is valid, so children whose
  // parent is missing from the file (or is itself a child) are skipped.
  for (const row of validCategoryRows) {
    if (!row.parentId) {
      parentCategoryIdMap.set(row.id, addCategory(row, null))
    }
  }

  for (const row of validCategoryRows) {
    if (!row.parentId) {
      continue
    }

    const parentId = parentCategoryIdMap.get(row.parentId)
    if (!parentId) {
      skippedRows += 1
      continue
    }

    addCategory(row, parentId)
  }

  const tripIdMap = new Map<string, string>()
  const importedTrips = tripRows
    .filter((row) => row.id && row.name.trim())
    .map((row) => {
      const id = crypto.randomUUID()
      tripIdMap.set(row.id, id)

      return {
        id,
        userId: user.id,
        name: row.name.trim(),
        country: row.country,
        startDate: row.startDate,
        endDate: row.endDate,
        imageUrl: row.imageUrl,
        createdAt: row.createdAt ?? now,
        updatedAt: row.updatedAt ?? now,
      }
    })

  const transactionIdMap = new Map<string, string>()
  const importedTransactions: Array<typeof transactions.$inferInsert> = []
  const relatedReferences: Array<{
    id: string
    relatedTransactionId: string | null
    originalTransactionId: string | null
  }> = []

  for (const row of transactionRows) {
    const accountId = accountIdMap.get(row.accountId)
    if (!accountId) {
      skippedRows += 1
      continue
    }

    const targetAccountId = row.targetAccountId ? (accountIdMap.get(row.targetAccountId) ?? null) : null
    if (row.targetAccountId && !targetAccountId) {
      skippedRows += 1
      continue
    }

    const categoryId = row.categoryId ? (categoryIdMap.get(row.categoryId) ?? null) : null
    if (row.categoryId && !categoryId) {
      skippedRows += 1
      continue
    }

    const subCategoryId = row.subCategoryId ? (categoryIdMap.get(row.subCategoryId) ?? null) : null
    if (row.subCategoryId && !subCategoryId) {
      skippedRows += 1
      continue
    }

    const tripId = row.tripId ? (tripIdMap.get(row.tripId) ?? null) : null
    if (row.tripId && !tripId) {
      skippedRows += 1
      continue
    }

    const id = crypto.randomUUID()
    transactionIdMap.set(row.id, id)

    importedTransactions.push({
      id,
      userId: user.id,
      date: row.date,
      type: row.type,
      amount: row.amount,
      amount2: row.amount2,
      currency: normalizeCurrencyOrNull(row.currency),
      currency2: normalizeCurrencyOrNull(row.currency2),
      accountId,
      categoryId,
      subCategoryId,
      targetAccountId,
      relatedTransactionId: null,
      originalTransactionId: null,
      tripId,
      isRefund: row.isRefund,
      note: row.note,
      merchantName: row.merchantName,
      location: row.location,
      createdAt: row.createdAt ?? now,
      updatedAt: row.updatedAt ?? now,
    })

    relatedReferences.push({
      id,
      relatedTransactionId: row.relatedTransactionId,
      originalTransactionId: row.originalTransactionId,
    })
  }

  // Self-referencing FKs are applied in a second pass once every transaction row exists;
  // references pointing outside the imported set stay null.
  const relatedUpdates = relatedReferences
    .map((reference) => ({
      id: reference.id,
      relatedTransactionId: reference.relatedTransactionId ? (transactionIdMap.get(reference.relatedTransactionId) ?? null) : null,
      originalTransactionId: reference.originalTransactionId ? (transactionIdMap.get(reference.originalTransactionId) ?? null) : null,
    }))
    .filter((reference) => reference.relatedTransactionId || reference.originalTransactionId)

  const nextBaseCurrency = normalizeCurrencyOrDefault(settings.baseCurrency, user.baseCurrency)
  const nextSubscriptionType = settings.subscriptionType ?? user.subscriptionType
  const settingsChanged = nextBaseCurrency !== user.baseCurrency || nextSubscriptionType !== user.subscriptionType

  // Wipe and re-import atomically: if any insert fails the whole transaction rolls back
  // and the user's existing data is left untouched.
  runDbTransaction((tx) => {
    clearUserScopedData(tx, user.id)

    forEachChunkSync(importedAccounts, SQLITE_INSERT_BATCH_SIZE, (chunk) => {
      tx.insert(accounts).values(chunk).run()
    })

    forEachChunkSync(importedCategories, SQLITE_INSERT_BATCH_SIZE, (chunk) => {
      tx.insert(categories).values(chunk).run()
    })

    forEachChunkSync(importedTrips, SQLITE_INSERT_BATCH_SIZE, (chunk) => {
      tx.insert(trips).values(chunk).run()
    })

    forEachChunkSync(importedTransactions, SQLITE_INSERT_BATCH_SIZE, (chunk) => {
      tx.insert(transactions).values(chunk).run()
    })

    for (const reference of relatedUpdates) {
      tx.update(transactions)
        .set({
          relatedTransactionId: reference.relatedTransactionId,
          originalTransactionId: reference.originalTransactionId,
        })
        .where(eq(transactions.id, reference.id))
        .run()
    }

    if (settingsChanged) {
      tx.update(users)
        .set({
          baseCurrency: nextBaseCurrency,
          subscriptionType: nextSubscriptionType,
          updatedAt: now,
        })
        .where(eq(users.id, user.id))
        .run()
    }
  })

  return {
    type: "flamette",
    importedTransactions: importedTransactions.length,
    importedAccounts: importedAccounts.length,
    importedCategories: importedCategories.length,
    importedSubCategories: importedCategories.filter((row) => row.parentId).length,
    updatedBalanceSnapshots: importedAccounts.length,
    updatedSettings: settingsChanged ? 1 : 0,
    skippedRows,
  } satisfies ImportBackupResponse
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
    const normalized = normalizeCurrencyOrNull(balance.currency) ?? normalizeTrimmed(balance.currency)?.toUpperCase() ?? null
    if (normalized) {
      accountCurrencyHints.set(balance.name.trim(), normalized)
    }
  }

  for (const transaction of parsed.transactions) {
    if (transaction.fromAccount.trim()) {
      allAccountNames.add(transaction.fromAccount.trim())
      const sourceCurrency = normalizeCurrencyOrNull(transaction.currency) ?? normalizeTrimmed(transaction.currency)?.toUpperCase() ?? null
      if (sourceCurrency && !accountCurrencyHints.has(transaction.fromAccount.trim())) {
        accountCurrencyHints.set(transaction.fromAccount.trim(), sourceCurrency)
      }
    }

    if (transaction.type === "Transfer" && transaction.target.trim()) {
      allAccountNames.add(transaction.target.trim())
      const targetCurrency = normalizeCurrencyOrNull(transaction.currency2) ?? normalizeTrimmed(transaction.currency2)?.toUpperCase() ?? null
      if (targetCurrency && !accountCurrencyHints.has(transaction.target.trim())) {
        accountCurrencyHints.set(transaction.target.trim(), targetCurrency)
      }
    }
  }

  const now = new Date()

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

  // Wipe and re-import atomically so a failed import never leaves the user without data.
  runDbTransaction((tx) => {
    clearUserScopedData(tx, user.id)

    forEachChunkSync(importedAccounts, SQLITE_INSERT_BATCH_SIZE, (chunk) => {
      tx.insert(accounts).values(chunk).run()
    })

    forEachChunkSync(importedCategories, SQLITE_INSERT_BATCH_SIZE, (chunk) => {
      tx.insert(categories).values(chunk).run()
    })

    forEachChunkSync(importedTransactions, SQLITE_INSERT_BATCH_SIZE, (chunk) => {
      tx.insert(transactions).values(chunk).run()
    })
  })

  return {
    type: "one-money",
    importedTransactions: importedTransactions.length,
    importedAccounts: importedAccounts.length,
    importedCategories: createdCategories,
    importedSubCategories: createdSubCategories,
    updatedBalanceSnapshots,
    updatedSettings: 0,
    skippedRows,
  } satisfies ImportBackupResponse
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
