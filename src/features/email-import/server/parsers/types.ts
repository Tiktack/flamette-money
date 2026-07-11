import type { ParsedEmailTransaction } from "../../types"

export type BankEmailInput = {
  subject: string
  from: string
  date: Date | null
  text: string
  html: string | null
}

export interface BankEmailParser {
  key: string
  displayName: string
  // Returns null when the email is not recognized. Must never throw — wrap internals
  // in try/catch so one malformed email cannot break a sync batch.
  parse(input: BankEmailInput): ParsedEmailTransaction | null
}
