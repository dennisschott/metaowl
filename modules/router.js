/**
 * @module Router
 *
 * Enhanced router with navigation guards support.
 *
 * Navigation guards allow intercepting navigation and controlling access
 * to routes based on conditions like authentication, permissions, etc.
 *
 * Features:
 * - Global beforeEach guards
 * - Global afterEach hooks
 * - Per-route beforeEnter guards
 * - Route metadata support
 * - Navigation cancellation and redirection
 *
 * @example
 * import { router } from 'metaowl'
 *
 * // Global guard - runs before every navigation
 * router.beforeEach((to, from, next) => {
 *   const auth = useAuthStore()
 *   if (to.meta.requiresAuth && !auth.isLoggedIn) {
 *     next('/login')
 *   } else {
 *     next()
 *   }
 * })
 *
 * // Global after hook - runs after navigation
 * router.afterEach((to, from) => {
 *   console.log(`Navigated from ${from.path} to ${to.path}`)
 * })
 *
 * // Per-route guard
 * export class AdminPage extends Component {
 *   static route = {
 *     path: '/admin',
 *     meta: { requiresAuth: true, role: 'admin' },
 *     beforeEnter: (to, from, next) => { ... }
 *   }
 * }
 */

import { Component } from '@odoo/owl'

/**
 * Navigation guard function signature:
 * @typedef {Function} NavigationGuard
 * @param {Route} to - Target route
 * @param {Route} from - Current route (or null on initial)
 * @param {Function} next - Callback to resolve navigation
 *   - next() - proceed to next guard
 *   - next(false) - abort navigation
 *   - next('/path') - redirect to path
 *   - next({ path: '/path', replace: true }) - redirect with options
 *   - next(error) - abort with error
 */

/**
 * Current route object.
 * @type {Route|null}
 */
let _currentRoute = null

/**
 * Previous route object.
 * @type {Route|null}
 */
let _previousRoute = null

/**
 * Global beforeEach guards.
 * @type {NavigationGuard[]}
 */
const _beforeEachGuards = []

/**
 * Global afterEach hooks.
 * @type {Function[]}
 */
const _afterEachHooks = []

/**
 * Navigation in progress flag.
 * @type {boolean}
 */
let _isNavigating = false

/**
 * Navigation cancellation token.
 * @type {Function|null}
 */
let _cancelNavigation = null

/**
 * Router instance with guard support.
 */
class Router {
  constructor(routes) {
    this.routes = routes
    this.routeMap = new Map()

    // Build route map for quick lookup
    for (const route of routes) {
      for (const path of route.path) {
        this.routeMap.set(path, route)
      }
    }
  }

  /**
   * Resolve current URL against route table.
   *
   * @param {string} [path] - Optional path to resolve (for testing)
   * @returns {Route|null}
   */
  resolve(path) {
    const currentPath = path || document.location.pathname

    // Try exact match first
    if (this.routeMap.has(currentPath)) {
      return this.routeMap.get(currentPath)
    }

    // Try matching dynamic routes
    for (const route of this.routes) {
      if (this.matchRoute(route, currentPath)) {
        return route
      }
    }

    return null
  }

  /**
   * Match a route against a path.
   *
   * @param {object} route - Route definition
   * @param {string} path - Current path
   * @returns {boolean}
   */
  matchRoute(route, path) {
    for (const routePath of route.path) {
      if (this.pathMatches(routePath, path)) {
        return true
      }
    }
    return false
  }

  /**
   * Check if a route path matches the current path.
   *
   * Supports:
   * - Exact matches: /about
   * - Dynamic segments: /user/:id
   * - Optional segments: /user/:id?
   * - Wildcards: /user/*
   *
   * @param {string} routePath - Route path pattern
   * @param {string} currentPath - Current URL path
   * @returns {boolean}
   */
  pathMatches(routePath, currentPath) {
    // Convert route pattern to regex
    if (!routePath.includes(':') && !routePath.includes('*')) {
      // Simple exact match
      const normalizedRoute = routePath.replace(/\/$/, '') || '/'
      const normalizedCurrent = currentPath.replace(/\/$/, '') || '/'
      return normalizedRoute === normalizedCurrent
    }

    // Dynamic route matching
    let pattern = routePath
      // Escape special regex characters except pattern markers
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
      // Replace optional params :param?
      .replace(/\\:([^/]+)\\?/g, '(?:\\/([^/]+))?')
      // Replace required params :param
      .replace(/\\:([^/]+)/g, '([^/]+)')
      // Replace wildcards
      .replace(/\\\*/g, '(.*)')

    pattern = '^' + pattern + '$'
    const regex = new RegExp(pattern)

    return regex.test(currentPath)
  }

