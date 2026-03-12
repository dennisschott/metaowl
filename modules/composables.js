/**
 * @module Composables
 *
 * Reusable composables/hooks for MetaOwl OWL applications.
 *
 * This module provides a collection of commonly used patterns
 * that can be shared across components.
 *
 * Available composables:
 * - useAuth: Authentication state management
 * - useLocalStorage: Reactive localStorage access
 * - useFetch: Data fetching with loading states
 * - useDebounce: Debounced values
 * - useThrottle: Throttled function execution
 * - useWindowSize: Reactive window dimensions
 * - useOnlineStatus: Network connectivity detection
 * - useAsyncState: Async operation state management
 *
 * Usage:
 *   import { useAuth, useLocalStorage, useFetch } from 'metaowl'
 *
 *   class MyComponent extends Component {
 *     setup() {
 *       const { user, isLoggedIn, login, logout } = useAuth()
 *       const theme = useLocalStorage('theme', 'light')
 *       const { data, loading, error, refresh } = useFetch('/api/data')
 *
 *       return { user, theme, data, loading, error }
 *     }
 *   }
 */

import { useState, onMounted, onWillUnmount } from '@odoo/owl'
import { Cache } from './cache.js'
import { Fetch } from './fetch.js'

/**
 * Authentication state composable.
 *
 * Integrates with the OdooService for authentication state.
 * Automatically syncs with auth changes.
 *
 * @returns {Object} Auth state and methods
 * @property {Ref<Object|null>} user - Current user info
 * @property {Ref<boolean>} isLoggedIn - Authentication status
 * @property {Ref<boolean>} isLoading - Loading state
 * @property {Function} login - Login method
 * @property {Function} logout - Logout method
 * @property {Function} checkAuth - Check current auth status
 *
 * @example
 * const { user, isLoggedIn, logout } = useAuth()
 *
 * // In template
 * <div t-if="isLoggedIn.value">
 *   Welcome, <t t-esc="user.value?.name"/>
 *   <button t-on-click="logout">Logout</button>
 * </div>
 */
export function useAuth() {
  const user = useState(null)
  const isLoggedIn = useState(false)
  const isLoading = useState(false)
  let unsubscribe = null

  onMounted(async () => {
    // Try to import OdooService dynamically to avoid circular deps
    try {
      const { OdooService } = await import('./odoo-rpc.js')

      // Set initial state
      isLoggedIn.value = OdooService.isAuthenticated()
      user.value = OdooService.getSession()

      // Subscribe to auth changes
      unsubscribe = OdooService.onAuthChange((session) => {
        user.value = session
        isLoggedIn.value = session !== null
      })
    } catch {
      // OdooService not available, auth stays false
    }
  })

  onWillUnmount(() => {
    if (unsubscribe) {
      unsubscribe()
    }
  })

  const login = async (credentials) => {
    isLoading.value = true
    try {
      const { OdooService } = await import('./odoo-rpc.js')
      await OdooService.authenticate(credentials?.username, credentials?.password)
      return true
    } catch (error) {
      return false
    } finally {
      isLoading.value = false
    }
  }

  const logout = async () => {
    try {
      const { OdooService } = await import('./odoo-rpc.js')
      OdooService.logout()
    } catch {
      // Ignore errors
    }
  }

  const checkAuth = async () => {
    try {
      const { OdooService } = await import('./odoo-rpc.js')
      return OdooService.isAuthenticated()
    } catch {
      return false
    }
  }

  return {
    user,
    isLoggedIn,
    isLoading,
    login,
    logout,
    checkAuth
  }
}

/**
 * Reactive localStorage composable.
 *
 * Automatically syncs with localStorage and other components
 * using the same key.
 *
 * @param {string} key - localStorage key
 * @param {any} defaultValue - Default value if not found
 * @returns {Ref<any>} Reactive reference to stored value
 *
 * @example
 * const theme = useLocalStorage('theme', 'light')
 *
 * // Update value (automatically saves to localStorage)
 * theme.value = 'dark'
 *
 * // Access value
 * console.log(theme.value) // 'dark'
 */
export function useLocalStorage(key, defaultValue = null) {
  const state = useState(() => {
    try {
      const item = localStorage.getItem(key)
      return item !== null ? JSON.parse(item) : defaultValue
    } catch {
      return defaultValue
    }
  })

  // Watch for changes and sync to localStorage
  const originalSet = state.__set

  // Override the setter to persist to localStorage
  Object.defineProperty(state, 'value', {
    get() {
      return state.__value
    },
    set(newValue) {
      state.__value = newValue
      try {
        if (newValue === null) {
          localStorage.removeItem(key)
        } else {
          localStorage.setItem(key, JSON.stringify(newValue))
        }
      } catch {
        // Ignore storage errors
      }
    }
  })

  // Listen for changes from other tabs/windows
  const handleStorage = (event) => {
    if (event.key === key) {
      try {
        state.__value = event.newValue !== null
          ? JSON.parse(event.newValue)
          : defaultValue
      } catch {
        state.__value = defaultValue
      }
    }
  }

  onMounted(() => {
    window.addEventListener('storage', handleStorage)
  })

  onWillUnmount(() => {
    window.removeEventListener('storage', handleStorage)
  })

  return state
}

