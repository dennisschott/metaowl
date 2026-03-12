/**
 * @module Layouts
 *
 * Layout system for OWL applications, enabling shared page structures.
 *
 * Features:
 * - Named layouts with automatic resolution
 * - Fallback to default layout
 * - Layout-specific state and lifecycle
 * - Nested layouts support
 * - Layout transitions
 *
 * Directory Convention:
 *   src/
 *     layouts/
 *       default/
 *         DefaultLayout.js      # Default layout for all pages
 *         DefaultLayout.xml
 *         DefaultLayout.css
 *       auth/
 *         AuthLayout.js         # Layout for auth pages (login, register)
 *       admin/
 *         AdminLayout.js        # Layout with sidebar for admin pages
 *
 * Usage in Pages:
 *   export class MyPage extends Component {
 *     static layout = 'admin'  // Use admin layout
 *   }
 *
 * Layout Template Convention:
 *   <templates>
 *     <t t-name="DefaultLayout">
 *       <div class="layout-default">
 *         <header t-name="header"/>
 *         <main>
 *           <t t-slot="default"/>  <!-- Page content renders here -->
 *         </main>
 *         <footer t-name="footer"/>
 *       </div>
 *     </t>
 *   </templates>
 *
 * @example
 * // layouts/default/DefaultLayout.js
 * import { Component } from '@odoo/owl'
 *
 * export class DefaultLayout extends Component {
 *   static template = 'DefaultLayout'
 * }
 *
 * // pages/index/Index.js
 * import { Component } from '@odoo/owl'
 *
 * export class IndexPage extends Component {
 *   static template = 'IndexPage'
 *   static layout = 'default'  // Optional, 'default' is implicit
 * }
 */

import { Component, xml } from '@odoo/owl'

/**
 * Registry of layout components.
 * @type {Map<string, typeof Component>}
 */
const _layouts = new Map()

/**
 * Default layout name used when none specified.
 * @type {string}
 */
let _defaultLayout = 'default'

/**
 * Current active layout instance.
 * @type {Component|null}
 */
let _currentLayout = null

/**
 * Layout change listeners.
 * @type {Function[]}
 */
const _listeners = []

/**
 * Layout configuration per route.
 * @type {Map<string, string>}
 */
const _routeLayouts = new Map()

/**
 * Register a layout component.
 *
 * @param {string} name - Layout identifier
 * @param {typeof Component} layoutComponent - OWL component class
 * @param {object} options - Layout options
 * @param {boolean} [options.default=false] - Set as default layout
 *
 * @example
 * import { DefaultLayout } from './layouts/default/DefaultLayout.js'
 * import { AdminLayout } from './layouts/admin/AdminLayout.js'
 *
 * registerLayout('default', DefaultLayout, { default: true })
 * registerLayout('admin', AdminLayout)
 */
export function registerLayout(name, layoutComponent, options = {}) {
  _layouts.set(name, layoutComponent)

  if (options.default) {
    _defaultLayout = name
  }

  // Notify listeners
  for (const listener of _listeners) {
    listener({ type: 'register', name, layout: layoutComponent })
  }
}

/**
 * Unregister a layout.
 *
 * @param {string} name - Layout identifier
 * @returns {boolean} True if layout was removed
 */
export function unregisterLayout(name) {
  const removed = _layouts.delete(name)

  if (removed) {
    for (const listener of _listeners) {
      listener({ type: 'unregister', name })
    }
  }

  return removed
}

/**
 * Get a registered layout by name.
 *
 * @param {string} name - Layout identifier
 * @returns {typeof Component|undefined}
 */
export function getLayout(name) {
  return _layouts.get(name)
}

/**
 * Check if a layout is registered.
 *
 * @param {string} name - Layout identifier
 * @returns {boolean}
 */
export function hasLayout(name) {
  return _layouts.has(name)
}

/**
 * Get all registered layout names.
 *
 * @returns {string[]}
 */
export function getLayoutNames() {
  return Array.from(_layouts.keys())
}

/**
 * Set the default layout name.
 *
 * @param {string} name - Layout identifier
 */
export function setDefaultLayout(name) {
  if (!_layouts.has(name)) {
    console.warn(`[metaowl] Layout "${name}" is not registered yet`)
  }
  _defaultLayout = name
}

/**
 * Get the current default layout name.
 *
 * @returns {string}
 */
export function getDefaultLayout() {
  return _defaultLayout
}

/**
 * Resolve layout name for a given component or route.
 *
 * @param {typeof Component} component - Page component
 * @param {string} [routePath] - Optional route path for route-specific layout
 * @returns {string} Layout name
 */
export function resolveLayout(component, routePath) {
  // Check route-specific layout first
  if (routePath && _routeLayouts.has(routePath)) {
    return _routeLayouts.get(routePath)
  }

  // Check component static property
  if (component.layout) {
    return component.layout
  }

  // Check for layout defined via decorator/metadata
  if (component._layout) {
    return component._layout
  }

  // Fall back to default
  return _defaultLayout
}

/**
 * Assign a layout to a specific route.
 *
 * @param {string} routePath - Route path pattern
 * @param {string} layoutName - Layout identifier
 */
export function setRouteLayout(routePath, layoutName) {
  _routeLayouts.set(routePath, layoutName)
}

/**
 * Get layout assigned to a route.
 *
 * @param {string} routePath - Route path
 * @returns {string|undefined}
 */
export function getRouteLayout(routePath) {
  return _routeLayouts.get(routePath)
}

