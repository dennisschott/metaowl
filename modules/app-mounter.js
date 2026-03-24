/**
 * @module AppMounter
 *
 * OWL application mounting with template merging.
 * Handles the low-level mounting of components into the DOM with
 * merged XML templates from the build process.
 */
import { mount } from '@odoo/owl'
import { mergeTemplates } from './templates-manager.js'
import { resolveLayout, getLayout, mountWithLayout } from './layouts.js'
import { Link } from './link.js'

const _defaults = {
  warnIfNoStaticProps: true,
  willStartTimeout: 10000,
  translatableAttributes: ['title', 'placeholder', 'label', 'alt']
}

let _config = { ..._defaults }

/**
 * Reference to the currently mounted OWL App instance.
 * Destroyed before each new mount to prevent zombie app accumulation.
 * @type {import('@odoo/owl').App|null}
 */
let _currentApp = null

/**
 * Override or extend the default OWL mount configuration.
 * Call before boot() in your project's metaowl.js.
 *
 * @param {object} config - Partial OWL config merged over the defaults.
 */
export function configureOwl(config) {
  _config = { ..._defaults, ...config }
}

/**
 * Mount the resolved route's OWL component into `#app`.
 *
 * Loads and merges all XML templates (collected at build time by the
 * metaowl Vite plugin via the `COMPONENTS` define), then mounts the component
 * using the active OWL config.
 *
 * @param {object[]} route - Single-element array returned by `processRoutes()`.
 * @returns {Promise<void>}
 */
/**
 * Cached merged templates string. Computed once on first navigation;
 * COMPONENTS (the list of XML files) never changes at runtime so the
 * result is the same for every mount.
 * @type {string|null}
 */
let _cachedTemplates = null

export async function mountApp(route) {
  // Load and cache templates on first call; reuse on every subsequent navigation.
  // Without caching, every navigation re-fetches all XML template files.
  const components = typeof COMPONENTS !== 'undefined' ? COMPONENTS : []
  if (!_cachedTemplates) {
    _cachedTemplates = await mergeTemplates(components)
  }
  const templates = _cachedTemplates
  const mountElement = document.getElementById('metaowl')

  // Destroy the previous OWL App before mounting a new one.
  // Without this, every navigation leaves a zombie app running in the background
  // (scheduler, reactive effects, event listeners) that accumulates and causes freezes.
  if (_currentApp) {
    try { _currentApp.destroy() } catch (_) {}
    _currentApp = null
  }
  mountElement.innerHTML = ''

  const pageComponent = route[0].component
  const pagePath = route[0].path

  // Check for layout
  const layoutName = resolveLayout(pageComponent, pagePath)
  const LayoutClass = getLayout(layoutName)

  // Base mount configuration with built-in components
  const baseConfig = {
    ..._config,
    templates,
    components: {
      Link,
      't-link': Link
    }
  }

  let instance
  if (LayoutClass) {
    // Mount with layout
    instance = await mountWithLayout(pageComponent, mountElement, { routePath: pagePath, ...baseConfig })
  } else {
    // Mount without layout
    instance = await mount(pageComponent, mountElement, baseConfig)
  }

  // Store OWL App reference so we can destroy it before the next navigation.
  // instance.__owl__.app is the underlying App object that owns the scheduler.
  _currentApp = instance?.__owl__?.app ?? null
}
