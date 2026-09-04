import type { EmailDirection, ParsedEmailTransaction } from "../../types"
import { stripHtml } from "./html"
import type { BankEmailInput, BankEmailParser } from "./types"

// Deterministic parser for PKO Bank Polski (iPKO) notification emails.
//
// The PRIMARY path is verified against real templates captured on 2026-07-12
// ("Rozliczenie transakcji kartą lub BLIKIEM" and "Obciążenie konta"). The decoded body
// has this backbone (mailparser handles the quoted-printable + ISO-8859-2 decoding):
//
//   Twoje konto o numerze 15..6630 zostało obciążone kwotą -35,56 PLN, w tym:
//   -35,56 PLN Płatność kartą, sprzedawca: eLeclerc 01 , miejsce: PLGdansk
//   Data waluty: 2026-07-10
//   Stan konta po operacji: +61636,80 PLN
//
// The LEGACY phrase-matcher below remains as a fallback for notification types not seen
// yet; its phrases are still marked "TO VERIFY against real template".

const currencyPattern = "PLN|EUR|USD|GBP|CHF|CAD|zł"

// Accepts Polish-formatted amounts: "1 234,56", "1.234,56", "61636,80", "1234.56".
export function parsePolishAmount(raw: string): number | null {
  const compact = raw.replace(/[\s ]/g, "")
  let normalized = compact
  if (compact.includes(",")) {
    normalized = compact.replace(/\./g, "").replace(",", ".")
  }
  const value = Number.parseFloat(normalized)
  return Number.isFinite(value) && value > 0 ? value : null
}

function parseSignedPolishAmount(raw: string): number | null {
  return parsePolishAmount(raw.replace(/^[\s+-]+/, ""))
}

function normalizeCurrencyToken(token: string) {
  const upper = token.trim().toUpperCase()
  return upper === "ZŁ" ? "PLN" : upper
}

function resolveBody(input: BankEmailInput) {
  const text = input.text.trim()
  if (text.length > 0) {
    return text
  }
  return input.html ? stripHtml(input.html) : ""
}

function cleanFragment(value: string) {
  const cleaned = value
    .replace(/[\s ]+/g, " ")
    .trim()
    .replace(/[.,;]$/, "")
    .trim()
  return cleaned.length > 0 ? cleaned : null
}

// ─── Primary path: verified settlement/debit template ───────────────────

// "Twoje konto o numerze 15..6630 zostało obciążone kwotą -35,56 PLN" /
// "Twoje konto 15..6630 zostało obciążone kwotą -30,00 PLN".
// "uznane" (credited) is the expected wording for incoming money — TO VERIFY once a real
// income notification is captured; the amount sign is used as a cross-check.
const headerRegex = new RegExp(
  String.raw`Twoje konto(?:\s+o numerze)?\s+([0-9.]{2,34})?\s*zostało\s+(obciążone|uznane)\s+kwotą\s+([-+]?\s?\d[\d\s .]*,\d{2})\s*(${currencyPattern})`,
  "i"
)

// Detail component line: "-35,56 PLN Płatność kartą, sprzedawca: eLeclerc 01 , miejsce: PLGdansk"
const detailLineRegex = new RegExp(String.raw`^\s*([-+]?\d[\d\s .]*,\d{2})\s*(${currencyPattern})\s+(.{3,})$`, "i")

// Known labels inside the detail line. Values are sliced between label positions, so
// colons inside a value (e.g. tytuł: "MOBILE TRANSFER OD: 48... DO: 48...") stay intact —
// a label only counts when preceded by a comma/semicolon or the line start.
const detailLabelNames = ["sprzedawca", "odbiorca", "nadawca", "miejsce", "lokalizacja", "adres", "tytuł"] as const
type DetailLabel = (typeof detailLabelNames)[number]

function splitDetailLine(remainder: string): { operation: string | null; values: Partial<Record<DetailLabel, string>> } {
  const hits: { label: DetailLabel; labelStart: number; valueStart: number }[] = []

  for (const label of detailLabelNames) {
    const labelRegex = new RegExp(String.raw`(?:^|[,;])\s*${label}\s*:`, "gi")
    for (const match of remainder.matchAll(labelRegex)) {
      const index = match.index ?? 0
      hits.push({ label, labelStart: index, valueStart: index + match[0].length })
    }
  }

  hits.sort((a, b) => a.labelStart - b.labelStart)

  const values: Partial<Record<DetailLabel, string>> = {}
  hits.forEach((hit, index) => {
    const valueEnd = hits[index + 1]?.labelStart ?? remainder.length
    const value = cleanFragment(remainder.slice(hit.valueStart, valueEnd))
    if (value && !(hit.label in values)) {
      values[hit.label] = value
    }
  })

  return {
    operation: cleanFragment(remainder.slice(0, hits[0]?.labelStart ?? remainder.length)),
    values,
  }
}

