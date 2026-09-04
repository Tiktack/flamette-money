import * as React from "react"

import { createFileRoute, redirect, useRouter } from "@tanstack/react-router"
import { useQueryClient } from "@tanstack/react-query"

import { HugeiconsIcon } from "@hugeicons/react"
import { Clock01Icon, CommandIcon } from "@hugeicons/core-free-icons"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { getAuthRedirect } from "@/lib/auth/auth-redirect"
import { authClient } from "@/lib/auth/client"
import { getAvailableSocialAuthProviders, getCurrentUserProfile, getSignupAllowed } from "@/lib/auth/functions"
import { socialAuthProviderMeta, supportedSocialAuthProviders, type SocialAuthProvider } from "@/lib/auth/providers"
import { queryKeys } from "@/features/shared/query-keys"

type LastLoginMethod = "email" | SocialAuthProvider

function isLastLoginMethod(method: string | null): method is LastLoginMethod {
  return method === "email" || supportedSocialAuthProviders.some((provider) => provider === method)
}

function normalizeLastLoginMethod(method: string | null): LastLoginMethod | null {
  return isLastLoginMethod(method) ? method : null
}

const subscribeToLastLoginMethod = () => () => {}

function getLastLoginMethodSnapshot() {
  return normalizeLastLoginMethod(authClient.getLastUsedLoginMethod())
}

function LastUsedIndicator({ label }: { label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            aria-label={`Last signed in with ${label}`}
            className="absolute top-0 right-0 z-10 flex size-6 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-primary/25 bg-primary/10 text-primary shadow-sm ring-2 ring-background transition-colors hover:bg-primary/15 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
            tabIndex={0}
          >
            <HugeiconsIcon icon={Clock01Icon} strokeWidth={2} className="size-3.5" />
          </span>
        }
      />
      <TooltipContent side="top" align="end">
        Last signed in with {label}
      </TooltipContent>
    </Tooltip>
  )
}

export const Route = createFileRoute("/sign-in")({
  head: () => ({ meta: [{ title: "Sign in — Flamette Money" }] }),
  validateSearch: (search: Record<string, unknown>): { redirect?: string; error?: string } => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
    // Better Auth sends OAuth failures back here as ?error=...; keep it so the page can surface it.
    error: typeof search.error === "string" ? search.error : undefined,
  }),
  beforeLoad: async ({ search }) => {
    const user = await getCurrentUserProfile()
    if (user) {
      throw redirect({ href: getAuthRedirect(search.redirect) })
    }
  },
  loader: async () => {
    const [socialProviders, signupAllowed] = await Promise.all([getAvailableSocialAuthProviders(), getSignupAllowed()])
    return { socialProviders, signupAllowed }
  },
  component: SignInPage,
})

function GoogleLogo() {
  return (
    <svg aria-hidden className="size-4" viewBox="0 0 24 24">
      <path d="M21.6 12.23c0-.68-.06-1.33-.18-1.95H12v3.69h5.39a4.62 4.62 0 0 1-2 3.03v2.52h3.24c1.9-1.75 2.97-4.34 2.97-7.29Z" fill="#4285F4" />
      <path d="M12 22c2.7 0 4.96-.9 6.62-2.44l-3.24-2.52c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.58-4.12H3.07v2.6A10 10 0 0 0 12 22Z" fill="#34A853" />
      <path d="M6.42 13.88A6 6 0 0 1 6.1 12c0-.65.11-1.28.31-1.88V7.52H3.07A10 10 0 0 0 2 12c0 1.61.39 3.14 1.07 4.48l3.35-2.6Z" fill="#FBBC05" />
      <path d="M12 5.97c1.47 0 2.79.5 3.82 1.49l2.86-2.86C16.96 2.98 14.7 2 12 2a10 10 0 0 0-8.93 5.52l3.35 2.6C7.2 7.76 9.4 5.97 12 5.97Z" fill="#EA4335" />
    </svg>
  )
}

function GitHubLogo() {
  return (
    <svg aria-hidden className="size-4 fill-current" viewBox="0 0 24 24">
      <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.4c.58.1.79-.25.79-.56v-2.18c-3.23.7-3.91-1.56-3.91-1.56-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.71.08-.71 1.17.08 1.78 1.2 1.78 1.2 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.72-1.55-2.58-.29-5.29-1.29-5.29-5.74 0-1.27.46-2.31 1.2-3.13-.12-.3-.52-1.5.12-3.13 0 0 .98-.31 3.2 1.2a11.1 11.1 0 0 1 5.82 0c2.22-1.51 3.2-1.2 3.2-1.2.64 1.63.24 2.83.12 3.13.75.82 1.2 1.86 1.2 3.13 0 4.46-2.72 5.44-5.31 5.73.41.35.78 1.04.78 2.1v3.11c0 .31.2.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  )
}

function SocialLoginButton({
  disabled,
  isBusy,
  isLastUsed,
  onClick,
  provider,
}: {
  disabled: boolean
  isBusy: boolean
  isLastUsed: boolean
  onClick: () => void
  provider: SocialAuthProvider
}) {
  const content =
    provider === "google" ? (
      <>
        <GoogleLogo />
        <span>Google</span>
      </>
    ) : (
      <>
        <GitHubLogo />
        <span>GitHub</span>
      </>
    )

  return (
    <div className="relative w-full">
      <Button
        className="h-10 w-full justify-center gap-2 rounded-lg px-3 font-medium tracking-[0.01em] text-foreground hover:text-foreground"
        disabled={disabled}
        onClick={onClick}
        size="lg"
        type="button"
        variant="outline"
      >
        {isBusy ? <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden /> : content}
      </Button>
      {isLastUsed ? <LastUsedIndicator label={socialAuthProviderMeta[provider].label} /> : null}
    </div>
  )
}

