/**
 * Resolves the current URL against a route table.
 * Used internally by processRoutes().
 */
class Router {
  constructor(routes) {
    this.routes = routes
  }

  resolve() {
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

/**
 * Expands all routes with SSG path variants, then resolves the current URL.
 *
 * @param {object[]} routes
 * @returns {Promise<object[]>}
 */
export async function processRoutes(routes) {
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

