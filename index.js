import { mountApp } from './modules/app-mounter.js'
import { buildRoutes } from './modules/file-router.js'
import { processRoutes, setSpaMode, _setSpaNavigationCallback } from './modules/router.js'
import { discoverLayouts, buildLayouts, setDefaultLayout } from './modules/layouts.js'

export { default as Fetch } from './modules/fetch.js'
export { default as Cache } from './modules/cache.js'
export { configureOwl } from './modules/app-mounter.js'
export * as Meta from './modules/meta.js'
export { buildRoutes }
export { Store, createPersistencePlugin, createStore } from './modules/store.js'
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
} from './modules/layouts.js'
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
} from './modules/router.js'
export { Link, registerLinkTemplate } from './modules/link.js'
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
} from './modules/file-router.js'
export {
  onError,
  setErrorContext,
  getErrorContext,
  clearErrorContext,
  captureError,
  initGlobalErrorHandling,
  errorBoundary
} from './modules/error-boundary.js'
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
} from './modules/i18n.js'
export {
  useForm,
  validators,
  createSchema,
  fieldProps
} from './modules/forms.js'
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
} from './modules/odoo-rpc.js'
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
} from './modules/composables.js'
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
} from './modules/test-utils.js'
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
} from './modules/seo.js'
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
} from './modules/pwa.js'

/**
 * Global routes reference for SPA navigation.
 * @type {object[]|null}
 */
let _appRoutes = null

/**
 * Monotonically-increasing navigation counter.
 * Incremented on every navigation attempt; lets us discard stale navigations
 * that complete AFTER a newer one was already triggered.
 * @type {number}
 */
let _navSeq = 0

/**
 * Promise of the currently-running mountApp call.
 * Used to serialize mounts: a new navigation waits for the in-progress mount
 * to finish, then checks if it is still the latest before mounting itself.
 * This prevents concurrent OWL App instances on the same element.
 * @type {Promise<void>|null}
 */
let _mountingPromise = null

function _handle404() {
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

/**
 * SPA navigation callback.
 * Called when navigateTo() is used.
 *
 * @param {string} path - The target path
 * @returns {Promise<void>}
 */
async function _spaNavigate(path) {
  if (!_appRoutes) {
    console.error('[metaowl] Routes not available for SPA navigation')
    return
  }

  const seq = ++_navSeq

  let route
  try {
    route = await processRoutes(_appRoutes, path)
  } catch (error) {
    if (seq !== _navSeq) return
    if (error.message && error.message.startsWith('No route found')) {
      console.warn('[metaowl]', error.message)
      _handle404()
    } else {
      throw error
    }
    return
  }

  // Bail early if a newer navigation overtook us while processRoutes was running
  if (seq !== _navSeq || !route) return

  // Wait for any in-progress mount to finish before starting our own.
  // This is the key serialization: it ensures only one OWL App mounts at a time.
  if (_mountingPromise) {
    await _mountingPromise.catch(() => {})
    // After waiting, check again — a newer navigation may have started
    if (seq !== _navSeq) return
  }

  // Claim the mount slot
  _mountingPromise = mountApp(route)
  try {
    await _mountingPromise
  } finally {
    _mountingPromise = null
  }
}

/**
 * Boots the metaowl application.
 *
 * When called without arguments inside a Vite project, the `metaowl:app`
 * plugin transform automatically rewrites `boot()` to
 * `boot(import.meta.glob('./pages/**\/*.js', { eager: true }))` at build time.
 *
 * Can also be called explicitly with:
 *   - An import.meta.glob result (file-based routing):
 *       boot(import.meta.glob('./pages/**\/*.js', { eager: true }))
 *   - A manual route array:
 *       boot([{ name: 'index', path: ['/'], component: IndexPage }])
 *
 * @param {Record<string, object>|object[]} [routesOrModules]
 * @param {object} [options] - Boot options
 * @param {boolean} [options.spa=true] - Enable SPA navigation mode
 */
export async function boot(routesOrModules = {}, layoutsOrModules = null, options = {}) {
  const { spa = true } = options

  // Auto-discover layouts
  try {
    if (layoutsOrModules && typeof layoutsOrModules === 'object' && !Array.isArray(layoutsOrModules)) {
      // Use layouts provided by Vite plugin transformation
      buildLayouts(layoutsOrModules)
      setDefaultLayout('default')
    } else if (typeof layoutsOrModules === 'object' && layoutsOrModules?.spa !== undefined) {
      // Options object passed as second argument
      Object.assign(options, layoutsOrModules)
    } else {
      await discoverLayouts()
    }
  } catch (e) {
    console.warn('[metaowl] Could not auto-discover layouts:', e.message)
  }

  const routes = Array.isArray(routesOrModules)
    ? routesOrModules
    : buildRoutes(routesOrModules)

  // Store routes for SPA navigation
  _appRoutes = routes

  // Enable SPA mode
  if (spa) {
    setSpaMode(true)
    _setSpaNavigationCallback(_spaNavigate)

    // Register global navigateTo handler for Link component
    window.__metaowlNavigate = _spaNavigate

    // Listen to PopState events (Browser Back/Forward)
    window.addEventListener('popstate', (event) => {
      const path = document.location.pathname
      _spaNavigate(path)
    })
  }

  let route
  try {
    route = await processRoutes(routes)
  } catch (error) {
    if (error.message && error.message.startsWith('No route found')) {
      console.warn('[metaowl]', error.message)
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
      return
    }
    throw error
  }

  await mountApp(route)
}