const bookedAtRegex = /Data waluty:\s*(\d{4}-\d{2}-\d{2})/i
const balanceAfterRegex = new RegExp(String.raw`Stan konta po (?:operacji|transakcji):\s*([-+]?\d[\d\s .]*,\d{2})\s*(${currencyPattern})`, "i")

function parseVerifiedTemplate(body: string): ParsedEmailTransaction | null {
  const header = body.match(headerRegex)
  if (!header) {
    return null
  }

  const amount = parseSignedPolishAmount(header[3])
  if (amount === null) {
    return null
  }

  const direction: EmailDirection = header[2].toLowerCase() === "uznane" ? "income" : "expense"

  const detailLines = body
    .split("\n")
    .map((line) => line.match(detailLineRegex))
    .filter((match): match is RegExpMatchArray => match !== null)

  const firstDetail = detailLines[0] ? splitDetailLine(detailLines[0][3]) : null
  let description = detailLines[0] ? (cleanFragment(detailLines[0][3])?.slice(0, 300) ?? null) : null
  if (description && detailLines.length > 1) {
    // Aggregated settlements may list several components under one total — TO VERIFY.
    description = `${description} (+${detailLines.length - 1} more)`
  }

  return {
    direction,
    amount,
    currency: normalizeCurrencyToken(header[4]),
    bookedAt: body.match(bookedAtRegex)?.[1] ?? null,
    description,
    merchant: firstDetail?.values.sprzedawca ?? firstDetail?.values.odbiorca ?? firstDetail?.values.nadawca ?? null,
    location: firstDetail?.values.miejsce ?? firstDetail?.values.lokalizacja ?? firstDetail?.values.adres ?? null,
    accountHint: header[1] ? cleanFragment(header[1]) : extractAccountHint(body),
    balanceAfter: parseBalanceAfter(body),
  }
}

function parseBalanceAfter(body: string): number | null {
  const verified = body.match(balanceAfterRegex)
  if (verified) {
    return parseSignedPolishAmount(verified[1])
  }
  const legacy = body.match(legacyBalanceRegex)
  return legacy ? parsePolishAmount(legacy[1]) : null
}

// ─── Legacy fallback: notification types not captured yet ───────────────

type PkoDirectionMatcher = {
  // TO VERIFY against real template
  phrase: RegExp
  direction: EmailDirection
}

const directionMatchers: PkoDirectionMatcher[] = [
  { phrase: /płatność kartą/i, direction: "expense" },
  { phrase: /płatność internetowa/i, direction: "expense" },
  { phrase: /transakcja kartą/i, direction: "expense" },
  { phrase: /wypłata z bankomatu/i, direction: "expense" },
  { phrase: /wypłata gotówki/i, direction: "expense" },
  { phrase: /przelew wychodzący/i, direction: "expense" },
  { phrase: /przelew z rachunku/i, direction: "expense" },
  { phrase: /obciążenie rachunku/i, direction: "expense" },
  { phrase: /zlecenie stałe/i, direction: "expense" },
  { phrase: /polecenie zapłaty/i, direction: "expense" },
  { phrase: /przelew przychodzący/i, direction: "income" },
  { phrase: /wpływ na rachunek/i, direction: "income" },
  { phrase: /uznanie rachunku/i, direction: "income" },
  { phrase: /zwrot płatności/i, direction: "income" },
]
// Deliberately not matched: "blokada środków" (card authorization holds). PKO may send
// both a hold and a settlement notification for the same payment; matching both would
// double-import. Revisit once real templates show which notifications arrive.

const amountCurrencyRegex = new RegExp(String.raw`(\d[\d\s .]*,\d{2})\s*(${currencyPattern})`, "gi")
const legacyBalanceRegex = new RegExp(String.raw`dostępne środki[:\s]*([\d\s .]*[\d][,.]?\d{0,2})\s*(${currencyPattern})?`, "i")

function matchDirection(body: string, subject: string) {
  const haystack = `${subject}\n${body}`
  for (const matcher of directionMatchers) {
    const match = haystack.match(matcher.phrase)
    if (match) {
      return { direction: matcher.direction, phrase: matcher.phrase }
    }
  }
  return null
}

type AmountMatch = { amount: number; currency: string; index: number }

function extractAmounts(body: string): AmountMatch[] {
  const matches: AmountMatch[] = []
  amountCurrencyRegex.lastIndex = 0
  for (const match of body.matchAll(amountCurrencyRegex)) {
    const amount = parsePolishAmount(match[1])
    if (amount !== null) {
      matches.push({ amount, currency: normalizeCurrencyToken(match[2]), index: match.index ?? 0 })
    }
  }
  return matches
}

