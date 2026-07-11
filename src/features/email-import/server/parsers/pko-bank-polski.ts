import type { EmailDirection, ParsedEmailTransaction } from "../../types"
import { stripHtml } from "./html"
import type { BankEmailInput, BankEmailParser } from "./types"

// Deterministic parser for PKO Bank Polski (iPKO) notification emails.
//
// The matcher table below is seeded from commonly observed iPKO notification wording.
// Every phrase is marked "TO VERIFY against real template" — once real notification
// emails are captured (their raw text is preserved on unparsed review items), adjust the
// phrases/extractors here and use "Re-parse" in the review inbox to backfill.

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
// double-import. Revisit once the real template shows which notifications arrive.

const currencyPattern = "PLN|EUR|USD|GBP|CHF|CAD|zł"
const amountCurrencyRegex = new RegExp(String.raw`(\d[\d\s .]*[,.]\d{2})\s*(${currencyPattern})`, "gi")
const balanceAfterRegex = new RegExp(String.raw`dostępne środki[:\s]*([\d\s .]*[\d][,.]?\d{0,2})\s*(${currencyPattern})?`, "i")

// Accepts Polish-formatted amounts: "1 234,56", "1.234,56", "1234.56".
export function parsePolishAmount(raw: string): number | null {
  const compact = raw.replace(/[\s ]/g, "")
  let normalized = compact
  if (compact.includes(",")) {
    normalized = compact.replace(/\./g, "").replace(",", ".")
  }
  const value = Number.parseFloat(normalized)
  return Number.isFinite(value) && value > 0 ? value : null
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

// The transaction amount is the first amount that is not part of the available-balance
// sentence ("Dostępne środki: 1 234,56 PLN"). TO VERIFY against real template.
function extractTransactionAmount(body: string): AmountMatch | null {
  const matches = extractAmounts(body)
  for (const match of matches) {
    const preceding = body
      .slice(Math.max(0, match.index - 40), match.index)
      .toLowerCase()
    if (preceding.includes("dostępne środki") || preceding.includes("saldo")) {
      continue
    }
    return match
  }
  return null
}

function extractBalanceAfter(body: string): number | null {
  const match = body.match(balanceAfterRegex)
  if (!match) {
    return null
  }
  return parsePolishAmount(match[1])
}

// Labeled lines like "Lokalizacja: ŻABKA Z1234 WARSZAWA" or "Odbiorca: Jan Kowalski".
// TO VERIFY against real template.
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

// Masked card/account fragments, e.g. "karty nr 4246 xx** **12 3456" or
// "rachunku ...1234". TO VERIFY against real template.
const accountHintRegexes = [
  /kart[ayąę]\s*(?:nr\.?\s*)?[:\s]*([0-9Xx*.\s ]{4,30}\d)/i,
  /rachun[a-ząę]*\s*(?:nr\.?\s*)?[:\s]*([0-9Xx*.\s ]{4,40}\d)/i,
]

function extractAccountHint(body: string): string | null {
  for (const regex of accountHintRegexes) {
    const match = body.match(regex)
    if (match) {
      const cleaned = match[1].replace(/[\s ]+/g, " ").trim()
      if (/\d/.test(cleaned)) {
        return cleaned.slice(0, 48)
      }
    }
  }
  return null
}

const dottedDateRegex = /(\d{1,2})[./-](\d{1,2})[./-](\d{4})/
const isoDateRegex = /(\d{4})-(\d{2})-(\d{2})/

function extractBookedAt(body: string): string | null {
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

function cleanFragment(value: string) {
  const cleaned = value.replace(/[\s ]+/g, " ").trim().replace(/[.,;]$/, "")
  return cleaned.length > 0 ? cleaned : null
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

export const pkoBankPolskiParser: BankEmailParser = {
  key: "pko-bank-polski",
  displayName: "PKO Bank Polski (iPKO)",
  parse(input: BankEmailInput): ParsedEmailTransaction | null {
    try {
      const body = resolveBody(input)
      if (!body) {
        return null
      }

      const directionMatch = matchDirection(body, input.subject)
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
        bookedAt: extractBookedAt(body),
        description: extractDescription(body, directionMatch.phrase, input.subject),
        merchant: extractMerchant(body, amountMatch.index),
        accountHint: extractAccountHint(body),
        balanceAfter: extractBalanceAfter(body),
      }
    } catch {
      return null
    }
  },
}