/**
 * Data fetching composable.
 *
 * Provides reactive loading, error, and data states
 * for HTTP requests.
 *
 * @param {string|Ref<string>} url - URL to fetch
 * @param {Object} options - Fetch options
 * @param {Object} [options.initialData=null] - Initial data value
 * @param {boolean} [options.immediate=true] - Fetch immediately on mount
 * @param {Function} [options.transform] - Transform response data
 * @param {Function} [options.onError] - Error handler
 * @returns {Object} Fetch state and control methods
 * @property {Ref<any>} data - Fetched data
 * @property {Ref<boolean>} loading - Loading state
 * @property {Ref<Error|null>} error - Error state
 * @property {Function} refresh - Refetch data
 * @property {Function} execute - Execute fetch with optional new URL
 *
 * @example
 * const { data, loading, error, refresh } = useFetch('/api/users')
 *
 * // In template
 * <div t-if="loading.value">Loading...</div>
 * <div t-elif="error.value">Error: <t t-esc="error.value.message"/></div>
 * <div t-else="">
 *   <div t-foreach="data.value" t-as="user" t-key="user.id">
 *     <t t-esc="user.name"/>
 *   </div>
 * </div>
 */
export function useFetch(url, options = {}) {
  const {
    initialData = null,
    immediate = true,
    transform = (data) => data,
    onError = null,
    ...fetchOptions
  } = options

  const data = useState(initialData)
  const loading = useState(false)
  const error = useState(null)

  const execute = async (executeUrl = null) => {
    const fetchUrl = executeUrl || (typeof url === 'object' ? url.value : url)

    if (!fetchUrl) return

    loading.value = true
    error.value = null

    try {
      const result = await Fetch.url(fetchUrl, fetchOptions)

      if (result === null) {
        throw new Error('Request failed')
      }

      data.value = transform(result)
      return data.value
    } catch (err) {
      error.value = err
      if (onError) {
        onError(err)
      }
      throw err
    } finally {
      loading.value = false
    }
  }

  const refresh = () => execute()

  onMounted(() => {
    if (immediate) {
      execute()
    }
  })

  // Watch for URL changes if url is a reactive reference
  if (typeof url === 'object' && url.__owl__?.reactivity) {
    // In a real implementation, we'd use a watch effect here
    // For now, manual refresh is required
  }

  return {
    data,
    loading,
    error,
    refresh,
    execute
  }
}

/**
 * Debounce a reactive value.
 *
 * Delays updating the value until after wait milliseconds
 * have elapsed since the last update.
 *
 * @param {Ref<any>} value - Reactive value to debounce
 * @param {number} [wait=300] - Debounce wait time in ms
 * @returns {Ref<any>} Debounced value
 *
 * @example
 * const searchQuery = useState('')
 * const debouncedQuery = useDebounce(searchQuery, 500)
 *
 * // debouncedQuery updates only 500ms after searchQuery stops changing
 */
export function useDebounce(value, wait = 300) {
  const debouncedValue = useState(value.value)
  let timeout = null

  // Create a proxy to watch for changes
  Object.defineProperty(value, 'value', {
    get() {
      return value.__value
    },
    set(newValue) {
      value.__value = newValue
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        debouncedValue.value = newValue
      }, wait)
    }
  })

  onWillUnmount(() => {
    clearTimeout(timeout)
  })

  return debouncedValue
}

/**
 * Throttle a function.
 *
 * Ensures the function is called at most once per wait period.
 *
 * @param {Function} fn - Function to throttle
 * @param {number} [wait=300] - Throttle wait time in ms
 * @returns {Function} Throttled function
 *
 * @example
 * const throttledSearch = useThrottle((query) => {
 *   performSearch(query)
 * }, 500)
 *
 * // Can call multiple times, but executes at most once per 500ms
 */
export function useThrottle(fn, wait = 300) {
  let lastCall = 0
  let timeout = null

  const throttled = (...args) => {
    const now = Date.now()
    const remaining = wait - (now - lastCall)

    if (remaining <= 0) {
      clearTimeout(timeout)
      lastCall = now
      fn(...args)
    } else if (!timeout) {
      timeout = setTimeout(() => {
        lastCall = Date.now()
        timeout = null
        fn(...args)
      }, remaining)
    }
  }

  onWillUnmount(() => {
    clearTimeout(timeout)
  })

  return throttled
}

