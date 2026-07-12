// Pure helper shared by the server resolution pipeline and the client approve flow:
// matches a parsed email's masked account number ("15..6630") against the bank account
// number fragments stored on the user's accounts.

type AccountWithHint = {
  id: string
  bankAccountHint: string | null
}

const MIN_HINT_DIGITS = 3

function digitsOnly(value: string) {
  return value.replace(/\D+/g, "")
}

// Comparison is digits-only so masking styles ("15..6630", "**** 6630", "15 6630") don't
// matter. Returns an account id only when exactly one account matches — an ambiguous
// hint must not silently pick a wrong account.
export function matchAccountIdByBankHint(accountHint: string | null | undefined, accounts: Iterable<AccountWithHint>): string | null {
  if (!accountHint) {
    return null
  }

  const emailDigits = digitsOnly(accountHint)
  if (emailDigits.length < MIN_HINT_DIGITS) {
    return null
  }

  const matches: string[] = []
  for (const account of accounts) {
    if (!account.bankAccountHint) {
      continue
    }

    const storedDigits = digitsOnly(account.bankAccountHint)
    if (storedDigits.length < MIN_HINT_DIGITS) {
      continue
    }

    if (emailDigits.includes(storedDigits) || storedDigits.includes(emailDigits)) {
      matches.push(account.id)
    }
  }

  return matches.length === 1 ? matches[0] : null
}
