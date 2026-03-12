/**
 * @module FileRouter
 *
 * File-based routing with dynamic route parameter support.
 *
 * Convention (mirrors Nuxt/Next.js):
 *   File: pages/index/Index.js        → URL: /
 *   File: pages/about/About.js        → URL: /about
 *   File: pages/blog/post/Post.js     → URL: /blog/post
 *
 * Dynamic Routes:
 *   File: pages/user/[id]/User.js              → URL: /user/:id
 *   File: pages/product/[category]/[slug].js   → URL: /product/:category/:slug
 *   File: pages/docs/[...path].js              → URL: /docs/:path(.*)
 *
 * Optional Parameters:
 *   File: pages/blog/[id]/[slug]?/Blog.js      → URL: /blog/:id/:slug?
 *
 * Catch-all Routes:
 *   File: pages/[...404].js                    → URL: /:path(.*)
 */

/**
 * Pattern types for route segments.
 */
const PATTERNS = {
  // [param] → required parameter
  PARAM: /^\[([^?]+)\]$/,
  // [param]? → optional parameter
  OPTIONAL: /^\[([^?]+)\?\]$/,
  // [...param] → catch-all parameter
  CATCH_ALL: /^\.\.\.(.*)$/,
  // Regular segment
  NORMAL: /^[^\[]+$/
}

/**
 * Converts a file path segment to a route pattern segment.
 *
 * @param {string} segment - Path segment (e.g., [id], about, [...slug])
 * @returns {string} Route pattern segment (e.g., :id, about, :slug(.*))
 */
function segmentToPattern(segment) {
  // Check for catch-all [...something]
  const insideBrackets = segment.match(/^\[(.+)\]$/)
  if (insideBrackets) {
    const content = insideBrackets[1]

    // Check for spread: [...param]
    if (content.startsWith('...')) {
      const paramName = content.slice(3) || 'path'
      return `:${paramName}(.*)`
    }

    // Check for optional: [param?]
    if (content.endsWith('?')) {
      const paramName = content.slice(0, -1)
      return `:${paramName}?`
    }

    // Regular parameter: [param]
    return `:${content}`
  }

  // Normal segment
  return segment
}

/**
 * Checks if a segment is a dynamic parameter.
 *
 * @param {string} segment - Path segment
 * @returns {boolean}
 */
function isDynamicSegment(segment) {
  return segment.startsWith('[') && segment.endsWith(']')
}

/**
 * Checks if a segment is an optional parameter.
 *
 * @param {string} segment - Path segment
 * @returns {boolean}
 */
function isOptionalSegment(segment) {
  return segment.startsWith('[') && segment.endsWith('?]')
}

/**
 * Extracts parameter names from a file path.
 *
 * @param {string} filePath - Relative file path
 * @returns {string[]} Parameter names in order
 */
function extractParamNames(filePath) {
  const params = []
  const parts = filePath.split('/')

  for (const part of parts) {
    const match = part.match(/^\[([^?\]]+)\??\]$|^\[\.\.\.([^\]]+)\]$/)
    if (match) {
      params.push(match[1] || match[2] || 'path')
    }
  }

  return params
}

/**
 * Derives a URL path from an import.meta.glob key.
 *
 * Convention (mirrors Nuxt/Next.js file-based routing):
 *   Key: ./pages/index/Index.js     → URL: /
 *   Key: ./pages/about/About.js     → URL: /about
 *   Key: ./pages/about/bla/Bla.js   → URL: /about/bla
 *   Key: ./pages/user/[id]/User.js  → URL: /user/:id
 *   Key: ./pages/[...404].js        → URL: /:path(.*)
 *
 * Rule: the *directory* path relative to pages/ becomes the URL.
 * A top-level directory named 'index' maps to '/'.
 * Dynamic segments use [param] syntax and become route parameters.
 *
 * @param {string} key - import.meta.glob key, e.g. './pages/about/About.js'
 * @returns {string} URL pattern
 */
