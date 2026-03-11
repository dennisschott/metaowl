/**
 * Derives a URL path from an import.meta.glob key.
 *
 * Convention (mirrors Nuxt/Next.js file-based routing):
 *   './pages/index/Index.js'     → '/'
 *   './pages/about/About.js'     → '/about'
 *   './pages/about/bla/Bla.js'  → '/about/bla'
 *
 * Rule: the *directory* path relative to pages/ becomes the URL.
 * A top-level directory named 'index' maps to '/'.
 *
 * @param {string} key - import.meta.glob key, e.g. './pages/about/About.js'
 * @returns {string} URL path
 */
function pathFromKey(key) {
  // Strip leading './' and 'pages/' prefix
  const rel = key.replace(/^\.\/pages\//, '')
  // Drop the filename, keep directory segments
  const dirParts = rel.split('/').slice(0, -1)
  if (dirParts.length === 1 && dirParts[0] === 'index') return '/'
  return '/' + dirParts.join('/')
}

/**
 * Extracts the page component from an eagerly-imported module.
 * Prefers default export, falls back to the first function export.
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
 * Usage in src/metaowl.js:
 *
 *   import { boot } from 'metaowl'
 *   boot(import.meta.glob('./pages/**\/*.js', { eager: true }))
 *
 * @param {Record<string, object>} modules - Result of import.meta.glob({ eager: true })
 * @returns {object[]} Route table for processRoutes()
 */
export function buildRoutes(modules) {
  return Object.entries(modules).map(([key, mod]) => {
    const path = pathFromKey(key)
    const name = path === '/' ? 'index' : path.slice(1).replace(/\//g, '-')
    return {
      name,
      path: [path],
      component: componentFromModule(mod, key)
    }
  })
}
