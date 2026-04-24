/**
 * @module Layouts
 *
 * Layout system for OWL applications, enabling shared page structures.
 */

import { Component, mount, xml } from '@odoo/owl'

type ComponentClass = typeof Component & {
  new (...args: unknown[]): Component
  template?: unknown
  layout?: string
  _layout?: string
  layoutOptions?: Record<string, unknown>
  route?: {
    meta?: Record<string, unknown>
  } & Record<string, unknown>
}

type LayoutEvent =
  | { type: 'register'; name: string; layout: ComponentClass }
  | { type: 'unregister'; name: string }
  | { type: 'mount'; layout: string; page: string }

type LayoutListener = (event: LayoutEvent) => void
type LayoutMap = Record<string, ComponentClass>

interface RegisterLayoutOptions {
  default?: boolean
}

interface MountWithLayoutOptions {
  routePath?: string
  props?: Record<string, unknown>
  templates?: unknown
}

interface ImportMetaWithGlob extends ImportMeta {
  glob: (pattern: string, options: { eager: true }) => Record<string, LayoutModule>
}

type LayoutModule = {
  default?: ComponentClass
  [key: string]: unknown
}

const layouts = new Map<string, ComponentClass>()
let defaultLayout = 'default'
let currentLayout: Component | null = null
const listeners: LayoutListener[] = []
const routeLayouts = new Map<string, string>()

export function registerLayout(name: string, layoutComponent: ComponentClass, options: RegisterLayoutOptions = {}): void {
  layouts.set(name, layoutComponent)

  if (options.default) {
    defaultLayout = name
  }

  for (const listener of listeners) {
    listener({ type: 'register', name, layout: layoutComponent })
  }
}

export function unregisterLayout(name: string): boolean {
  const removed = layouts.delete(name)

  if (removed) {
    for (const listener of listeners) {
      listener({ type: 'unregister', name })
    }
  }

  return removed
}

export function getLayout(name: string): ComponentClass | undefined {
  return layouts.get(name)
}

export function hasLayout(name: string): boolean {
  return layouts.has(name)
}

export function getLayoutNames(): string[] {
  return Array.from(layouts.keys())
}

export function setDefaultLayout(name: string): void {
  if (!layouts.has(name)) {
    console.warn(`[metaowl] Layout "${name}" is not registered yet`)
  }
  defaultLayout = name
}

export function getDefaultLayout(): string {
  return defaultLayout
}

export function resolveLayout(component: ComponentClass, routePath?: string): string {
  if (routePath && routeLayouts.has(routePath)) {
    return routeLayouts.get(routePath) as string
  }

  if (component.layout) {
    return component.layout
  }

  if (component._layout) {
    return component._layout
  }

  return defaultLayout
}

export function setRouteLayout(routePath: string, layoutName: string): void {
  routeLayouts.set(routePath, layoutName)
}

export function getRouteLayout(routePath: string): string | undefined {
  return routeLayouts.get(routePath)
}

export function createLayoutWrapper(
  layoutComponent: ComponentClass,
  pageComponent: ComponentClass,
  props: Record<string, unknown> = {}
): ComponentClass {
  const LayoutClass = layoutComponent
  const PageClass = pageComponent

  return class LayoutWrapper extends Component {
    static template = xml`
      <t t-component="layout" t-props="layoutProps">
        <t t-component="page" t-props="pageProps"/>
      </t>
    `

    layout!: ComponentClass
    page!: ComponentClass
    layoutProps!: Record<string, never>
    pageProps!: Record<string, unknown>

    setup(): void {
      this.layout = LayoutClass
      this.page = PageClass
      this.layoutProps = {}
      this.pageProps = props
    }
  } as ComponentClass
}

export async function mountWithLayout(
  pageComponent: ComponentClass,
  target: HTMLElement,
  options: MountWithLayoutOptions = {},
  config: Record<string, unknown> = {}
): Promise<Component> {
  const { routePath, props = {}, templates } = options

  const layoutName = resolveLayout(pageComponent, routePath)
  const LayoutClass = getLayout(layoutName)

  if (!LayoutClass) {
    console.warn(`[metaowl] Layout "${layoutName}" not found, mounting page without layout`)
    return await mount(pageComponent, target, { ...config, props, templates } as never)
  }

  const WrapperClass = createLayoutWrapper(LayoutClass, pageComponent, props)
  const instance = await mount(WrapperClass, target, { ...config, templates } as never)

  currentLayout = instance

  for (const listener of listeners) {
    listener({ type: 'mount', layout: layoutName, page: pageComponent.name })
  }

  return instance
}

export function getCurrentLayout(): Component | null {
  return currentLayout
}

export function subscribeToLayouts(callback: LayoutListener): () => void {
  listeners.push(callback)
  return () => {
    const index = listeners.indexOf(callback)
    if (index > -1) listeners.splice(index, 1)
  }
}

export function clearLayouts(): void {
  layouts.clear()
  routeLayouts.clear()
  listeners.length = 0
  defaultLayout = 'default'
  currentLayout = null
}

export function layout(name: string): (componentClass: ComponentClass) => ComponentClass {
  return function decorator(componentClass: ComponentClass): ComponentClass {
    componentClass.layout = name
    return componentClass
  }
}

export function defineLayout(
  name: string,
  options: Record<string, unknown> = {}
): (componentClass: ComponentClass) => ComponentClass {
  return function decorator(componentClass: ComponentClass): ComponentClass {
    componentClass.layout = name
    componentClass.layoutOptions = options
    return componentClass
  }
}

export function buildLayouts(modules: Record<string, LayoutModule>): LayoutMap {
  const discoveredLayouts: LayoutMap = {}

  for (const [key, mod] of Object.entries(modules)) {
    const match = key.match(/\.\/layouts\/([^/]+)/)
    if (!match) continue

    const layoutName = match[1] as string
    const componentClass = resolveLayoutComponent(mod)

    if (componentClass) {
      discoveredLayouts[layoutName] = componentClass
      registerLayout(layoutName, componentClass)
    }
  }

  return discoveredLayouts
}

export async function discoverLayouts(options: { defaultLayout?: string } = {}): Promise<LayoutMap> {
  const { defaultLayout: nextDefaultLayout = 'default' } = options
  const modules = (import.meta as ImportMetaWithGlob).glob('./layouts/**/*.js', { eager: true })
  const discoveredLayouts = buildLayouts(modules)

  if (discoveredLayouts[nextDefaultLayout]) {
    setDefaultLayout(nextDefaultLayout)
  }

  return discoveredLayouts
}

function resolveLayoutComponent(mod: LayoutModule): ComponentClass | undefined {
  if (typeof mod.default === 'function') {
    return mod.default
  }

  return Object.values(mod).find((value): value is ComponentClass => typeof value === 'function')
}