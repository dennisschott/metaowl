/**
 * @module Composables
 *
 * Reusable composables/hooks for MetaOwl OWL applications.
 */

import { onMounted, onWillUnmount, useState } from '@odoo/owl'
import Cache from './cache.js'
import Fetch from './fetch.js'
import type { OdooSession } from './odoo-rpc.js'
import type { HttpMethod } from './fetch.js'

type MaybePromise<T> = T | Promise<T>

type ReactiveRef<T> = {
  value: T
  __value?: T
  __set?: unknown
  __owl__?: {
    reactivity?: unknown
  }
}

type Credentials = {
  username?: string
  password?: string
}

type AuthComposable = {
  user: ReactiveRef<OdooSession | null>
  isLoggedIn: ReactiveRef<boolean>
  isLoading: ReactiveRef<boolean>
  login: (credentials?: Credentials) => Promise<boolean>
  logout: () => Promise<void>
  checkAuth: () => Promise<boolean>
}

type FetchComposableOptions<TInput = unknown, TOutput = TInput> = {
  initialData?: TOutput | null
  immediate?: boolean
  transform?: (data: TInput) => TOutput
  onError?: ((error: unknown) => void) | null
  method?: HttpMethod
  data?: object | null
  internal?: boolean
  triggerErrorHandler?: boolean
}

type AsyncStateStatus = null | 'loading' | 'success' | 'error'

function createRef<T>(initialValue: T | (() => T)): ReactiveRef<T> {
  const resolvedValue = typeof initialValue === 'function'
    ? (initialValue as () => T)()
    : initialValue

  const state = useState({
    value: resolvedValue,
    __value: resolvedValue
  }) as unknown as ReactiveRef<T>

  if (state.__value === undefined) {
    state.__value = resolvedValue
  }

  return state
}

function getRefValue<T>(value: string | ReactiveRef<T>): string | T {
  return typeof value === 'object' && value !== null && 'value' in value
    ? value.value
    : value
}

