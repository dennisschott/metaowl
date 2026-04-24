import { mountApp, configureOwl } from './modules/app-mounter.js'
import {
  buildLayouts,
  clearLayouts,
  createLayoutWrapper,
  defineLayout,
  discoverLayouts,
  getCurrentLayout,
  getDefaultLayout,
  getLayout,
  getLayoutNames,
  getRouteLayout,
  hasLayout,
  layout,
  mountWithLayout,
  registerLayout,
  resolveLayout,
  setDefaultLayout,
  setRouteLayout,
  subscribeToLayouts,
  unregisterLayout
} from './modules/layouts.js'
import {
  afterEach,
  _setSpaNavigationCallback,
  back,
  beforeEach,
  cancelNavigation,
  forward,
  getCurrentRoute,
  getPreviousRoute,
  go,
  isNavigating,
  isSpaMode,
  navigate,
  navigateTo,
  processRoutes,
  push,
  replace,
  router,
  setSpaMode,
  type RouteDefinition
} from './modules/router.js'
import { Link, registerLinkTemplate } from './modules/link.js'
import {
  buildRoutes,
  createCatchAllRoute,
  createRedirectRoute,
  defineRoute,
  findRoute,
  generateUrl,
  isDynamicRoute,
  matchRoute,
  route,
  validateRouteParams
} from './modules/file-router.js'
import {
  captureError,
  clearErrorContext,
  errorBoundary,
  getErrorContext,
  initGlobalErrorHandling,
  onError,
  setErrorContext
} from './modules/error-boundary.js'
import {
  configureI18n,
  createNamespacedT,
  formatCurrency,
  formatDate,
  formatNumber,
  formatRelativeTime,
  getLocale,
  i18n,
  loadLocaleMessages,
  setLocale,
  t
} from './modules/i18n.js'
import { createSchema, fieldProps, useForm, validators } from './modules/forms.js'
import {
  authenticate,
  call,
  configure,
  create,
  getSession,
  isAuthenticated,
  listDatabases,
  logout,
  OdooService,
  onAuthChange,
  read,
  searchCount,
  searchRead,
  unlink,
  versionInfo,
  write
} from './modules/odoo-rpc.js'
import {
  Composables,
  useAsyncState,
  useAuth,
  useCache,
  useDebounce,
  useFetch,
  useLocalStorage,
  useOnlineStatus,
  useThrottle,
  useWindowSize
} from './modules/composables.js'
import {
  createMockStore,
  dom,
  flushPromises,
  mockRouter,
  mountComponent,
  nextTick,
  TestUtils,
  userEvent,
  wait
} from './modules/test-utils.js'
import {
  createCanonicalUrl,
  generateOpenGraph,
  generateRobotsTxt,
  generateSitemap,
  generateSitemapIndex,
  generateTwitterCard,
  getPriorityByDepth,
  jsonLd,
  SEO,
  validateSitemap
} from './modules/seo.js'
import {
  cache,
  checkCapabilities,
  generateManifest,
  getStorageInfo,
  isOnline,
  isStandalone,
  PWA,
  registerServiceWorker,
  requestPersistentStorage,
  showNotification,
  subscribeToConnectivity,
  subscribeToPush,
  sync,
  unregisterServiceWorker,
  unsubscribeFromPush
} from './modules/pwa.js'
import Cache from './modules/cache.js'
import Fetch from './modules/fetch.js'
import * as Meta from './modules/meta.js'
import { Store, createPersistencePlugin, createStore } from './modules/store.js'

type ModuleMap = Record<string, unknown>
type BootOptions = {
  spa?: boolean
} & Record<string, unknown>

let appRoutes: RouteDefinition[] | null = null
let navSeq = 0
let mountingPromise: Promise<void> | null = null

function handle404(): void {
  const el = document.getElementById('metaowl')
  if (el) {
    el.innerHTML = [
      '<div style="font-family:sans-serif;padding:3rem;text-align:center">',
      '<h1 style="font-size:4rem;font-weight:700;margin:0;color:#6b7280">404</h1>',
      '<p style="font-size:1.25rem;color:#9ca3af;margin-top:0.5rem">Page not found</p>',
      '<p style="margin-top:2rem"><a href="/" style="color:#3b82f6;text-decoration:none">← Go home</a></p>',
      '</div>'
    ].join('')
  }
}

function isNoRouteFoundError(error: unknown): error is Error {
  return error instanceof Error && error.message.startsWith('No route found')
}

function isBootOptions(value: unknown): value is BootOptions {
  return !!value && typeof value === 'object' && !Array.isArray(value) && 'spa' in value
}

