/**
 * @module Router
 *
 * Enhanced router with navigation guards support.
 */

import { buildSimpleRoutePattern, type OwlComponent } from './constants.js'

type QueryValue = string | string[]

export interface RouteDefinition {
  name: string
  path: string[]
  component: OwlComponent | null
  meta?: Record<string, unknown>
  beforeEnter?: NavigationGuard | null
  [key: string]: unknown
}

export interface RouteState {
  name: string
  path: string[]
  fullPath: string
  component: OwlComponent | null
  meta: Record<string, unknown>
  beforeEnter?: NavigationGuard | null
  params: Record<string, string>
  query: Record<string, QueryValue>
}

type NavigationResult = void | boolean | string | { path: string; replace?: boolean } | Error
type NavigationCallback = (path: string) => Promise<unknown>
export type NavigationGuard = (
  to: RouteState,
  from: RouteState | null,
  next: (result?: NavigationResult) => void
) => NavigationResult | Promise<NavigationResult>
type AfterEachHook = (to: RouteState, from: RouteState | null) => void

let currentRoute: RouteState | null = null
let previousRoute: RouteState | null = null
const beforeEachGuards: NavigationGuard[] = []
const afterEachHooks: AfterEachHook[] = []
let navigating = false
let cancelCurrentNavigation: (() => void) | null = null
let spaNavigationCallback: NavigationCallback | null = null
let spaEnabled = false

class Router {
  routes: RouteDefinition[]
  routeMap: Map<string, RouteDefinition>

  constructor(routes: RouteDefinition[]) {
    this.routes = routes
    this.routeMap = new Map()

    for (const route of routes) {
      for (const path of route.path) {
        this.routeMap.set(path, route)
      }
    }
  }

  resolve(path?: string): RouteDefinition | null {
    const currentPath = path || document.location.pathname

    if (this.routeMap.has(currentPath)) {
      return this.routeMap.get(currentPath) || null
    }

    for (const route of this.routes) {
      if (this.matchRoute(route, currentPath)) {
        return route
      }
    }

    return null
  }

  matchRoute(route: RouteDefinition, path: string): boolean {
    for (const routePath of route.path) {
      if (this.pathMatches(routePath, path)) {
        return true
      }
    }
    return false
  }

  pathMatches(routePath: string, currentPath: string): boolean {
    if (!routePath.includes(':') && !routePath.includes('*')) {
      const normalizedRoute = (routePath.replace(/\/$/, '') || '/')
      const normalizedCurrent = (currentPath.replace(/\/$/, '') || '/')
      return normalizedRoute === normalizedCurrent
    }

    const pattern = buildSimpleRoutePattern(routePath)
    return new RegExp(pattern).test(currentPath)
  }

  extractParams(route: RouteDefinition, path: string): Record<string, string> {
    const params: Record<string, string> = {}

    for (const routePath of route.path) {
      const match = this.matchAndExtract(routePath, path)
      if (match) {
        Object.assign(params, match)
      }
    }

    return params
  }