/**
 * Track window size reactively.
 *
 * @returns {Object} Window dimensions
 * @property {Ref<number>} width - Window inner width
 * @property {Ref<number>} height - Window inner height
 *
 * @example
 * const { width, height } = useWindowSize()
 *
 * // Reactive to window resizing
 * const isMobile = () => width.value < 768
 */
export function useWindowSize() {
  const width = useState(window.innerWidth)
  const height = useState(window.innerHeight)

  const handleResize = () => {
    width.value = window.innerWidth
    height.value = window.innerHeight
  }

  onMounted(() => {
    window.addEventListener('resize', handleResize)
  })

  onWillUnmount(() => {
    window.removeEventListener('resize', handleResize)
  })

  return { width, height }
}

/**
 * Track online/offline status.
 *
 * @returns {Ref<boolean>} True if online
 *
 * @example
 * const isOnline = useOnlineStatus()
 *
 * <div t-if="!isOnline.value" class="offline-banner">
 *   You are offline
 * </div>
 */
export function useOnlineStatus() {
  const isOnline = useState(navigator.onLine)

  const handleOnline = () => {
    isOnline.value = true
  }

  const handleOffline = () => {
    isOnline.value = false
  }

  onMounted(() => {
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
  })

  onWillUnmount(() => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  })

  return isOnline
}

/**
 * Manage async operation state.
 *
 * Tracks loading, error, and data states for any async function.
 *
 * @param {Function} asyncFn - Async function to execute
 * @param {Object} options - Options
 * @param {boolean} [options.immediate=false] - Execute immediately
 * @param {any} [options.initialData=null] - Initial data value
 * @returns {Object} Async state
 * @property {Ref<any>} state - Current state (null, 'loading', 'success', 'error')
 * @property {Ref<any>} data - Result data
 * @property {Ref<Error|null>} error - Error if any
 * @property {Function} execute - Execute the async function
 * @property {boolean} isLoading - True if loading
 * @property {boolean} isSuccess - True if succeeded
 * @property {boolean} isError - True if errored
 *
 * @example
 * const fetchUser = async (id) => {
 *   return await api.getUser(id)
 * }
 *
 * const { state, data, execute, isLoading } = useAsyncState(fetchUser)
 *
 * // Execute
 * await execute(123)
 *
 * // Check state
 * if (isLoading.value) console.log('Loading...')
 * if (isSuccess.value) console.log('User:', data.value)
 */
export function useAsyncState(asyncFn, options = {}) {
  const { immediate = false, initialData = null } = options

  const state = useState(null) // null, 'loading', 'success', 'error'
  const data = useState(initialData)
  const error = useState(null)

  const execute = async (...args) => {
    state.value = 'loading'
    error.value = null

    try {
      const result = await asyncFn(...args)
      data.value = result
      state.value = 'success'
      return result
    } catch (err) {
      error.value = err
      state.value = 'error'
      throw err
    }
  }

  if (immediate) {
    onMounted(() => {
      execute()
    })
  }

  return {
    state,
    data,
    error,
    execute,
    isLoading: () => state.value === 'loading',
    isSuccess: () => state.value === 'success',
    isError: () => state.value === 'error'
  }
}

/**
 * Reactive cache composable.
 *
 * Uses the MetaOwl Cache module with reactive updates.
 *
 * @param {string} key - Cache key
 * @param {any} defaultValue - Default value
 * @returns {Object} Cache operations
 * @property {Ref<any>} value - Cached value
 * @property {Function} set - Set cache value
 * @property {Function} get - Get cache value
 * @property {Function} remove - Remove from cache
 * @property {Function} clear - Clear entire cache
 *
 * @example
 * const { value, set } = useCache('user-preferences', {})
 *
 * set({ theme: 'dark' })
 * console.log(value.value) // { theme: 'dark' }
 */
export function useCache(key, defaultValue = null) {
  const value = useState(() => {
    try {
      return Cache.get(key) || defaultValue
    } catch {
      return defaultValue
    }
  })

  const set = (newValue) => {
    value.value = newValue
    Cache.set(key, newValue)
  }

  const get = () => {
    const cached = Cache.get(key)
    value.value = cached
    return cached
  }

  const remove = () => {
    value.value = defaultValue
    Cache.remove(key)
  }

  const clear = () => {
    value.value = defaultValue
    Cache.clear()
  }

  return {
    value,
    set,
    get,
    remove,
    clear
  }
}

// Export all composables as a namespace
export const Composables = {
  useAuth,
  useLocalStorage,
  useFetch,
  useDebounce,
  useThrottle,
  useWindowSize,
  useOnlineStatus,
  useAsyncState,
  useCache
}

export default Composables