/**
 * Create a layout wrapper component that renders the page inside the layout.
 *
 * @param {typeof Component} layoutComponent - Layout component class
 * @param {typeof Component} pageComponent - Page component class
 * @param {object} [props] - Props to pass to page component
 * @returns {typeof Component} Wrapper component
 */
export function createLayoutWrapper(layoutComponent, pageComponent, props = {}) {
  const LayoutClass = layoutComponent
  const PageClass = pageComponent

  return class LayoutWrapper extends Component {
    static template = xml`
      <t t-component="layout" t-props="layoutProps">
        <t t-component="page" t-props="pageProps"/>
      </t>
    `

    setup() {
      this.layout = LayoutClass
      this.page = PageClass
      this.layoutProps = {}
      this.pageProps = props
    }
  }
}

/**
 * Mount a page component within its resolved layout.
 *
 * @param {typeof Component} pageComponent - Page component to mount
 * @param {HTMLElement} target - Mount target element
 * @param {object} [options] - Mount options
 * @param {string} [options.routePath] - Current route path
 * @param {object} [options.props] - Props for page component
 * @param {object} [config] - OWL mount configuration
 * @returns {Promise<Component>} Mounted component instance
 */
export async function mountWithLayout(pageComponent, target, options = {}, config = {}) {
  const { routePath, props = {}, templates } = options

  const layoutName = resolveLayout(pageComponent, routePath)
  const LayoutClass = getLayout(layoutName)

  if (!LayoutClass) {
    console.warn(`[metaowl] Layout "${layoutName}" not found, mounting page without layout`)
    const { mount } = await import('@odoo/owl')
    return mount(pageComponent, target, { ...config, props, templates })
  }

  // Create wrapper that combines layout and page
  const WrapperClass = createLayoutWrapper(LayoutClass, pageComponent, props)

  const { mount } = await import('@odoo/owl')
  const instance = await mount(WrapperClass, target, { ...config, templates })

  _currentLayout = instance

  // Notify listeners
  for (const listener of _listeners) {
    listener({ type: 'mount', layout: layoutName, page: pageComponent.name })
  }

  return instance
}

/**
 * Get the currently active layout instance.
 *
 * @returns {Component|null}
 */
export function getCurrentLayout() {
  return _currentLayout
}

/**
 * Subscribe to layout events.
 *
 * @param {Function} callback - Event listener
 * @returns {Function} Unsubscribe function
 */
export function subscribeToLayouts(callback) {
  _listeners.push(callback)
  return () => {
    const index = _listeners.indexOf(callback)
    if (index > -1) _listeners.splice(index, 1)
  }
}

/**
 * Clear all layouts and reset state (useful for testing).
 */
export function clearLayouts() {
  _layouts.clear()
  _routeLayouts.clear()
  _listeners.length = 0
  _defaultLayout = 'default'
  _currentLayout = null
}

/**
 * Layout decorator for setting layout on component class.
 *
 * @param {string} name - Layout identifier
 * @returns {Function} Decorator function
 *
 * @example
 * @layout('admin')
 * export class AdminPage extends Component {
 *   // ...
 * }
 */
export function layout(name) {
  return function decorator(ComponentClass) {
    ComponentClass.layout = name
    return ComponentClass
  }
}

/**
 * DefineLayout decorator with additional options.
 *
 * @param {string} name - Layout identifier
 * @param {object} options - Layout options
 * @returns {Function} Decorator function
 *
 * @example
 * @defineLayout('admin', { persistent: true })
 * export class AdminPage extends Component {
 *   // ...
 * }
 */
export function defineLayout(name, options = {}) {
  return function decorator(ComponentClass) {
    ComponentClass.layout = name
    ComponentClass.layoutOptions = options
    return ComponentClass
  }
}

/**
 * Build layouts from import.meta.glob result (file-based layouts).
 *
 * Convention:
 *   './layouts/default/DefaultLayout.js' → layout 'default'
 *   './layouts/admin/AdminLayout.js' → layout 'admin'
 *
 * @param {Record<string, object>} modules - import.meta.glob result
 * @returns {object} Map of layout names to component classes
 */
export function buildLayouts(modules) {
  const layouts = {}

  for (const [key, mod] of Object.entries(modules)) {
    // Extract layout name from path: './layouts/default/DefaultLayout.js'
    const match = key.match(/\.\/layouts\/([^/]+)/)
    if (!match) continue

    const layoutName = match[1]
    const ComponentClass = mod.default || Object.values(mod).find(v => typeof v === 'function')

    if (ComponentClass) {
      layouts[layoutName] = ComponentClass
      registerLayout(layoutName, ComponentClass)
    }
  }

  return layouts
}

/**
 * Auto-discover and register layouts from the layouts directory.
 *
 * @param {object} options
 * @param {string} [options.defaultLayout='default'] - Default layout name
 * @returns {Promise<object>} Registered layouts
 *
 * @example
 * // metaowl.js
 * import { discoverLayouts } from 'metaowl'
 *
 * await discoverLayouts({ defaultLayout: 'default' })
 * boot()
 */
export async function discoverLayouts(options = {}) {
  const { defaultLayout = 'default' } = options

  // This will be transformed by Vite plugin at build time
  const modules = import.meta.glob('./layouts/**/*.js', { eager: true })
  const layouts = buildLayouts(modules)

  // Set default if specified layout exists
  if (layouts[defaultLayout]) {
    setDefaultLayout(defaultLayout)
  }

  return layouts
}
