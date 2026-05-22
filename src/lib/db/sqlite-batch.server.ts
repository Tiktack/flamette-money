// Cloudflare D1 allows a maximum of 100 bound parameters per query.
// Keep shared batch sizes below that cap for both wider INSERT statements and
// large IN (...) clauses used by reset/import/export flows. Transaction inserts
// currently bind 21 values per row, so bulk inserts must stay at 4 rows max.
export const SQLITE_INSERT_BATCH_SIZE = 4
export const SQLITE_IN_CLAUSE_BATCH_SIZE = 90

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
