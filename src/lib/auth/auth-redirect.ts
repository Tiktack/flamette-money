const defaultAuthRedirect = "/analytics/comparison"

function isSafeAuthRedirect(path: string) {
  return path.startsWith("/") && path !== "/sign-in" && !path.startsWith("/sign-in?")
}

export function getAuthRedirect(redirectTo?: string) {
  if (!redirectTo) {
    return defaultAuthRedirect
  }

  try {
    const url = redirectTo.startsWith("/")
      ? new URL(redirectTo, "http://flamette.local")
      : new URL(redirectTo)
    const normalized = `${url.pathname}${url.search}${url.hash}`

    return isSafeAuthRedirect(normalized) ? normalized : defaultAuthRedirect
  } catch {
    return isSafeAuthRedirect(redirectTo) ? redirectTo : defaultAuthRedirect
  }
}