  /**
   * Extract parameters from a matched route.
   *
   * @param {object} route - Route definition
   * @param {string} path - Current path
   * @returns {object} Parameter key-value pairs
   */
  extractParams(route, path) {
    const params = {}

    for (const routePath of route.path) {
      const match = this.matchAndExtract(routePath, path)
      if (match) {
        Object.assign(params, match)
      }
    }

    return params
  }

  /**
   * Match a path and extract parameters.
   *
   * @param {string} routePath - Route pattern
   * @param {string} currentPath - Current URL
   * @returns {object|null}
   */
  matchAndExtract(routePath, currentPath) {
    if (!routePath.includes(':')) {
      return null
    }

    // Extract parameter names
    const paramNames = []
    const pattern = routePath.replace(/:([^/?]+)\??/g, (match, name) => {
      paramNames.push(name)
      return '([^/]+)'
    })

    const regex = new RegExp('^' + pattern + '$')
    const matches = currentPath.match(regex)

    if (!matches) return null

    const params = {}
    for (let i = 0; i < paramNames.length; i++) {
      params[paramNames[i]] = matches[i + 1]
    }

    return params
  }
}

/**
 * Route object passed to guards.
 * @typedef {object} Route
 * @property {string} name - Route name
 * @property {string[]} path - URL paths
 * @property {Function} component - Component class
 * @property {object} [meta] - Route metadata
 * @property {NavigationGuard} [beforeEnter] - Per-route guard
 * @property {object} [params] - Dynamic parameters
 */

/**
 * Process routes with guards.
 *
 * @param {object[]} routes - Route table
 * @param {string} [customPath] - Optional custom path for testing
 * @returns {Promise<object[]>} Resolved route or throws error
 * @throws {NavigationError} If navigation is aborted
 */
export async function processRoutes(routes, customPath) {
  // Use custom path for testing if provided
  const targetPath = customPath || document.location.pathname

  // Inject SSG-compatible path variants
  for (const route of routes) {
    const originalPaths = [...route.path]
    for (const path of originalPaths) {
      if (typeof path === 'string') {
        injectSystemRoutes(route, path)
      }
    }
  }

  const router = new Router(routes)
  const toRoute = router.resolve(targetPath)

  if (!toRoute) {
    throw new Error(`No route found for "${targetPath}".`)
  }

  // Build route object
  const to = buildRouteObject(toRoute, router)
  const from = _currentRoute

  // Run navigation guards
  try {
    await runGuards(to, from, router)

    // Update current route
    _previousRoute = _currentRoute
    _currentRoute = to

    // Run afterEach hooks
    for (const hook of _afterEachHooks) {
      hook(to, from)
    }

    return [toRoute]
  } catch (error) {
    if (error.name === 'NavigationRedirect') {
      // Redirect to new location
      if (error.path) {
        window.location.href = error.path
        return null
      }
    }
    throw error
  }
}

/**
 * Build a route object for guards.
 *
 * @param {object} routeDef - Raw route definition
 * @param {Router} router - Router instance
 * @returns {Route}
 */
function buildRouteObject(routeDef, router) {
  const currentPath = document.location.pathname
  const params = router.extractParams(routeDef, currentPath)

  return {
    name: routeDef.name,
    path: routeDef.path,
    fullPath: currentPath,
    component: routeDef.component,
    meta: routeDef.meta || {},
    beforeEnter: routeDef.beforeEnter,
    params,
    query: parseQuery(document.location.search)
  }
}

/**
 * Parse query string into object.
 *
 * @param {string} search - Query string (e.g., '?foo=bar&baz=qux')
 * @returns {object}
 */
function parseQuery(search) {
  const query = {}
  if (!search || search === '?') return query

  const params = new URLSearchParams(search.substring(1))
  for (const [key, value] of params) {
    if (query[key]) {
      if (Array.isArray(query[key])) {
        query[key].push(value)
      } else {
        query[key] = [query[key], value]
      }
    } else {
      query[key] = value
    }
  }

  return query
}

/**
 * Run all navigation guards.
 *
 * @param {Route} to - Target route
 * @param {Route} from - Current route
 * @param {Router} router - Router instance
 */
async function runGuards(to, from, router) {
  _isNavigating = true

  // Create navigation controller
  let cancelled = false
  _cancelNavigation = () => { cancelled = true }

  try {
    // Run global beforeEach guards
    for (const guard of _beforeEachGuards) {
      if (cancelled) break

      const result = await runGuard(guard, to, from)

      if (result === false) {
        throw new NavigationCancelled()
      }

      if (typeof result === 'string') {
        throw new NavigationRedirect(result)
      }

      if (result && typeof result === 'object' && result.path) {
        throw new NavigationRedirect(result.path)
      }
    }

    // Run per-route beforeEnter
    if (to.beforeEnter && !cancelled) {
      const result = await runGuard(to.beforeEnter, to, from)

      if (result === false) {
        throw new NavigationCancelled()
      }

      if (typeof result === 'string') {
        throw new NavigationRedirect(result)
      }
    }
  } finally {
    _isNavigating = false
    _cancelNavigation = null
  }
}

