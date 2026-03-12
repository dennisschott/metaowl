import { mountApp } from './modules/app-mounter.js'
import { buildRoutes } from './modules/file-router.js'
import { processRoutes } from './modules/router.js'
import { discoverLayouts } from './modules/layouts.js'

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
  push,
  replace,
  back,
  forward,
  go,
  router
} from './modules/router.js'
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
 */
export async function boot(routesOrModules = {}, layoutsOrModules = null) {
  // Auto-discover layouts
  try {
    if (layoutsOrModules) {
      // Use layouts provided by Vite plugin transformation
      const { buildLayouts, setDefaultLayout } = await import('./modules/layouts.js')
      buildLayouts(layoutsOrModules)
      setDefaultLayout('default')
    } else {
      await discoverLayouts()
    }
  } catch (e) {
    console.warn('[metaowl] Could not auto-discover layouts:', e.message)
  }

  const routes = Array.isArray(routesOrModules)
    ? routesOrModules
    : buildRoutes(routesOrModules)
  const route = await processRoutes(routes)
  await mountApp(route)
}
