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
   *
   * @param {string} key
   * @returns {Promise<any>} Parsed value, or `null` if the key does not exist.
   */
  static async get(key) {
    return JSON.parse(localStorage.getItem(key))
  }

  /**
   * Store a value under the given key.
   *
   * @param {string} key
   * @param {any} value - Must be JSON-serialisable.
   * @returns {Promise<void>}
   */
  static async set(key, value) {
    localStorage.setItem(key, JSON.stringify(value))
  }

  /**
   * Remove a single entry.
   *
   * @param {string} key
   * @returns {Promise<void>}
   */
  static async remove(key) {
    localStorage.removeItem(key)
  }

  /**
   * Remove **all** entries from localStorage.
   *
   * @returns {Promise<void>}
   */
  static async clear() {
    localStorage.clear()
  }

  /**
   * Return all keys currently stored in localStorage.
   *
   * @returns {Promise<string[]>}
   */
  static async keys() {
    return Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i))
  }
}
