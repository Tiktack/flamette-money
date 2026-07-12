export const emailImportItemStatusOptions = ["pending", "unparsed", "imported", "dismissed", "ignored", "error"] as const
export type EmailImportItemStatus = (typeof emailImportItemStatusOptions)[number]

export type EmailSyncStatus = "ok" | "auth_failed" | "folder_missing" | "network" | "error"
export type EmailRuleMatchMode = "all" | "any"
export type EmailDirection = "income" | "expense"

export type ParsedEmailTransaction = {
  direction: EmailDirection
  amount: number
  currency: string
  bookedAt: string | null
  description: string | null
  merchant: string | null
  location: string | null
  accountHint: string | null
  balanceAfter: number | null
}

export type ParserOption = {
  key: string
  displayName: string
}

export type EmailConnectionSummary = {
  id: string
  name: string
  host: string
  port: number
  username: string
  folder: string
  parserKey: string
  defaultAccountId: string | null
  enabled: boolean
  pollIntervalMinutes: number
  lastSyncAt: string | null
  lastSyncStatus: EmailSyncStatus | null
  lastSyncError: string | null
  consecutiveFailures: number
  pendingCount: number
  unparsedCount: number
  errorCount: number
  createdAt: string
}

export type EmailConnectionListResponse = {
  connections: EmailConnectionSummary[]
  parserOptions: ParserOption[]
}

export type EmailConnectionCreateRequest = {
  name: string
  username: string
  password: string
  folder: string
  parserKey: string
  host?: string
  port?: number
  defaultAccountId?: string | null
  pollIntervalMinutes?: number
  enabled?: boolean
}

export type EmailConnectionUpdateRequest = Omit<EmailConnectionCreateRequest, "password"> & {
  // Absent/empty password keeps the stored one.
  password?: string | null
}

export type EmailConnectionTestRequest = {
  connectionId?: string | null
  host?: string
  port?: number
  username?: string
  password?: string
  folder?: string
}

export type EmailConnectionTestResult = { ok: true; messageCount: number } | { ok: false; code: EmailSyncStatus; message: string }

export type EmailImportRuleResponse = {
  id: string
  name: string
  enabled: boolean
  priority: number
  matchMode: EmailRuleMatchMode
  conditions: import("./rules").EmailRuleCondition[]
  action: import("./rules").EmailRuleAction
  createdAt: string
  updatedAt: string
}

export type EmailImportRuleRequest = {
  name: string
  enabled: boolean
  matchMode: EmailRuleMatchMode
  conditions: import("./rules").EmailRuleCondition[]
  action: import("./rules").EmailRuleAction
}

export type EmailRulePreviewEntry = {
  itemId: string
  subject: string | null
  merchant: string | null
  description: string | null
  amount: number | null
  currency: string | null
  direction: EmailDirection | null
  matches: boolean
}

export type EmailImportItemListItem = {
  id: string
  connectionId: string
  connectionName: string
  status: EmailImportItemStatus
  subject: string | null
  fromAddress: string | null
  emailDate: string | null
  excerpt: string | null
  parsed: ParsedEmailTransaction | null
  parseError: string | null
  matchedRuleId: string | null
  matchedRuleName: string | null
  transactionId: string | null
  error: string | null
  importedAt: string | null
  createdAt: string
}

export type EmailImportItemDetail = EmailImportItemListItem & {
  rawText: string | null
}

export type EmailImportItemsQuery = {
  statuses?: EmailImportItemStatus[]
  connectionId?: string
  limit?: number
  offset?: number
}

export type EmailImportItemsResponse = {
  items: EmailImportItemListItem[]
  totalCount: number
}

export type EmailImportSyncResult = {
  fetched: number
  imported: number
  pending: number
  unparsed: number
  ignored: number
  errors: number
}

export type EmailImportStatusSummary = {
  connectionCount: number
  enabledConnectionCount: number
  pendingCount: number
  unparsedCount: number
  errorCount: number
  lastSyncAt: string | null
}
