// app_config reader with a short in-memory TTL cache: operational values
// (D-005) are editable in the database without redeploying, and the cache
// keeps route handlers from hitting the table on every request. No business
// rule hardcodes validation_threshold (LCHP-15 reads it from here).
import type { Db } from './db.ts'

const TTL_MS = 30_000

interface CacheEntry {
  value: string | null
  fetchedAt: number
}

const cache = new Map<string, CacheEntry>()

export async function getConfigInt(db: Db, key: string, fallback: number): Promise<number> {
  const hit = cache.get(key)
  const now = Date.now()
  if (hit && now - hit.fetchedAt < TTL_MS) {
    return parseOr(hit.value, fallback)
  }
  const value = await db.getConfigValue(key)
  cache.set(key, { value, fetchedAt: now })
  return parseOr(value, fallback)
}

export function getValidationThreshold(db: Db): Promise<number> {
  return getConfigInt(db, 'validation_threshold', 1)
}

export function clearConfigCache(): void {
  cache.clear()
}

function parseOr(value: string | null, fallback: number): number {
  if (value === null) return fallback
  const n = Number.parseInt(value, 10)
  return Number.isFinite(n) && n > 0 ? n : fallback
}
