import { processRoutes } from './modules/router.js'
import { mountApp } from './modules/app-mounter.js'
import { buildRoutes } from './modules/file-router.js'
import type { GlobModules, RouteTable } from './types.js'

export { default as Fetch } from './modules/fetch.js'
export { default as Cache } from './modules/cache.js'
export { configureOwl } from './modules/app-mounter.js'
export * as Meta from './modules/meta.js'
export { buildRoutes }
export type { Route, RouteTable, GlobModules, GlobModule, OwlConfig, FetchConfig, MetaConfig } from './types.js'

/**
 * Boots the metaowl application.
 *
 * When called without arguments inside a Vite project, the `metaowl:app`
 * plugin transform automatically rewrites `boot()` to
 * `boot(import.meta.glob('./pages/*\/*.js', { eager: true }))` at build time.
 *
 * Can also be called explicitly with:
 *   - An import.meta.glob result (file-based routing):
 *       boot(import.meta.glob('./pages/*\/*.js', { eager: true }))
 *   - A manual route array:
 *       boot([{ name: 'index', path: ['/'], component: IndexPage }])
 *
 * @param routesOrModules - Either a route table or glob modules
 */
export async function boot(routesOrModules: RouteTable | GlobModules = {}): Promise<void> {
  const routes: RouteTable = Array.isArray(routesOrModules)
    ? routesOrModules
    : buildRoutes(routesOrModules)
  const route = await processRoutes(routes)
  await mountApp(route)
}
