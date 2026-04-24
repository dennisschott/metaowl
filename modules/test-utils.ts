/**
 * @module TestUtils
 *
 * Testing utilities for MetaOwl OWL applications.
 */

import { mount, reactive } from '@odoo/owl'

type Dictionary = Record<string, any>
type GetterDefinition = (state: Dictionary) => any
type MutationDefinition = (state: Dictionary, payload?: any) => void
type ActionContext = {
  state: Dictionary
  getters: Dictionary
  commit: (mutation: string, payload?: any) => void
  dispatch: (action: string, payload?: any) => Promise<any>
}
type ActionDefinition = (context: ActionContext, payload?: any) => any

interface MockStoreConfig {
  state?: Dictionary
  getters?: Record<string, GetterDefinition>
  mutations?: Record<string, MutationDefinition>
  actions?: Record<string, ActionDefinition>
}

interface MockRouteDefinition {
  path: string
  name?: string | null
}

interface MockRouterConfig {
  initialRoute?: string
  routes?: MockRouteDefinition[]
}

interface MockRouteState {
  path: string
  name: string | null
  params: Record<string, string>
  query: Record<string, string>
  hash: string
}

type MockRouterGuard = (
  to: MockRouteState,
  from: MockRouteState,
  next: () => void
) => boolean | void | Promise<boolean | void>

type MockRouterHook = (to: MockRouteState, from: MockRouteState) => void | Promise<void>

interface MountComponentOptions {
  props?: Dictionary
  store?: any
  router?: any
  target?: HTMLElement
}

export function createMockStore(config: MockStoreConfig = {}) {
  const {
    state: initialState = {},
    getters: getterDefs = {},
    mutations: mutationDefs = {},
    actions: actionDefs = {}
  } = config

  const state = reactive({ ...initialState }) as Dictionary

  const getters: Dictionary = {}
  for (const [name, fn] of Object.entries(getterDefs)) {
    Object.defineProperty(getters, name, {
      get: () => fn(state),
      enumerable: true
    })
  }

  const mutations: Record<string, (payload?: any) => void> = {}
  for (const [name, fn] of Object.entries(mutationDefs)) {
    mutations[name] = (payload?: any) => {
      fn(state, payload)
    }
  }

  const actions: Record<string, (payload?: any) => Promise<any>> = {}
  for (const [name, fn] of Object.entries(actionDefs)) {
    actions[name] = async (payload?: any) => {
      const context: ActionContext = {
        state,
        getters,
        commit: (mutation: string, nextPayload?: any) => mutations[mutation]?.(nextPayload),
        dispatch: (action: string, nextPayload?: any) => actions[action]?.(nextPayload)
      }
      return await fn(context, payload)
    }
  }

  return {
    state,
    getters,
    mutations,
    actions,

    commit(name: string, payload?: any): void {
      if (mutations[name]) {
        mutations[name](payload)
      } else {
        console.warn(`[TestUtils] Mutation '${name}' not found`)
      }
    },

    async dispatch(name: string, payload?: any): Promise<any> {
      if (actions[name]) {
        return await actions[name](payload)
      }
      console.warn(`[TestUtils] Action '${name}' not found`)
      return undefined
    },

    reset(): void {
      Object.keys(state).forEach((key) => delete state[key])
      Object.assign(state, initialState)
    },

    setState(newState: Dictionary): void {
      Object.assign(state, newState)
    }
  }
}

