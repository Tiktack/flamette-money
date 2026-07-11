import { eq } from "drizzle-orm"

import { db } from "@/lib/db/client.server"
import { emailConnections } from "@/lib/db/schema"

import { isEmailSyncInFlight, runExclusiveEmailSync } from "./sync.server"

const TICK_INTERVAL_MS = 60_000
const FIRST_TICK_DELAY_MS = 15_000
const MAX_BACKOFF_MINUTES = 24 * 60
const MAX_BACKOFF_EXPONENT = 5

// The app has no dedicated boot hook, so the scheduler starts lazily on first server
// activity (any authenticated request, or the /api/healthz endpoint that the Home
// Assistant watchdog polls right after boot). The globalThis guard keeps it a singleton
// even when dev SSR/HMR evaluates this module in more than one module graph.
const schedulerKey = Symbol.for("flamette.emailImport.scheduler")

type SchedulerState = {
  ticking: boolean
  stopped: boolean
}

export function ensureEmailImportScheduler() {
  const globalStore = globalThis as Record<symbol, unknown>
  if (globalStore[schedulerKey]) {
    return
  }

  const state: SchedulerState = { ticking: false, stopped: false }
  globalStore[schedulerKey] = state

  const firstTick = setTimeout(() => {
    void tick(state)
  }, FIRST_TICK_DELAY_MS)
  firstTick.unref?.()

  const interval = setInterval(() => {
    void tick(state)
  }, TICK_INTERVAL_MS)
  interval.unref?.()

  const stop = () => {
    state.stopped = true
    clearTimeout(firstTick)
    clearInterval(interval)
  }
  process.once("SIGTERM", stop)
  process.once("SIGINT", stop)

  console.log("[email-import] scheduler started")
}

// Failed connections retry with exponential backoff so a broken password does not hammer
// the mail server every poll interval.
function effectiveIntervalMinutes(pollIntervalMinutes: number, consecutiveFailures: number) {
  const multiplier = 2 ** Math.min(consecutiveFailures, MAX_BACKOFF_EXPONENT)
  return Math.min(pollIntervalMinutes * multiplier, MAX_BACKOFF_MINUTES)
}

async function tick(state: SchedulerState) {
  if (state.ticking || state.stopped) {
    return
  }

  state.ticking = true
  try {
    const connections = await db.query.emailConnections.findMany({
      where: eq(emailConnections.enabled, true),
    })
    const now = Date.now()

    // Sequential on purpose: a single SQLite-backed process gains nothing from parallel
    // mailbox syncs, and one connection's failure must never affect the next.
    for (const connection of connections) {
      if (state.stopped) {
        break
      }

      const dueAt = connection.lastSyncAt
        ? connection.lastSyncAt.getTime() + effectiveIntervalMinutes(connection.pollIntervalMinutes, connection.consecutiveFailures) * 60_000
        : 0
      if (now < dueAt || isEmailSyncInFlight(connection.id)) {
        continue
      }

      try {
        const result = await runExclusiveEmailSync(connection.id)
        if (result.fetched > 0) {
          console.log(
            `[email-import] synced "${connection.name}": ${result.fetched} fetched, ${result.imported} imported, ${result.pending} pending, ${result.unparsed} unparsed`
          )
        }
      } catch (error) {
        console.error(`[email-import] scheduled sync failed for "${connection.name}"`, error instanceof Error ? error.message : error)
      }
    }
  } catch (error) {
    console.error("[email-import] scheduler tick failed", error)
  } finally {
    state.ticking = false
  }
}
