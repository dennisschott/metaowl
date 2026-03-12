/**
 * @module AppMounter
 *
 * OWL application mounting with template merging.
 * Handles the low-level mounting of components into the DOM with
 * merged XML templates from the build process.
 */
import { mount } from '@odoo/owl'
import { mergeTemplates } from './templates-manager.js'

const _defaults = {
  warnIfNoStaticProps: true,
  willStartTimeout: 10000,
  translatableAttributes: ['title', 'placeholder', 'label', 'alt']
}

let _config = { ..._defaults }

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
export async function mountApp(route) {
  // COMPONENTS is a string[] injected at build time by the metaowl Vite plugin
  const components = typeof COMPONENTS !== 'undefined' ? COMPONENTS : []
  const templates = await mergeTemplates(components)
  const mountElement = document.getElementById('metaowl')
  mountElement.innerHTML = ''

  await mount(route[0].component, mountElement, { ..._config, templates })
}
