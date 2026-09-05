import { normalizeDatabase, type Database } from "./model"

export interface StorageArea {
  get(keys: string[]): Promise<Record<string, unknown>>
  set(items: Record<string, unknown>): Promise<void>
}
export function createStore(area: StorageArea) {
  let tail: Promise<unknown> = Promise.resolve()
  const serial = <T>(operation: () => Promise<T>): Promise<T> => {
    const result = tail.then(operation)
    tail = result.catch(() => undefined)
    return result
  }
  return {
    read: () => serial(async () => normalizeDatabase(await area.get(["setting", "au", "nz"]))),
    update: <T>(mutate: (data: Database) => T) => serial(async () => {
      const raw = await area.get(["setting", "au", "nz"])
      const data = normalizeDatabase(raw)
      const result = mutate(data)
      // Merge missing groups/fields without destroying older, unrecognized stored data.
      const merged: Record<string, unknown> = { ...data }
      for (const key of ["au", "nz"] as const) {
        const old = raw[key] as Record<string, Record<string, unknown>> | undefined
        merged[key] = Object.fromEntries(Object.entries(data[key]).map(([group, profile]) => [group, { ...old?.[group], ...profile }]))
      }
      await area.set(merged)
      return result
    })
  }
}
