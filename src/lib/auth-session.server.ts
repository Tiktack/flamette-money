import { eq } from "drizzle-orm"
import { getRequestHeaders } from "@tanstack/react-start/server"

import { auth } from "@/lib/auth"
import { ensureUserBootstrap } from "@/lib/bootstrap.server"
import { db } from "@/lib/db/client.server"
import { users } from "@/lib/db/schema"

export async function getSessionData() {
  const headers = getRequestHeaders()
  return auth.api.getSession({ headers })
}

export async function requireSessionData() {
  const session = await getSessionData()

  if (!session) {
    throw new Error("Unauthorized")
  }

  return session
}

export async function getCurrentUserProfileData() {
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
    baseCurrency: user.baseCurrency,
    subscriptionType: user.subscriptionType,
  }
}
