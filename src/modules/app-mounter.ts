import { mount } from '@odoo/owl'
import { mergeTemplates } from './templates-manager.js'
import type { OwlConfig, RouteTable } from '../types.js'

const _defaults: OwlConfig = {
  warnIfNoStaticProps: true,
  willStartTimeout: 10000,
  translatableAttributes: ['title', 'placeholder', 'label', 'alt']
}

let _config: OwlConfig = { ..._defaults }

/**
 * Override or extend the default OWL mount configuration.
 * Call before boot() in your project's metaowl.js.
 *
 * @param config - Partial OWL config merged over the defaults.
 */
export function configureOwl(config: Partial<OwlConfig>): void {
  _config = { ..._defaults, ...config }
}

/**
 * Mount the resolved route's OWL component into `#app`.
 *
 * Loads and merges all XML templates (collected at build time by the
 * metaowl Vite plugin via the `COMPONENTS` define), then mounts the component
 * using the active OWL config.
 *
 * @param route - Single-element array returned by `processRoutes()`.
 */
export async function mountApp(route: RouteTable): Promise<void> {
  // COMPONENTS is a string[] injected at build time by the metaowl Vite plugin
  const components = typeof COMPONENTS !== 'undefined' ? COMPONENTS : []
  const templates = await mergeTemplates(components)
  const mountElement = document.getElementById('metaowl')
  
  if (!mountElement) {
    throw new Error('[metaowl] Could not find #metaowl element to mount app')
  }
  
  mountElement.innerHTML = ''

  await mount(route[0].component, mountElement, { ..._config, templates })
}