function SignInPage() {
  const search = Route.useSearch()
  const { socialProviders, signupAllowed } = Route.useLoaderData()
  const redirectTo = getAuthRedirect(search.redirect)
  const router = useRouter()
  const queryClient = useQueryClient()
  const [mode, setMode] = React.useState<"sign-in" | "sign-up">("sign-in")
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const lastLoginMethod = React.useSyncExternalStore(subscribeToLastLoginMethod, getLastLoginMethodSnapshot, () => null)
  const [busyAction, setBusyAction] = React.useState<"credentials" | null | SocialAuthProvider>(null)
  const isBusy = busyAction !== null
  const socialErrorCallbackUrl = React.useMemo(() => {
    const params = new URLSearchParams()
    if (search.redirect) {
      params.set("redirect", redirectTo)
    }

    return params.size > 0 ? `/sign-in?${params.toString()}` : "/sign-in"
  }, [redirectTo, search.redirect])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage(null)
    setBusyAction("credentials")

    const result = mode === "sign-up" ? await authClient.signUp.email({ name, email, password }) : await authClient.signIn.email({ email, password })

    if (result.error) {
      setErrorMessage(result.error.message ?? "Unable to continue.")
      setBusyAction(null)
      return
    }

    // The protected layout serves auth from this cache entry; drop the stale
    // signed-out value so the next navigation refetches the fresh session.
    queryClient.removeQueries({ queryKey: queryKeys.authMe() })
    setBusyAction(null)
    router.history.push(redirectTo)
  }

  const handleSocialSignIn = async (provider: SocialAuthProvider) => {
    setErrorMessage(null)
    setBusyAction(provider)

    const result = await authClient.signIn.social({
      provider,
      callbackURL: redirectTo,
      newUserCallbackURL: redirectTo,
      errorCallbackURL: socialErrorCallbackUrl,
      requestSignUp: mode === "sign-up",
    })

    if (result.error) {
      setErrorMessage(result.error.message ?? `Unable to continue with ${socialAuthProviderMeta[provider].label}.`)
      setBusyAction(null)
    }
  }

  const switchMode = (next: "sign-in" | "sign-up") => {
    setMode(next)
    setErrorMessage(null)
  }

  return (
    <div className="auth-bg flex min-h-svh flex-col items-center justify-center px-4 py-10">
      <div className="mb-8 flex items-center gap-2.5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
          <HugeiconsIcon icon={CommandIcon} strokeWidth={2} className="size-4 text-primary" />
        </div>
        <div className="grid gap-0.5">
          <span className="text-base font-semibold tracking-tight text-foreground">Flamette Money</span>
          <span className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">workspace access</span>
        </div>
      </div>

      <Card className="w-full max-w-sm gap-0 overflow-hidden py-0 shadow-none">
        <CardHeader className="pt-5 pb-3">
          <CardTitle className="text-xl font-semibold tracking-tight">{mode === "sign-in" ? "Sign in" : "Create your account"}</CardTitle>
          <CardDescription>{mode === "sign-in" ? "Welcome back — enter your details to continue" : "Fill in the details below to get started"}</CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-3 pb-5">
          {search.error ? (
            <Alert variant="destructive">
              <AlertTitle>Sign-in failed</AlertTitle>
              <AlertDescription>We couldn&apos;t complete the sign-in with your provider. Please try again or use a different method.</AlertDescription>
            </Alert>
          ) : null}

          {socialProviders.length > 0 && (
            <>
              <div className="grid gap-2 sm:grid-cols-2">
                {socialProviders.map((provider) => (
                  <SocialLoginButton
                    key={provider}
                    disabled={isBusy}
                    isBusy={busyAction === provider}
                    isLastUsed={mode === "sign-in" && lastLoginMethod === provider}
                    onClick={() => void handleSocialSignIn(provider)}
                    provider={provider}
                  />
                ))}
              </div>

              <div className="relative flex items-center justify-center py-1">
                <div className="absolute inset-x-0 border-t border-border" />
                <span className="relative bg-card px-2 font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">or continue with email</span>
              </div>
            </>
          )}

          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            {mode === "sign-up" && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" autoComplete="name" disabled={isBusy} onChange={(event) => setName(event.target.value)} placeholder="Your name" value={name} />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email address</Label>
              <div className="relative">
                <Input
                  id="email"
                  autoComplete="email"
                  disabled={isBusy}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Enter your email address"
                  type="email"
                  value={email}
                />
                {mode === "sign-in" && lastLoginMethod === "email" ? <LastUsedIndicator label="Email" /> : null}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
                disabled={isBusy}
                minLength={8}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                type="password"
                value={password}
              />
            </div>

            {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

            <Button className="w-full" size="lg" disabled={isBusy} type="submit">
              {busyAction === "credentials" ? (
                <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
              ) : (
                "Continue"
              )}
            </Button>
          </form>
        </CardContent>

        {signupAllowed && (
          <div className="border-t bg-muted/20 px-5 py-4 text-center text-sm text-muted-foreground">
            {mode === "sign-in" ? (
              <>
                Don&apos;t have an account?{" "}
                <button type="button" onClick={() => switchMode("sign-up")} className="font-medium text-primary underline-offset-4 hover:underline">
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button type="button" onClick={() => switchMode("sign-in")} className="font-medium text-primary underline-offset-4 hover:underline">
                  Sign in
                </button>
              </>
            )}
          </div>
        )}
      </Card>

      <p className="mt-6 text-xs text-muted-foreground">© {new Date().getFullYear()} Flamette Money</p>
    </div>
  )
}
