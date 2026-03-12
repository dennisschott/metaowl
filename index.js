import { mountApp } from './modules/app-mounter.js'
import { buildRoutes } from './modules/file-router.js'

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
export async function boot(routesOrModules = {}) {
  const routes = Array.isArray(routesOrModules)
    ? routesOrModules
    : buildRoutes(routesOrModules)
  const route = await processRoutes(routes)
  await mountApp(route)
}