function pathFromKey(key) {
  // Strip leading './' and 'pages/' prefix
  const rel = key.replace(/^\.\/pages\//, '')
  // Get all segments
  const parts = rel.split('/')
  // Remove filename (last segment)
  parts.pop()

  if (parts.length === 0) {
    return '/'
  }

  // Check for single 'index'
  if (parts.length === 1 && parts[0] === 'index') {
    return '/'
  }

  // Convert segments to route patterns
  const routeParts = parts.map(segmentToPattern)

  return '/' + routeParts.join('/')
}

/**
 * Builds a display path for documentation (without parameter syntax).
 *
 * @param {string} pattern - Route pattern like '/user/:id'
 * @returns {string} Display path like '/user/[id]'
 */
function patternToDisplay(pattern) {
  return pattern
    .replace(/:([^/(]+)\?/g, '[$1?]')
    .replace(/:\(([^)]+)\)/g, '[]')
    .replace(/:([^/(]+)(?:\([^)]*\))?/g, '[$1]')
}

/**
 * Builds a regex pattern string from a route path.
 *
 * Supports:
 * - Static segments: /about
 * - Required params: /user/:id
 * - Optional params: /user/:id?
 * - Catch-all: /docs/:path(.*)
 *
 * @param {string} path - Route path pattern
 * @returns {string} Regex pattern string
 */
function buildRegexPattern(path) {
  // Escape forward slashes
  let pattern = path.replace(/\//g, '\\/')

  // Replace catch-all :name(.*) → capture everything
  pattern = pattern.replace(/:([^/(]+)\(\.\*\)/g, '([^/]+(?:/[^/]+)*)')

  // Replace optional params :name? → optional capture
  pattern = pattern.replace(/:([^/(]+)\?/g, '(?:\\/([^/]+))?')

  // Replace required params :name → capture
  pattern = pattern.replace(/:([^/(\s]+)/g, '([^/]+)')

  return '^' + pattern + '$'
}

/**
 * Matches a URL path against a route pattern.
 *
 * @param {string} pattern - Route pattern (e.g., '/user/:id')
 * @param {string} path - URL path (e.g., '/user/123')
 * @returns {object|null} Matched params or null
 */
export function matchRoute(pattern, path) {
  // Extract parameter names
  const paramNames = []
  const paramRegex = /:([^/?(]+)/g
  let match
  while ((match = paramRegex.exec(pattern)) !== null) {
    paramNames.push(match[1])
  }

  // Build regex pattern
  const regexPattern = buildRegexPattern(pattern)
  const regex = new RegExp(regexPattern)

  const matches = path.match(regex)
  if (!matches) {
    return null
  }

  // Extract parameter values
  const params = {}
  for (let i = 0; i < paramNames.length; i++) {
    if (matches[i + 1] !== undefined) {
      params[paramNames[i]] = matches[i + 1]
    }
  }

  return { params, pattern }
}

/**
 * Checks if a route path is dynamic.
 *
 * @param {string} path - Route path
 * @returns {boolean}
 */
export function isDynamicRoute(path) {
  return path.includes(':')
}

/**
 * Extracts the page component from an eagerly-imported module.
 * Prefers default export, falls back to the first function/class export.
 *
 * @param {object} mod - Eagerly imported module
 * @param {string} key - Glob key (for error messages)
 * @returns {Function}
 */
function componentFromModule(mod, key) {
  if (typeof mod.default === 'function') return mod.default
  const named = Object.values(mod).find(v => typeof v === 'function')
  if (!named) throw new Error(`[metaowl] No component export found in "${key}"`)
  return named
}

/**
 * Builds a metaowl route table from an import.meta.glob result.
 *
 * @param {Record<string, object>} modules - Result of import.meta.glob with eager: true
 * @returns {object[]} Route table for processRoutes()
 */
export function buildRoutes(modules) {
  const routes = []

  for (const [key, mod] of Object.entries(modules)) {
    const path = pathFromKey(key)
    const name = path === '/' ? 'index' : path.slice(1).replace(/[^a-zA-Z0-9]/g, '-')
    const component = componentFromModule(mod, key)
    const params = extractParamNames(key)

    const route = {
      name,
      path: [path],
      component,
      params,
      meta: component.route?.meta || {}
    }

    // Copy any route configuration from component
    if (component.route) {
      Object.assign(route, component.route)
    }

    routes.push(route)
  }

  // Sort routes: static routes first, then dynamic, then catch-all
  routes.sort((a, b) => {
    const aPath = a.path[0]
    const bPath = b.path[0]

    // Static routes come first
    const aIsDynamic = isDynamicRoute(aPath)
    const bIsDynamic = isDynamicRoute(bPath)

    if (!aIsDynamic && bIsDynamic) return -1
    if (aIsDynamic && !bIsDynamic) return 1

    // Among dynamic routes, fewer params come first
    if (aIsDynamic && bIsDynamic) {
      const aParamCount = a.params?.length || 0
      const bParamCount = b.params?.length || 0
      return aParamCount - bParamCount
    }

    return 0
  })

  return routes
}

/**
 * Finds a matching route for a given URL path.
 *
 * @param {object[]} routes - Route table
 * @param {string} path - URL path
 * @returns {object|null} Matched route with params
 */
export function findRoute(routes, path) {
  for (const route of routes) {
    for (const routePath of route.path) {
      const match = matchRoute(routePath, path)
      if (match) {
        return {
          ...route,
          matchedPath: routePath,
          params: match.params
        }
      }
    }
  }
  return null
}

/**
 * Generates URL from route name and params.
 *
 * @param {string} name - Route name
 * @param {object} [params] - Route parameters
 * @returns {string} Generated URL
 * @throws {Error} If route not found
 *
 * Example:
 *   generateUrl(routes, 'user', { id: '123' }) // returns '/user/123'
 *   generateUrl(routes, 'blog-post', { category: 'tech', slug: 'hello' }) // returns '/blog/tech/hello'
 */
export function generateUrl(routes, name, params = {}) {
  const route = routes.find(r => r.name === name)
  if (!route) {
    throw new Error(`[metaowl] Route "${name}" not found`)
  }

  let path = route.path[0]

  // Replace params in path
  for (const [key, value] of Object.entries(params)) {
    path = path.replace(`:${key}`, value)
    path = path.replace(`:${key}?`, value)
  }

  // Remove remaining optional params
  path = path.replace(/\/:[^/?]+\?/g, '')

  return path
}

/**
 * Validates route parameters.
 *
 * @param {object} route - Route definition
 * @param {object} params - Parameters to validate
 * @returns {object} Validation result { valid: boolean, missing: string[], extra: string[] }
 */
export function validateRouteParams(route, params) {
  const required = route.params || []
  const provided = Object.keys(params)

  const missing = required.filter(p => !provided.includes(p))
  const extra = provided.filter(p => !required.includes(p))

  return {
    valid: missing.length === 0,
    missing,
    extra
  }
}

/**
 * Parses current URL and returns route info.
 *
 * @param {object[]} routes - Route table
 * @returns {object|null} Current route info
 */
export function parseCurrentRoute(routes) {
  const path = document.location.pathname
  return findRoute(routes, path)
}

/**
 * Route configuration helper for components.
 *
 * @param {object} config - Route configuration
 * @param {string} [config.path] - Route path override
 * @param {object} [config.meta] - Route metadata
 * @param {Function} [config.beforeEnter] - Per-route guard
 * @returns {object} Route configuration
 *
 * Example in a component file:
 *   export class UserPage extends Component {
 *     static route = defineRoute({
 *       path: '/custom/:id',
 *       meta: { requiresAuth: true },
 *       beforeEnter: (to, from, next) => { ... }
 *     })
 *   }
 */
export function defineRoute(config) {
  return config
}

/**
 * Route decorator (works with class decorator syntax).
 *
 * @param {object} config - Route configuration
 * @returns {Function} Class decorator
 *
 * Example:
 *   @route({ meta: { requiresAuth: true } })
 *   export class UserPage extends Component {
 *     // ...
 *   }
 */
export function route(config) {
  return function decorator(ComponentClass) {
    ComponentClass.route = config
    return ComponentClass
  }
}

/**
 * Helper to create a catch-all route.
 *
 * @param {Function} component - 404 component
 * @param {object} [options] - Additional options
 * @returns {object} Catch-all route definition
 */
export function createCatchAllRoute(component, options = {}) {
  return {
    name: options.name || '404',
    path: ['/:path(.*)'],
    component,
    params: ['path'],
    meta: { ...options.meta, catchAll: true }
  }
}

/**
 * Helper to create a redirect route.
 *
 * @param {string} from - From path
 * @param {string} to - To path (can contain params)
 * @returns {object} Redirect route definition
 */
export function createRedirectRoute(from, to) {
  return {
    name: `redirect-${from.replace(/[^a-zA-Z0-9]/g, '-')}`,
    path: [from],
    redirect: to,
    component: null
  }
}
