import type { ParserOption } from "../../types"
import { pkoBankPolskiParser } from "./pko-bank-polski"
import type { BankEmailParser } from "./types"

export const parserKeys = ["pko-bank-polski"] as const
export type ParserKey = (typeof parserKeys)[number]

const parsersByKey: Record<ParserKey, BankEmailParser> = {
  "pko-bank-polski": pkoBankPolskiParser,
}

export function getBankEmailParser(key: string): BankEmailParser | null {
  return (parsersByKey as Record<string, BankEmailParser>)[key] ?? null
}

export function listParserOptions(): ParserOption[] {
  return parserKeys.map((key) => ({ key, displayName: parsersByKey[key].displayName }))
}
