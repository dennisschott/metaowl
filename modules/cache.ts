/**
 * @module Cache
 *
 * Async-style localStorage wrapper.
 *
 * Values are automatically JSON-serialised on write and deserialised on read.
 * All methods return Promises so they are interchangeable with IndexedDB-based
 * alternatives without changing call-sites.
 */

export default class Cache {
  /**
   * Retrieve a value by key.
   */
  static async get<T = unknown>(key: string): Promise<T | null> {
    const rawValue = localStorage.getItem(key)
    return rawValue === null ? null : JSON.parse(rawValue) as T
  }

  /**
   * Store a value under the given key.
   */
  static async set(key: string, value: unknown): Promise<void> {
    localStorage.setItem(key, JSON.stringify(value))
  }

  /**
   * Remove a single entry.
   */
  static async remove(key: string): Promise<void> {
    localStorage.removeItem(key)
  }

  /**
   * Remove all entries from localStorage.
   */
  static async clear(): Promise<void> {
    localStorage.clear()
  }

  /**
   * Return all keys currently stored in localStorage.
   */
  static async keys(): Promise<string[]> {
    const keys: string[] = []

    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index)
      if (key !== null) {
        keys.push(key)
      }
    }

    return keys
  }
}