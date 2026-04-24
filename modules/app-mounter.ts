/**
 * @module AppMounter
 *
 * OWL application mounting with template merging.
 */

import { Component, mount } from '@odoo/owl'
import { Link } from './link.js'
import { getLayout, mountWithLayout, resolveLayout } from './layouts.js'
import { mergeTemplates } from './templates-manager.js'

declare const COMPONENTS: string[] | undefined

type ComponentClass = typeof Component & {
  new (...args: unknown[]): Component
  name?: string
}

type MountedAppHandle = {
  destroy: () => void
}

type MountedInstance = Component & {
  __owl__?: {
    app?: MountedAppHandle | null
  }
}

type AppRoute = {
  component: Function | null
  path: string[]
}

type OwlConfig = {
  warnIfNoStaticProps: boolean
  willStartTimeout: number
  translatableAttributes: string[]
} & Record<string, unknown>

const defaults: OwlConfig = {
  warnIfNoStaticProps: true,
  willStartTimeout: 10000,
  translatableAttributes: ['title', 'placeholder', 'label', 'alt']
}

let config: OwlConfig = { ...defaults }
let currentApp: MountedAppHandle | null = null
let cachedTemplates: string | null = null

export function configureOwl(nextConfig: Record<string, unknown>): void {
  config = { ...defaults, ...nextConfig }
}

export async function mountApp(route: AppRoute[]): Promise<void> {
  const components = typeof COMPONENTS !== 'undefined' ? COMPONENTS : []
  if (!cachedTemplates) {
    cachedTemplates = await mergeTemplates(components)
  }

  const templates = cachedTemplates
  const mountElement = document.getElementById('metaowl') as HTMLElement | null

  if (currentApp) {
    try {
      currentApp.destroy()
    } catch {
      // Ignore destroy errors from stale app instances.
    }
    currentApp = null
  }

  if (!mountElement) {
    throw new Error('[metaowl] Mount element "#metaowl" not found')
  }

  mountElement.innerHTML = ''

  const pageComponent = route[0]?.component
  const pagePath = document.location.pathname

  if (!pageComponent) {
    throw new Error('[metaowl] Invalid route passed to mountApp()')
  }

  const pageComponentClass = pageComponent as ComponentClass

  const layoutName = resolveLayout(pageComponentClass, pagePath)
  const layoutClass = getLayout(layoutName)

  const baseConfig: Record<string, unknown> = {
    ...config,
    templates,
    components: {
      Link,
      't-link': Link
    }
  }

  let instance: MountedInstance
  if (layoutClass) {
    instance = await mountWithLayout(pageComponentClass, mountElement, { routePath: pagePath, templates }, baseConfig) as MountedInstance
  } else {
    instance = await mount(pageComponentClass, mountElement, baseConfig as never) as MountedInstance
  }

  currentApp = instance?.__owl__?.app ?? null
}