// The transaction amount is the first amount that is not part of a balance sentence.
function extractTransactionAmount(body: string): AmountMatch | null {
  const matches = extractAmounts(body)
  for (const match of matches) {
    const preceding = body.slice(Math.max(0, match.index - 40), match.index).toLowerCase()
    if (preceding.includes("dostępne środki") || preceding.includes("stan konta") || preceding.includes("saldo")) {
      continue
    }
    return match
  }
  return null
}

// Labeled lines like "Lokalizacja: ŻABKA Z1234 WARSZAWA". TO VERIFY against real template.
const merchantLineRegex = /(?:lokalizacja|miejsce|adres|odbiorca|nadawca|tytuł(?:em)?)\s*[:-]\s*(.{2,120})/i

function extractMerchant(body: string, amountIndex: number | null): string | null {
  const labeled = body.match(merchantLineRegex)
  if (labeled) {
    return cleanFragment(labeled[1])
  }

  // Card payment idiom: "... na kwotę 123,45 PLN w ŻABKA Z1234 WARSZAWA."
  if (amountIndex !== null) {
    const after = body.slice(amountIndex, amountIndex + 200)
    const inPlace = after.match(new RegExp(String.raw`(?:${currencyPattern})\s+w\s+(.{2,120}?)(?:[\n.]|$)`, "i"))
    if (inPlace) {
      return cleanFragment(inPlace[1])
    }
  }

  return null
}

// Masked card/account fragments: "karty nr 4246 xx** **12 3456", "konto o numerze 15..6630".
const accountHintRegexes = [
  /kont[ao]\s*(?:o numerze\s*)?[:\s]*([0-9Xx*.]{4,34}\d)/i,
  /kart[ayąę]\s*(?:nr\.?\s*)?[:\s]*([0-9Xx*.\s ]{4,30}\d)/i,
  /rachun[a-ząę]*\s*(?:nr\.?\s*)?[:\s]*([0-9Xx*.\s ]{4,40}\d)/i,
]

function extractAccountHint(body: string): string | null {
  for (const regex of accountHintRegexes) {
    const match = body.match(regex)
    if (match) {
      const cleaned = match[1].replace(/[\s ]+/g, " ").trim()
      if (/\d/.test(cleaned)) {
        return cleaned.slice(0, 48)
      }
    }
  }
  return null
}

const dottedDateRegex = /(\d{1,2})[./-](\d{1,2})[./-](\d{4})/
const isoDateRegex = /(\d{4})-(\d{2})-(\d{2})/

function extractLegacyBookedAt(body: string): string | null {
  const iso = body.match(isoDateRegex)
  if (iso) {
    return `${iso[1]}-${iso[2]}-${iso[3]}`
  }
  const dotted = body.match(dottedDateRegex)
  if (dotted) {
    const day = dotted[1].padStart(2, "0")
    const month = dotted[2].padStart(2, "0")
    return `${dotted[3]}-${month}-${day}`
  }
  return null
}

function extractDescription(body: string, phrase: RegExp, subject: string): string | null {
  const lines = body.split("\n")
  for (const line of lines) {
    if (phrase.test(line)) {
      const cleaned = cleanFragment(line)
      if (cleaned) {
        return cleaned.slice(0, 300)
      }
    }
  }
  return cleanFragment(subject)
}

function parseLegacyTemplate(body: string, subject: string): ParsedEmailTransaction | null {
  const directionMatch = matchDirection(body, subject)
  if (!directionMatch) {
    return null
  }

  const amountMatch = extractTransactionAmount(body)
  if (!amountMatch) {
    return null
  }

  return {
    direction: directionMatch.direction,
    amount: amountMatch.amount,
    currency: amountMatch.currency,
    bookedAt: extractLegacyBookedAt(body),
    description: extractDescription(body, directionMatch.phrase, subject),
    merchant: extractMerchant(body, amountMatch.index),
    location: null,
    accountHint: extractAccountHint(body),
    balanceAfter: parseBalanceAfter(body),
  }
}

export const pkoBankPolskiParser: BankEmailParser = {
  key: "pko-bank-polski",
  displayName: "PKO Bank Polski (iPKO)",
  parse(input: BankEmailInput): ParsedEmailTransaction | null {
    try {
      const body = resolveBody(input)
      if (!body) {
        return null
      }

      return parseVerifiedTemplate(body) ?? parseLegacyTemplate(body, input.subject)
    } catch {
      return null
    }
  },
}
