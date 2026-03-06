const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const pickString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null

const pickValidationMessage = (value: unknown): string | null => {
  if (!isRecord(value)) {
    return null
  }

  const errors = value.errors
  if (!isRecord(errors)) {
    return null
  }

  for (const entry of Object.values(errors)) {
    if (Array.isArray(entry)) {
      for (const issue of entry) {
        const message = pickString(issue)
        if (message) {
          return message
        }
      }
    }
  }

  return null
}

export const getApiErrorMessage = (
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
) => {
  const direct = pickString(error)
  if (direct) {
    return direct
  }

  if (error instanceof Error) {
    const message = pickString(error.message)
    if (message) {
      return message
    }
  }

  if (isRecord(error)) {
    const message = pickString(error.message) ?? pickString(error.detail) ?? pickString(error.title)
    if (message) {
      return message
    }

    const validationMessage = pickValidationMessage(error)
    if (validationMessage) {
      return validationMessage
    }
  }

  return fallback
}
