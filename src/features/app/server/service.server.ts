import { eq } from "drizzle-orm"

import { ensureUserBootstrap } from "@/lib/bootstrap.server"
import { getSessionData } from "@/lib/auth/session.server"
import { supportedCurrencies } from "@/lib/currency"
import { db } from "@/lib/db/client.server"
import { users } from "@/lib/db/schema"

import type {
  AppInfoResponse,
  CurrentUserResponse,
} from "@/features/shared/types"

export async function getCurrentUserData(): Promise<CurrentUserResponse | null> {
  const session = await getSessionData()

  if (!session) {
    return null
  }

  await ensureUserBootstrap(session.user.id)

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  })

  if (!user) {
    return null
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    googleSubject: "",
    baseCurrency: user.baseCurrency,
    subscriptionType: user.subscriptionType,
  }
}

export async function getAppInfoData(): Promise<AppInfoResponse> {
  return {
    supportedCurrencies: supportedCurrencies.map((code) => ({ code })),
  }
}
