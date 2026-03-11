import type { Route, RouteTable } from '../types.js'

/**
 * Resolves the current URL against a route table.
 * Used internally by processRoutes().
 */
class Router {
  private routes: RouteTable

  constructor(routes: RouteTable) {
    this.routes = routes
  }

  resolve(): RouteTable {
    const match = this.routes.filter(route =>
      (typeof route.path === 'string' && document.location.pathname === route.path) ||
      (Array.isArray(route.path) && route.path.includes(document.location.pathname))
    )

    if (match.length !== 1) {
      throw new Error(`No route found for "${document.location.pathname}".`)
    }

    return match
  }
}

/**
 * Injects SSG-compatible path variants for a route:
 * trailing slash, .html suffix, /index.html suffix.
 *
 * @param route - The route to modify
 * @param path - The path to inject variants for
 * @returns The modified route
 */
function injectSystemRoutes(route: Route, path: string): Route {
  if (path === '/') {
    if (!route.path.includes('/index.html')) route.path.push('/index.html')
  } else {
    if (!route.path.includes(`${path}.html`)) route.path.push(`${path}.html`)
    if (!route.path.includes(`${path}/`)) route.path.push(`${path}/`)
    if (!route.path.includes(`${path}/index.html`)) route.path.push(`${path}/index.html`)
  }

  return route
}

/**
 * Expands all routes with SSG path variants, then resolves the current URL.
 *
 * @param routes - The route table
 * @returns The matched route(s)
 */
export async function processRoutes(routes: RouteTable): Promise<RouteTable> {
  for (const route of routes) {
    const originalPaths = [...route.path]
    for (const path of originalPaths) {
      if (typeof path === 'string') {
        injectSystemRoutes(route, path)
      }
    }
  }

  return new Router(routes).resolve()
}