  matchAndExtract(routePath: string, currentPath: string): Record<string, string> | null {
    if (!routePath.includes(':')) {
      return null
    }

    const paramNames: string[] = []

    const pattern = routePath
      .replace(/:([^/(]+)\(\.\*\)/g, (_match, name: string) => {
        paramNames.push(name)
        return '(.*)'
      })
      .replace(/\/:([^/(]+)\?/g, (_match, name: string) => {
        paramNames.push(name)
        return '(?:/([^/]+))?'
      })
      .replace(/:([^/(?\s]+)/g, (_match, name: string) => {
        paramNames.push(name)
        return '([^/]+)'
      })

    const matches = currentPath.match(new RegExp('^' + pattern + '$'))
    if (!matches) return null

    const params: Record<string, string> = {}
    for (let index = 0; index < paramNames.length; index++) {
      const value = matches[index + 1]
      if (value !== undefined) {
        params[paramNames[index] as string] = value
      }
    }

    return params
  }
}

const injectedRouteSets = new WeakSet<RouteDefinition[]>()

export async function processRoutes(routes: RouteDefinition[], customPath?: string): Promise<RouteDefinition[] | null> {
  const targetPath = customPath || document.location.pathname

  if (!injectedRouteSets.has(routes)) {
    injectedRouteSets.add(routes)
    for (const route of routes) {
      const originalPaths = [...route.path]
      for (const path of originalPaths) {
        if (typeof path === 'string') {
          injectSystemRoutes(route, path)
        }
      }
    }
  }

  const routerInstance = new Router(routes)
  const toRoute = routerInstance.resolve(targetPath)

  if (!toRoute) {
    throw new Error(`No route found for "${targetPath}".`)
  }

  const to = buildRouteObject(toRoute, routerInstance)
  const from = currentRoute

  try {
    await runGuards(to, from)

    previousRoute = currentRoute
    currentRoute = to

    for (const hook of afterEachHooks) {
      hook(to, from)
    }

    return [toRoute]
  } catch (error) {
    if (isNavigationRedirect(error) && error.path) {
      window.location.href = error.path
      return null
    }
    throw error
  }
}

function buildRouteObject(routeDef: RouteDefinition, routerInstance: Router): RouteState {
  const currentPath = document.location.pathname
  const params = routerInstance.extractParams(routeDef, currentPath)

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

function parseQuery(search: string): Record<string, QueryValue> {
  const query: Record<string, QueryValue> = {}
  if (!search || search === '?') return query

  const params = new URLSearchParams(search.substring(1))
  for (const [key, value] of params) {
    const existing = query[key]
    if (existing) {
      if (Array.isArray(existing)) {
        existing.push(value)
      } else {
        query[key] = [existing, value]
      }
    } else {
      query[key] = value
    }
  }

  return query
}

async function runGuards(to: RouteState, from: RouteState | null): Promise<void> {
  navigating = true

  let cancelled = false
  cancelCurrentNavigation = () => {
    cancelled = true
  }

  try {
    for (const guard of beforeEachGuards) {
      if (cancelled) break

      const result = await runGuard(guard, to, from)

      if (result === false) {
        throw new NavigationCancelled()
      }

      if (typeof result === 'string') {
        throw new NavigationRedirect(result)
      }

      if (result && typeof result === 'object' && 'path' in result && typeof result.path === 'string') {
        throw new NavigationRedirect(result.path)
      }
    }

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
    navigating = false
    cancelCurrentNavigation = null
  }
}

async function runGuard(
  guard: NavigationGuard,
  to: RouteState,
  from: RouteState | null
): Promise<NavigationResult> {
  return await new Promise<NavigationResult>((resolve, reject) => {
    const next = (result?: NavigationResult): void => {
      if (result instanceof Error) {
        reject(result)
      } else {
        resolve(result)
      }
    }

    try {
      const guardResult = guard(to, from, next)

      if (guardResult && typeof (guardResult as Promise<NavigationResult>).then === 'function') {
        ;(guardResult as Promise<NavigationResult>).then(resolve).catch(reject)
      } else if (guardResult !== undefined) {
        resolve(guardResult)
      }
    } catch (error) {
      reject(error)
    }
  })
}

export function resetRouter(): void {
  beforeEachGuards.length = 0
  afterEachHooks.length = 0
  navigating = false
  cancelCurrentNavigation = null
  currentRoute = null
  previousRoute = null
  spaNavigationCallback = null
  spaEnabled = false
}

class NavigationCancelled extends Error {
  constructor() {
    super('Navigation cancelled')
    this.name = 'NavigationCancelled'
  }
}

class NavigationRedirect extends Error {
  path: string

  constructor(path: string) {
    super('Navigation redirect')
    this.name = 'NavigationRedirect'
    this.path = path
  }
}

function isNavigationRedirect(error: unknown): error is NavigationRedirect {
  return error instanceof Error && error.name === 'NavigationRedirect' && 'path' in error
}

export function beforeEach(guard: NavigationGuard): () => void {
  beforeEachGuards.push(guard)
  return () => {
    const index = beforeEachGuards.indexOf(guard)
    if (index > -1) beforeEachGuards.splice(index, 1)
  }
}

export function afterEach(hook: AfterEachHook): () => void {
  afterEachHooks.push(hook)
  return () => {
    const index = afterEachHooks.indexOf(hook)
    if (index > -1) afterEachHooks.splice(index, 1)
  }
}

export function getCurrentRoute(): RouteState | null {
  return currentRoute
}

export function getPreviousRoute(): RouteState | null {
  return previousRoute
}

export function isNavigating(): boolean {
  return navigating
}

export function cancelNavigation(): void {
  if (cancelCurrentNavigation) {
    cancelCurrentNavigation()
  }
}

export function _setSpaNavigationCallback(callback: NavigationCallback): void {
  spaNavigationCallback = callback
}

export function setSpaMode(enabled: boolean): void {
  spaEnabled = enabled
}

export function isSpaMode(): boolean {
  return spaEnabled
}

export async function navigateTo(path: string, options: { replace?: boolean } = {}): Promise<boolean> {
  const { replace = false } = options

  if (!spaEnabled || !spaNavigationCallback) {
    if (replace) {
      window.location.replace(path)
    } else {
      window.location.href = path
    }
    return false
  }

  try {
    if (replace) {
      window.history.replaceState({ path }, '', path)
    } else {
      window.history.pushState({ path }, '', path)
    }

    await spaNavigationCallback(path)
    return true
  } catch (error) {
    console.error('[metaowl] SPA navigation failed:', error)
    window.location.href = path
    return false
  }
}

export function navigate(path: string, options: { replace?: boolean; reload?: boolean } = {}): void {
  const { replace = false, reload = true } = options

  if (reload || !spaEnabled) {
    if (replace) {
      window.location.replace(path)
    } else {
      window.location.href = path
    }
  } else {
    void navigateTo(path, { replace })
  }
}

export function push(path: string): void {
  void navigateTo(path, { replace: false })
}

export function replace(path: string): void {
  void navigateTo(path, { replace: true })
}

export function back(): void {
  window.history.back()
}

export function forward(): void {
  window.history.forward()
}

export function go(n: number): void {
  window.history.go(n)
}

export const router = {
  beforeEach,
  afterEach,
  get currentRoute(): RouteState | null { return getCurrentRoute() },
  get previousRoute(): RouteState | null { return getPreviousRoute() },
  get isNavigating(): boolean { return isNavigating() },
  cancel: cancelNavigation,
  push,
  replace,
  back,
  forward,
  go,
  navigate,
  navigateTo,
  setSpaMode,
  isSpaMode
}

function injectSystemRoutes(route: RouteDefinition, path: string): RouteDefinition {
  if (path === '/') {
    if (!route.path.includes('/index.html')) route.path.push('/index.html')
  } else {
    if (!route.path.includes(`${path}.html`)) route.path.push(`${path}.html`)
    if (!route.path.includes(`${path}/`)) route.path.push(`${path}/`)
    if (!route.path.includes(`${path}/index.html`)) route.path.push(`${path}/index.html`)
  }

  return route
}