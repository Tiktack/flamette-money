export const SQLITE_INSERT_BATCH_SIZE = 40
export const SQLITE_IN_CLAUSE_BATCH_SIZE = 500

export async function forEachChunk<T>(
  values: readonly T[],
  chunkSize: number,
  callback: (chunk: T[]) => Promise<void>
) {
  for (let index = 0; index < values.length; index += chunkSize) {
    await callback(values.slice(index, index + chunkSize))
  }
}

export function forEachChunkSync<T>(
  values: readonly T[],
  chunkSize: number,
  callback: (chunk: T[]) => void
) {
  for (let index = 0; index < values.length; index += chunkSize) {
    callback(values.slice(index, index + chunkSize))
  }
}
