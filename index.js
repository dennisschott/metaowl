import { processRoutes } from './modules/router.js'
import { mountApp } from './modules/app-mounter.js'
import { buildRoutes } from './modules/file-router.js'

export { default as Fetch } from './modules/fetch.js'
export { default as Cache } from './modules/cache.js'
export { configureOwl } from './modules/app-mounter.js'
export * as Meta from './modules/meta.js'
export { buildRoutes }

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
