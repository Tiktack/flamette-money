// Shared batch sizes for wider INSERT statements and large IN (...) clauses used by
// reset/import/export flows. Local SQLite (better-sqlite3) allows up to 32,766 bound
// parameters per query, so these are sized for throughput while staying comfortably
// under that cap — transaction inserts bind 21 values per row (100 * 21 = 2100 params).
export const SQLITE_INSERT_BATCH_SIZE = 100
export const SQLITE_IN_CLAUSE_BATCH_SIZE = 500

export async function forEachChunk<T>(values: readonly T[], chunkSize: number, callback: (chunk: T[]) => Promise<void>) {
  for (let index = 0; index < values.length; index += chunkSize) {
    await callback(values.slice(index, index + chunkSize))
  }
}

export function forEachChunkSync<T>(values: readonly T[], chunkSize: number, callback: (chunk: T[]) => void) {
  for (let index = 0; index < values.length; index += chunkSize) {
    callback(values.slice(index, index + chunkSize))
  }
}
