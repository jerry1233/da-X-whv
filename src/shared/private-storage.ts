import type { StorageArea } from "./store"

// Content scripts use the website's IndexedDB origin, never the extension's database.
const opened = new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open("great-x-private", 1)
  request.onupgradeneeded = () => request.result.createObjectStore("values")
  request.onsuccess = () => resolve(request.result)
  request.onerror = () => reject(request.error)
})
export const privateStorage: StorageArea = {
  async get(keys) {
    const db = await opened
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("values", "readonly")
      const result: Record<string, unknown> = {}
      for (const key of keys) {
        const request = transaction.objectStore("values").get(key)
        request.onsuccess = () => { result[key] = request.result }
      }
      transaction.oncomplete = () => resolve(result)
      transaction.onerror = transaction.onabort = () => reject(transaction.error)
    })
  },
  async set(values) {
    const db = await opened
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("values", "readwrite")
      for (const [key, value] of Object.entries(values)) transaction.objectStore("values").put(value, key)
      transaction.oncomplete = () => resolve()
      transaction.onerror = transaction.onabort = () => reject(transaction.error)
    })
    // Only non-profile settings are mirrored for the existing UI change events.
    if (values.setting) await chrome.storage.local.set({ setting: values.setting })
  }
}
export async function migratePrivateStorage() {
  const stored = await privateStorage.get(["migrated"])
  if (!stored.migrated) {
    const legacy = await chrome.storage.local.get(["setting", "au", "nz"])
    await privateStorage.set({ ...legacy, migrated: true })
  }
  // Remove legacy copies only after the IndexedDB transaction has committed.
  await chrome.storage.local.remove(["au", "nz"])
}
