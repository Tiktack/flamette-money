import * as React from "react"

import { createFileRoute, redirect, useRouter } from "@tanstack/react-router"

import { HugeiconsIcon } from "@hugeicons/react"
import { CommandIcon } from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getAuthRedirect } from "@/lib/auth/auth-redirect"
import { authClient } from "@/lib/auth/client"
import { getCurrentUserProfile } from "@/lib/auth/functions"

export const Route = createFileRoute("/sign-in")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  beforeLoad: async ({ search }) => {
    const user = await getCurrentUserProfile()
    if (user) {
      throw redirect({ to: getAuthRedirect(search.redirect) as never })
    }
  },
  component: SignInPage,
})

function SignInPage() {
  const redirectTo = getAuthRedirect(Route.useSearch().redirect)
  const router = useRouter()
  const [mode, setMode] = React.useState<"sign-in" | "sign-up">("sign-in")
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [isBusy, setIsBusy] = React.useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage(null)
    setIsBusy(true)

    const result =
      mode === "sign-up"
        ? await authClient.signUp.email({ name, email, password })
        : await authClient.signIn.email({ email, password })

    if (result.error) {
      setErrorMessage(result.error.message ?? "Unable to continue.")
      setIsBusy(false)
      return
    }

    setIsBusy(false)
    router.history.push(redirectTo)
  }

  const switchMode = (next: "sign-in" | "sign-up") => {
    setMode(next)
    setErrorMessage(null)
  }

  return (
    <div className="auth-bg flex min-h-svh flex-col items-center justify-center px-4 py-10">
      <div className="mb-8 flex items-center gap-2.5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
          <HugeiconsIcon
            icon={CommandIcon}
            strokeWidth={2}
            className="size-4 text-primary"
          />
        </div>
        <div className="grid gap-0.5">
          <span className="text-base font-semibold tracking-tight text-foreground">
            Flamette Money
          </span>
          <span className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
            workspace access
          </span>
        </div>
      </div>

      <Card className="w-full max-w-sm gap-0 overflow-hidden py-0 shadow-none">
        <CardHeader className="pt-6 pb-4">
          <CardTitle className="text-xl font-semibold tracking-tight">
            {mode === "sign-in" ? "Sign in" : "Create your account"}
          </CardTitle>
          <CardDescription>
            {mode === "sign-in"
              ? "Welcome back — enter your details to continue"
              : "Fill in the details below to get started"}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-4 pb-6">
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            {mode === "sign-up" && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  autoComplete="name"
                  disabled={isBusy}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your name"
                  value={name}
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                autoComplete="email"
                disabled={isBusy}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter your email address"
                type="email"
                value={email}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                autoComplete={
                  mode === "sign-up" ? "new-password" : "current-password"
                }
                disabled={isBusy}
                minLength={8}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                type="password"
                value={password}
              />
            </div>

            {errorMessage && (
              <p className="text-sm text-destructive">{errorMessage}</p>
            )}

            <Button
              className="w-full"
              size="lg"
              disabled={isBusy}
              type="submit"
            >
              {isBusy ? (
                <span
                  className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                  aria-hidden
                />
              ) : (
                "Continue"
              )}
            </Button>
          </form>
        </CardContent>

        <div className="border-t bg-muted/20 px-5 py-4 text-center text-sm text-muted-foreground">
          {mode === "sign-in" ? (
            <>
              Don&apos;t have an account?{" "}
              <button
                type="button"
                onClick={() => switchMode("sign-up")}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => switchMode("sign-in")}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Sign in
              </button>
            </>
          )}
        </div>
      </Card>

      <p className="mt-6 text-xs text-muted-foreground">
        © {new Date().getFullYear()} Flamette Money
      </p>
    </div>
  )
}
