import { eq } from "drizzle-orm"

import { auth } from "@/lib/auth"
import { ensureUserBootstrap } from "@/lib/bootstrap.server"
import { db } from "@/lib/db/client.server"
import { users } from "@/lib/db/schema"

export class HttpError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = "HttpError"
    this.status = status
  }
}

export function fail(message: string, status = 400): never {
  throw new HttpError(status, message)
}

export async function requireUserIdForRequest(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })

  if (!session) {
    fail("Unauthorized", 401)
  }

  await ensureUserBootstrap(session.user.id)
  return session.user.id
}

export async function requireUserForRequest(request: Request) {
  const userId = await requireUserIdForRequest(request)
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  })

  if (!user) {
    fail("User profile was not found.")
  }

  return user
}

/** Rejects oversized uploads before the body is buffered into memory. */
export function assertRequestSizeWithinLimit(request: Request, maxBytes: number) {
  const contentLength = Number(request.headers.get("content-length"))

  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    fail(`Request body exceeds the ${Math.round(maxBytes / (1024 * 1024))} MB limit.`, 413)
  }
}

/** Maps an error to a JSON Response; internal errors stay generic so messages never leak. */
export function toErrorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return Response.json({ message: error.message }, { status: error.status })
  }

  console.error(error)
  return Response.json({ message: "Something went wrong." }, { status: 500 })
}