export function mockRouter(config: MockRouterConfig = {}) {
  const {
    initialRoute = '/',
    routes = []
  } = config

  const currentRoute = reactive({
    path: initialRoute,
    name: null,
    params: {},
    query: {},
    hash: ''
  }) as MockRouteState

  const beforeEachGuards: MockRouterGuard[] = []
  const afterEachHooks: MockRouterHook[] = []

  function parseUrl(url: string): MockRouteState {
    const [pathAndQuery, hash = ''] = url.split('#')
    const [path = '', queryString = ''] = pathAndQuery.split('?')

    const query: Record<string, string> = {}
    if (queryString) {
      queryString.split('&').forEach((param) => {
        const [key, value] = param.split('=')
        query[decodeURIComponent(key)] = decodeURIComponent(value || '')
      })
    }

    let matchedRoute: MockRouteDefinition | null = null
    let params: Record<string, string> = {}

    for (const route of routes) {
      const match = matchPath(path, route.path)
      if (match) {
        matchedRoute = route
        params = match.params
        break
      }
    }

    return {
      path,
      name: matchedRoute?.name || null,
      params,
      query,
      hash
    }
  }

  function matchPath(path: string, pattern: string): { params: Record<string, string> } | null {
    const paramNames: string[] = []
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/:([^/]+)/g, (_match, name: string) => {
        paramNames.push(name)
        return '([^/]+)'
      })

    const regex = new RegExp(`^${regexPattern}$`)
    const match = path.match(regex)

    if (!match) return null

    const params: Record<string, string> = {}
    paramNames.forEach((name, index) => {
      params[name] = match[index + 1] as string
    })

    return { params }
  }

  Object.assign(currentRoute, parseUrl(initialRoute))

  return {
    currentRoute,

    async push(path: string): Promise<void> {
      const to = parseUrl(path)
      const from = { ...currentRoute }

      for (const guard of beforeEachGuards) {
        const result = await guard(to, from, () => {})
        if (result === false) return
      }

      Object.assign(currentRoute, to)

      for (const hook of afterEachHooks) {
        await hook(to, from)
      }
    },

    async replace(path: string): Promise<void> {
      await this.push(path)
    },

    back(): void {
      // Mock - does nothing in test environment
    },

    beforeEach(guard: MockRouterGuard): () => void {
      beforeEachGuards.push(guard)
      return () => {
        const index = beforeEachGuards.indexOf(guard)
        if (index > -1) beforeEachGuards.splice(index, 1)
      }
    },

    afterEach(hook: MockRouterHook): () => void {
      afterEachHooks.push(hook)
      return () => {
        const index = afterEachHooks.indexOf(hook)
        if (index > -1) afterEachHooks.splice(index, 1)
      }
    },

    resolve(name: string, params: Record<string, string | number> = {}): string {
      const route = routes.find((candidate) => candidate.name === name)
      if (!route) return '/'

      let path = route.path
      for (const [key, value] of Object.entries(params)) {
        path = path.replace(`:${key}`, String(value))
      }
      return path
    }
  }
}

export async function mountComponent(ComponentClass: any, options: MountComponentOptions = {}): Promise<any> {
  const {
    props = {},
    store = null,
    router = null,
    target = document.createElement('div')
  } = options

  const env: Dictionary = {}
  if (store) env.store = store
  if (router) env.router = router

  return await mount(ComponentClass, target, {
    props,
    env
  })
}

export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function nextTick(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve())
  })
}

export async function flushPromises(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0))
}

export const userEvent = {
  async click(element: Element): Promise<void> {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()
  },

  async type(input: HTMLInputElement, text: string): Promise<void> {
    input.value = text
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await flushPromises()
  },

  async submit(form: HTMLFormElement): Promise<void> {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await flushPromises()
  },

  async select(select: HTMLSelectElement, value: string): Promise<void> {
    select.value = value
    select.dispatchEvent(new Event('change', { bubbles: true }))
    await flushPromises()
  }
}

export const dom = {
  query(selector: string, container: ParentNode = document): Element | null {
    return container.querySelector(selector)
  },

  queryAll(selector: string, container: ParentNode = document): NodeListOf<Element> {
    return container.querySelectorAll(selector)
  },

  hasClass(element: Element | null, className: string): boolean {
    return element?.classList?.contains(className) || false
  },

  text(element: Element | null): string {
    return element?.textContent?.trim() || ''
  }
}

export const TestUtils = {
  createMockStore,
  mockRouter,
  mountComponent,
  wait,
  nextTick,
  flushPromises,
  userEvent,
  dom
}

export default TestUtils