/**
 * Run a single guard with next callback support.
 *
 * @param {Function} guard - Guard function
 * @param {Route} to - Target route
 * @param {Route} from - Current route
 * @returns {Promise<*>}
 */
async function runGuard(guard, to, from) {
  return new Promise((resolve, reject) => {
    const next = (result) => {
      if (result instanceof Error) {
        reject(result)
      } else {
        resolve(result)
      }
    }

    try {
      const guardResult = guard(to, from, next)

      // Handle both sync and async guards
      if (guardResult && typeof guardResult.then === 'function') {
        guardResult.then(resolve).catch(reject)
      } else if (guardResult !== undefined) {
        // Sync guard returned a value
        resolve(guardResult)
      }
      // If undefined, guard called next() callback
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * Reset router state (for testing purposes).
 */
export function resetRouter() {
  _beforeEachGuards.length = 0
  _afterEachHooks.length = 0
  _isNavigating = false
  _cancelNavigation = null
  _currentRoute = null
  _previousRoute = null
}

/**
 * Navigation cancelled error.
 */
class NavigationCancelled extends Error {
  constructor() {
    super('Navigation cancelled')
    this.name = 'NavigationCancelled'
  }
}

/**
 * Navigation redirect error.
 */
class NavigationRedirect extends Error {
  constructor(path) {
    super('Navigation redirect')
    this.name = 'NavigationRedirect'
    this.path = path
  }
}

// --- Public Router API ---

/**
 * Register a global guard to be called before every navigation.
 *
 * @param {NavigationGuard} guard - Guard function
 * @returns {Function} Remove guard function
 */
export function beforeEach(guard) {
  _beforeEachGuards.push(guard)
  return () => {
    const index = _beforeEachGuards.indexOf(guard)
    if (index > -1) _beforeEachGuards.splice(index, 1)
  }
}

/**
 * Register a hook to be called after every navigation.
 *
 * @param {Function} hook - Hook function (to, from) => void
 * @returns {Function} Remove hook function
 */
export function afterEach(hook) {
  _afterEachHooks.push(hook)
  return () => {
    const index = _afterEachHooks.indexOf(hook)
    if (index > -1) _afterEachHooks.splice(index, 1)
  }
}

/**
 * Get the current route.
 *
 * @returns {Route|null}
 */
export function getCurrentRoute() {
  return _currentRoute
}

/**
 * Get the previous route.
 *
 * @returns {Route|null}
 */
export function getPreviousRoute() {
  return _previousRoute
}

/**
 * Check if navigation is in progress.
 *
 * @returns {boolean}
 */
export function isNavigating() {
  return _isNavigating
}

/**
 * Cancel current navigation (if in progress).
 */
export function cancelNavigation() {
  if (_cancelNavigation) {
    _cancelNavigation()
  }
}

/**
 * Programmatically navigate to a path.
 *
 * @param {string} path - Target path
 * @param {object} [options] - Navigation options
 * @param {boolean} [options.replace=false] - Replace current history entry
 * @param {boolean} [options.reload=true] - Reload the page
 */
export function navigate(path, options = {}) {
  const { replace = false, reload = true } = options

  if (replace) {
    window.location.replace(path)
  } else {
    window.location.href = path
  }
}

/**
 * Push a new history entry.
 *
 * @param {string} path - Target path
 */
export function push(path) {
  navigate(path, { replace: false })
}

/**
 * Replace current history entry.
 *
 * @param {string} path - Target path
 */
export function replace(path) {
  navigate(path, { replace: true })
}

/**
 * Go back in history.
 */
export function back() {
  window.history.back()
}

/**
 * Go forward in history.
 */
export function forward() {
  window.history.forward()
}

/**
 * Go n steps in history.
 *
 * @param {number} n - Steps to go (negative for back)
 */
export function go(n) {
  window.history.go(n)
}

/**
 * Router singleton with guard methods.
 */
export const router = {
  beforeEach,
  afterEach,
  get currentRoute() { return getCurrentRoute() },
  get previousRoute() { return getPreviousRoute() },
  get isNavigating() { return isNavigating() },
  cancel: cancelNavigation,
  push,
  replace,
  back,
  forward,
  go,
  navigate
}

/**
 * Injects SSG-compatible path variants for a route:
 * trailing slash, .html suffix, /index.html suffix.
 *
 * @param {object} route
 * @param {string} path
 * @returns {object}
 */
function injectSystemRoutes(route, path) {
  if (path === '/') {
    if (!route.path.includes('/index.html')) route.path.push('/index.html')
  } else {
    if (!route.path.includes(`${path}.html`)) route.path.push(`${path}.html`)
    if (!route.path.includes(`${path}/`)) route.path.push(`${path}/`)
    if (!route.path.includes(`${path}/index.html`)) route.path.push(`${path}/index.html`)
  }

  return route
}