export function useAuth(): AuthComposable {
  const user = createRef<OdooSession | null>(null)
  const isLoggedIn = createRef(false)
  const isLoading = createRef(false)
  let unsubscribe: (() => void) | null = null

  onMounted(async () => {
    try {
      const { OdooService } = await import('./odoo-rpc.js')

      isLoggedIn.value = OdooService.isAuthenticated()
      user.value = OdooService.getSession()

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

  const login = async (credentials?: Credentials): Promise<boolean> => {
    isLoading.value = true
    try {
      const { OdooService } = await import('./odoo-rpc.js')
      await OdooService.authenticate(credentials?.username, credentials?.password)
      return true
    } catch {
      return false
    } finally {
      isLoading.value = false
    }
  }

  const logout = async (): Promise<void> => {
    try {
      const { OdooService } = await import('./odoo-rpc.js')
      OdooService.logout()
    } catch {
      // Ignore errors
    }
  }

  const checkAuth = async (): Promise<boolean> => {
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

export function useLocalStorage<T>(key: string, defaultValue: T | null = null): ReactiveRef<T | null> {
  const state = createRef<T | null>(() => {
    try {
      const item = localStorage.getItem(key)
      return item !== null ? JSON.parse(item) as T : defaultValue
    } catch {
      return defaultValue
    }
  })

  Object.defineProperty(state, 'value', {
    get() {
      return state.__value
    },
    set(newValue: T | null) {
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

  const handleStorage = (event: StorageEvent): void => {
    if (event.key === key) {
      try {
        state.__value = event.newValue !== null
          ? JSON.parse(event.newValue) as T
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

export function useFetch<TInput = unknown, TOutput = TInput>(
  url: string | ReactiveRef<string>,
  options: FetchComposableOptions<TInput, TOutput> = {}
): {
  data: ReactiveRef<TOutput | null>
  loading: ReactiveRef<boolean>
  error: ReactiveRef<unknown>
  refresh: () => Promise<TOutput | undefined>
  execute: (executeUrl?: string | null) => Promise<TOutput | undefined>
} {
  const {
    initialData = null,
    immediate = true,
    transform = (data: TInput) => data as unknown as TOutput,
    onError = null,
    method = 'GET',
    data: requestData = null,
    internal = true,
    triggerErrorHandler = true
  } = options

  const data = createRef<TOutput | null>(initialData)
  const loading = createRef(false)
  const error = createRef<unknown>(null)

  const execute = async (executeUrl: string | null = null): Promise<TOutput | undefined> => {
    const fetchUrl = executeUrl || getRefValue(url)

    if (!fetchUrl) return undefined

    loading.value = true
    error.value = null

    try {
      const result = await Fetch.url<TInput>(
        String(fetchUrl),
        method,
        requestData,
        internal,
        triggerErrorHandler
      )

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

  const refresh = (): Promise<TOutput | undefined> => execute()

  onMounted(() => {
    if (immediate) {
      void execute()
    }
  })

  return {
    data,
    loading,
    error,
    refresh,
    execute
  }
}

export function useDebounce<T>(value: ReactiveRef<T>, wait = 300): ReactiveRef<T> {
  const debouncedValue = createRef(value.value)
  let timeout: ReturnType<typeof setTimeout> | null = null

  Object.defineProperty(value, 'value', {
    get() {
      return value.__value as T
    },
    set(newValue: T) {
      value.__value = newValue
      if (timeout) {
        clearTimeout(timeout)
      }
      timeout = setTimeout(() => {
        debouncedValue.value = newValue
      }, wait)
    }
  })

  onWillUnmount(() => {
    if (timeout) {
      clearTimeout(timeout)
    }
  })

  return debouncedValue
}

export function useThrottle<TArgs extends unknown[]>(fn: (...args: TArgs) => void, wait = 300): (...args: TArgs) => void {
  let lastCall = 0
  let timeout: ReturnType<typeof setTimeout> | null = null

  const throttled = (...args: TArgs): void => {
    const now = Date.now()
    const remaining = wait - (now - lastCall)

    if (remaining <= 0) {
      if (timeout) {
        clearTimeout(timeout)
        timeout = null
      }
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
    if (timeout) {
      clearTimeout(timeout)
    }
  })

  return throttled
}

export function useWindowSize(): { width: ReactiveRef<number>; height: ReactiveRef<number> } {
  const width = createRef(window.innerWidth)
  const height = createRef(window.innerHeight)

  const handleResize = (): void => {
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

export function useOnlineStatus(): ReactiveRef<boolean> {
  const isOnline = createRef(navigator.onLine)

  const handleOnline = (): void => {
    isOnline.value = true
  }

  const handleOffline = (): void => {
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

export function useAsyncState<TResult, TArgs extends unknown[]>(
  asyncFn: (...args: TArgs) => MaybePromise<TResult>,
  options: { immediate?: boolean; initialData?: TResult | null } = {}
): {
  state: ReactiveRef<AsyncStateStatus>
  data: ReactiveRef<TResult | null>
  error: ReactiveRef<unknown>
  execute: (...args: TArgs) => Promise<TResult>
  isLoading: () => boolean
  isSuccess: () => boolean
  isError: () => boolean
} {
  const { immediate = false, initialData = null } = options

  const state = createRef<AsyncStateStatus>(null)
  const data = createRef<TResult | null>(initialData)
  const error = createRef<unknown>(null)

  const execute = async (...args: TArgs): Promise<TResult> => {
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
      void execute(...([] as unknown as TArgs))
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

export function useCache<T>(key: string, defaultValue: T | null = null): {
  value: ReactiveRef<T | null>
  set: (newValue: T | null) => void
  get: () => Promise<T | null>
  remove: () => void
  clear: () => void
} {
  const value = createRef<T | null>(defaultValue)

  onMounted(() => {
    void Cache.get<T>(key)
      .then((cached) => {
        value.value = cached ?? defaultValue
      })
      .catch(() => {
        value.value = defaultValue
      })
  })

  const set = (newValue: T | null): void => {
    value.value = newValue
    void Cache.set(key, newValue)
  }

  const get = async (): Promise<T | null> => {
    const cached = await Cache.get<T>(key)
    value.value = cached ?? defaultValue
    return cached
  }

  const remove = (): void => {
    value.value = defaultValue
    void Cache.remove(key)
  }

  const clear = (): void => {
    value.value = defaultValue
    void Cache.clear()
  }

  return {
    value,
    set,
    get,
    remove,
    clear
  }
}

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