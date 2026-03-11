/**
 * Async-style localStorage wrapper.
 *
 * Values are automatically JSON-serialised on write and deserialised on read.
 * All methods return Promises so they are interchangeable with IndexedDB-based
 * alternatives without changing call-sites.
 */
export default class Cache {
  /**
   * Retrieve a value by key.
   *
   * @param key - The key to retrieve
   * @returns Parsed value, or `null` if the key does not exist.
   */
  static async get<T = unknown>(key: string): Promise<T | null> {
    const item = localStorage.getItem(key)
    if (item === null) return null
    return JSON.parse(item) as T
  }

  /**
   * Store a value under the given key.
   *
   * @param key - The key to store under
   * @param value - Must be JSON-serialisable.
   */
  static async set<T>(key: string, value: T): Promise<void> {
    localStorage.setItem(key, JSON.stringify(value))
  }

  /**
   * Remove a single entry.
   *
   * @param key - The key to remove
   */
  static async remove(key: string): Promise<void> {
    localStorage.removeItem(key)
  }

  /**
   * Remove **all** entries from localStorage.
   */
  static async clear(): Promise<void> {
    localStorage.clear()
  }

  /**
   * Return all keys currently stored in localStorage.
   *
   * @returns Array of all stored keys
   */
  static async keys(): Promise<string[]> {
    return Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i) ?? '').filter(Boolean)
  }
}