async function spaNavigate(path: string): Promise<void> {
  if (!appRoutes) {
    console.error('[metaowl] Routes not available for SPA navigation')
    return
  }

  const seq = ++navSeq

  let resolvedRoute: RouteDefinition[] | null
  try {
    resolvedRoute = await processRoutes(appRoutes, path)
  } catch (error) {
    if (seq !== navSeq) return
    if (isNoRouteFoundError(error)) {
      console.warn('[metaowl]', error.message)
      handle404()
    } else {
      throw error
    }
    return
  }

  if (seq !== navSeq || !resolvedRoute) return

  if (mountingPromise) {
    await mountingPromise.catch(() => {})
    if (seq !== navSeq) return
  }

  mountingPromise = mountApp(resolvedRoute)
  try {
    await mountingPromise
  } finally {
    mountingPromise = null
  }
}

export async function boot(
  routesOrModules: ModuleMap | RouteDefinition[] = {},
  layoutsOrModules: ModuleMap | BootOptions | null = null,
  options: BootOptions = {}
): Promise<void> {
  const effectiveOptions: BootOptions = { ...options }
  let layoutModules: ModuleMap | null = null

  if (isBootOptions(layoutsOrModules)) {
    Object.assign(effectiveOptions, layoutsOrModules)
  } else {
    layoutModules = layoutsOrModules
  }

  const { spa = true } = effectiveOptions

  try {
    if (layoutModules && typeof layoutModules === 'object' && !Array.isArray(layoutModules)) {
      buildLayouts(layoutModules as any)
      setDefaultLayout('default')
    } else {
      await discoverLayouts()
    }
  } catch (error) {
    if (error instanceof Error) {
      console.warn('[metaowl] Could not auto-discover layouts:', error.message)
    }
  }

  const routes: RouteDefinition[] = Array.isArray(routesOrModules)
    ? routesOrModules
    : buildRoutes(routesOrModules as any) as unknown as RouteDefinition[]

  appRoutes = routes

  if (spa) {
    setSpaMode(true)
    _setSpaNavigationCallback(spaNavigate)
    window.__metaowlNavigate = spaNavigate
    window.addEventListener('popstate', () => {
      const path = document.location.pathname
      void spaNavigate(path)
    })
  }

  let resolvedRoute: RouteDefinition[] | null
  try {
    resolvedRoute = await processRoutes(routes)
  } catch (error) {
    if (isNoRouteFoundError(error)) {
      console.warn('[metaowl]', error.message)
      handle404()
      return
    }
    throw error
  }

  if (!resolvedRoute) return
  await mountApp(resolvedRoute)
}

export { Fetch, Cache, configureOwl, Meta, buildRoutes, Store, createPersistencePlugin, createStore }
export {
  registerLayout,
  unregisterLayout,
  getLayout,
  hasLayout,
  getLayoutNames,
  setDefaultLayout,
  getDefaultLayout,
  resolveLayout,
  setRouteLayout,
  getRouteLayout,
  createLayoutWrapper,
  mountWithLayout,
  getCurrentLayout,
  subscribeToLayouts,
  clearLayouts,
  layout,
  defineLayout,
  buildLayouts,
  discoverLayouts
}
export {
  processRoutes,
  beforeEach,
  afterEach,
  getCurrentRoute,
  getPreviousRoute,
  isNavigating,
  cancelNavigation,
  navigate,
  navigateTo,
  push,
  replace,
  back,
  forward,
  go,
  router,
  setSpaMode,
  isSpaMode
}
export { Link, registerLinkTemplate }
export {
  matchRoute,
  isDynamicRoute,
  findRoute,
  generateUrl,
  validateRouteParams,
  createCatchAllRoute,
  createRedirectRoute,
  defineRoute,
  route
}
export {
  onError,
  setErrorContext,
  getErrorContext,
  clearErrorContext,
  captureError,
  initGlobalErrorHandling,
  errorBoundary
}
export {
  configureI18n,
  t,
  getLocale,
  setLocale,
  i18n,
  loadLocaleMessages,
  formatDate,
  formatNumber,
  formatCurrency,
  formatRelativeTime,
  createNamespacedT
}
export { useForm, validators, createSchema, fieldProps }
export {
  OdooService,
  configure,
  authenticate,
  logout,
  searchRead,
  call,
  read,
  create,
  write,
  unlink,
  searchCount,
  listDatabases,
  versionInfo,
  isAuthenticated,
  getSession,
  onAuthChange
}
export {
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
}
export {
  createMockStore,
  mockRouter,
  mountComponent,
  wait,
  nextTick,
  flushPromises,
  userEvent,
  dom,
  TestUtils
}
export {
  generateSitemap,
  generateRobotsTxt,
  jsonLd,
  createCanonicalUrl,
  generateOpenGraph,
  generateTwitterCard,
  validateSitemap,
  getPriorityByDepth,
  generateSitemapIndex,
  SEO
}
export {
  generateManifest,
  registerServiceWorker,
  unregisterServiceWorker,
  isStandalone,
  isOnline,
  subscribeToConnectivity,
  requestPersistentStorage,
  getStorageInfo,
  sync,
  subscribeToPush,
  unsubscribeFromPush,
  showNotification,
  cache,
  checkCapabilities,
  PWA
}