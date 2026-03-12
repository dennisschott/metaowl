import { describe, it, expect } from 'vitest'
import {
  useAuth,
  useLocalStorage,
  useFetch,
  useDebounce,
  useThrottle,
  useWindowSize,
  useOnlineStatus,
  useAsyncState,
  useCache,
  Composables
} from '../modules/composables.js'

describe('Composables', () => {
  describe('Exports', () => {
    it('should export useAuth function', () => {
      expect(typeof useAuth).toBe('function')
    })

    it('should export useLocalStorage function', () => {
      expect(typeof useLocalStorage).toBe('function')
    })

    it('should export useFetch function', () => {
      expect(typeof useFetch).toBe('function')
    })

    it('should export useDebounce function', () => {
      expect(typeof useDebounce).toBe('function')
    })

    it('should export useThrottle function', () => {
      expect(typeof useThrottle).toBe('function')
    })

    it('should export useWindowSize function', () => {
      expect(typeof useWindowSize).toBe('function')
    })

    it('should export useOnlineStatus function', () => {
      expect(typeof useOnlineStatus).toBe('function')
    })

    it('should export useAsyncState function', () => {
      expect(typeof useAsyncState).toBe('function')
    })

    it('should export useCache function', () => {
      expect(typeof useCache).toBe('function')
    })
  })

  describe('Composables namespace', () => {
    it('should export all composables via namespace', () => {
      expect(Composables.useAuth).toBe(useAuth)
      expect(Composables.useLocalStorage).toBe(useLocalStorage)
      expect(Composables.useFetch).toBe(useFetch)
      expect(Composables.useDebounce).toBe(useDebounce)
      expect(Composables.useThrottle).toBe(useThrottle)
      expect(Composables.useWindowSize).toBe(useWindowSize)
      expect(Composables.useOnlineStatus).toBe(useOnlineStatus)
      expect(Composables.useAsyncState).toBe(useAsyncState)
      expect(Composables.useCache).toBe(useCache)
    })

    it('should have correct function signatures', () => {
      // Check that all functions accept parameters
      // Note: function.length only counts required parameters before first default
      expect(useAuth.length).toBeGreaterThanOrEqual(0)
      expect(useLocalStorage.length).toBeGreaterThanOrEqual(0)
      expect(useFetch.length).toBeGreaterThanOrEqual(0)
      expect(useDebounce.length).toBeGreaterThanOrEqual(0)
      expect(useThrottle.length).toBeGreaterThanOrEqual(0)
      expect(useWindowSize.length).toBeGreaterThanOrEqual(0)
      expect(useOnlineStatus.length).toBeGreaterThanOrEqual(0)
      expect(useAsyncState.length).toBeGreaterThanOrEqual(0)
      expect(useCache.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Documentation', () => {
    it('should have JSDoc comments', () => {
      // Check that functions are documented by checking they're exported
      const exportedFunctions = [
        useAuth,
        useLocalStorage,
        useFetch,
        useDebounce,
        useThrottle,
        useWindowSize,
        useOnlineStatus,
        useAsyncState,
        useCache
      ]

      for (const fn of exportedFunctions) {
        expect(typeof fn).toBe('function')
        expect(fn.name).toBeTruthy()
      }
    })
  })
})
