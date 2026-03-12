/**
 * @module TestUtils
 *
 * Testing utilities for MetaOwl OWL applications.
 *
 * Provides:
 * - Mock Store for state management testing
 * - Router mocking for navigation testing
 * - Component mounting helpers
 * - Async test utilities
 *
 * Usage:
 *   import { createMockStore, mockRouter, mountComponent } from 'metaowl/test'
 *
 *   // Mock store
 *   const store = createMockStore({
 *     state: { count: 0 },
 *     mutations: { increment: (s) => s.count++ }
 *   })
 *
 *   // Mock router
 *   const router = mockRouter({
 *     initialRoute: '/dashboard',
 *     routes: [
 *       { path: '/', component: HomePage },
 *       { path: '/dashboard', component: DashboardPage }
 *     ]
 *   })
 *
 *   // Mount component with mocks
 *   const component = await mountComponent(MyComponent, {
 *     store,
 *     router,
 *     props: { title: 'Test' }
 *   })
 */

import { mount, reactive } from '@odoo/owl'

/**
 * Create a mock store for testing.
 *
 * @param {Object} config - Store configuration
 * @param {Object} [config.state={}] - Initial state
 * @param {Object} [config.getters={}] - Getters object
 * @param {Object} [config.mutations={}] - Mutations object
 * @param {Object} [config.actions={}] - Actions object
 * @returns {Object} Mock store instance
 *
 * @example
 * const store = createMockStore({
 *   state: { user: null, count: 0 },
 *   getters: {
 *     isLoggedIn: (state) => !!state.user
 *   },
 *   mutations: {
 *     setUser: (state, user) => { state.user = user },
 *     increment: (state) => { state.count++ }
 *   },
 *   actions: {
 *     login: async ({ commit }, credentials) => {
 *       const user = await fakeApi.login(credentials)
 *       commit('setUser', user)
 *     }
 *   }
 * })
 *
 * // Use in tests
 * store.commit('setUser', { name: 'John' })
 * console.log(store.state.user.name) // 'John'
 * console.log(store.getters.isLoggedIn.value) // true
 *
 * await store.dispatch('login', { email, password })
 */
export function createMockStore(config = {}) {
  const {
    state: initialState = {},
    getters: getterDefs = {},
    mutations: mutationDefs = {},
    actions: actionDefs = {}
  } = config

  // Create reactive state
  const state = reactive({ ...initialState })

  // Create computed getters
  const getters = {}
  for (const [name, fn] of Object.entries(getterDefs)) {
    Object.defineProperty(getters, name, {
      get: () => fn(state),
      enumerable: true
    })
  }

  // Create mutations
  const mutations = {}
  for (const [name, fn] of Object.entries(mutationDefs)) {
    mutations[name] = (payload) => {
      fn(state, payload)
    }
  }

  // Create actions
  const actions = {}
  for (const [name, fn] of Object.entries(actionDefs)) {
    actions[name] = async (payload) => {
      const context = {
        state,
        getters,
        commit: (mutation, payload) => mutations[mutation]?.(payload),
        dispatch: (action, payload) => actions[action]?.(payload)
      }
      return await fn(context, payload)
    }
  }

  // Store instance
  return {
    state,
    getters,
    mutations,
    actions,

    /**
     * Commit a mutation.
     * @param {string} name - Mutation name
     * @param {any} payload - Mutation payload
     */
    commit(name, payload) {
      if (mutations[name]) {
        mutations[name](payload)
      } else {
        console.warn(`[TestUtils] Mutation '${name}' not found`)
      }
    },

    /**
     * Dispatch an action.
     * @param {string} name - Action name
     * @param {any} payload - Action payload
     * @returns {Promise<any>}
     */
    async dispatch(name, payload) {
      if (actions[name]) {
        return await actions[name](payload)
      } else {
        console.warn(`[TestUtils] Action '${name}' not found`)
      }
    },

    /**
     * Reset store to initial state.
     */
    reset() {
      Object.keys(state).forEach(key => delete state[key])
      Object.assign(state, initialState)
    },

    /**
     * Set state directly (for testing).
     * @param {Object} newState
     */
    setState(newState) {
      Object.assign(state, newState)
    }
  }
}

/**
 * Create a mock router for testing.
 *
 * @param {Object} config - Router configuration
 * @param {string} [config.initialRoute='/'] - Initial route path
 * @param {Array} [config.routes=[]] - Route definitions
 * @returns {Object} Mock router instance
 *
 * @example
 * const router = mockRouter({
 *   initialRoute: '/',
 *   routes: [
 *     { path: '/', name: 'home' },
 *     { path: '/user/:id', name: 'user' }
 *   ]
 * })
 *
 * await router.push('/user/123')
 * console.log(router.currentRoute.value.path) // '/user/123'
 * console.log(router.currentRoute.value.params.id) // '123'
 */
export function mockRouter(config = {}) {
  const {
    initialRoute = '/',
    routes = []
  } = config

  // Reactive current route
  const currentRoute = reactive({
    path: initialRoute,
    name: null,
    params: {},
    query: {},
    hash: ''
  })

  // Navigation guards
  const beforeEachGuards = []
  const afterEachHooks = []

  // Parse URL into route object
  function parseUrl(url) {
    const [pathAndQuery, hash = ''] = url.split('#')
    const [path, queryString = ''] = pathAndQuery.split('?')

    const query = {}
    if (queryString) {
      queryString.split('&').forEach(param => {
        const [key, value] = param.split('=')
        query[decodeURIComponent(key)] = decodeURIComponent(value || '')
      })
    }

    // Find matching route
    let matchedRoute = null
    let params = {}

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

  // Match path against route pattern
  function matchPath(path, pattern) {
    // Simple pattern matching (supports :param and * wildcards)
    const paramNames = []
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/:([^/]+)/g, (match, name) => {
        paramNames.push(name)
        return '([^/]+)'
      })

    const regex = new RegExp(`^${regexPattern}$`)
    const match = path.match(regex)

    if (!match) return null

    const params = {}
    paramNames.forEach((name, i) => {
      params[name] = match[i + 1]
    })

    return { params }
  }

  // Initialize
  Object.assign(currentRoute, parseUrl(initialRoute))

  return {
    currentRoute,

    /**
     * Navigate to a new route.
     * @param {string} path - Target path
     */
    async push(path) {
      const to = parseUrl(path)
      const from = { ...currentRoute }

      // Run beforeEach guards
      for (const guard of beforeEachGuards) {
        const result = await guard(to, from, () => {})
        if (result === false) return
      }

      Object.assign(currentRoute, to)

      // Run afterEach hooks
      for (const hook of afterEachHooks) {
        await hook(to, from)
      }
    },

    /**
     * Replace current route.
     * @param {string} path - Target path
     */
    async replace(path) {
      await this.push(path)
    },

    /**
     * Go back in history.
     */
    back() {
      // Mock - does nothing in test environment
    },

    /**
     * Register beforeEach guard.
     * @param {Function} guard
     * @returns {Function} Unsubscribe function
     */
    beforeEach(guard) {
      beforeEachGuards.push(guard)
      return () => {
        const index = beforeEachGuards.indexOf(guard)
        if (index > -1) beforeEachGuards.splice(index, 1)
      }
    },

    /**
     * Register afterEach hook.
     * @param {Function} hook
     * @returns {Function} Unsubscribe function
     */
    afterEach(hook) {
      afterEachHooks.push(hook)
      return () => {
        const index = afterEachHooks.indexOf(hook)
        if (index > -1) afterEachHooks.splice(index, 1)
      }
    },

    /**
     * Generate URL for named route.
     * @param {string} name - Route name
     * @param {Object} params - Route params
     * @returns {string}
     */
    resolve(name, params = {}) {
      const route = routes.find(r => r.name === name)
      if (!route) return '/'

      let path = route.path
      for (const [key, value] of Object.entries(params)) {
        path = path.replace(`:${key}`, value)
      }
      return path
    }
  }
}

/**
 * Mount a component with test utilities.
 *
 * @param {Component} Component - OWL component class
 * @param {Object} [options={}] - Mount options
 * @param {Object} [options.props={}] - Component props
 * @param {Object} [options.store] - Mock store
 * @param {Object} [options.router] - Mock router
 * @param {Element} [options.target] - Mount target (default: detached div)
 * @returns {Promise<Object>} Mounted component instance
 *
 * @example
 * const component = await mountComponent(MyComponent, {
 *   props: { title: 'Test' },
 *   store: createMockStore({ state: { user: null } }),
 *   router: mockRouter({ initialRoute: '/' })
 * })
 *
 * // Access component
 * expect(component.props.title).toBe('Test')
 * expect(component.env.store.state.user).toBeNull()
 */
export async function mountComponent(Component, options = {}) {
  const {
    props = {},
    store = null,
    router = null,
    target = document.createElement('div')
  } = options

  // Create environment with mocks
  const env = {}
  if (store) env.store = store
  if (router) env.router = router

  // Mount component
  const component = await mount(Component, {
    props,
    env,
    target
  })

  return component
}

/**
 * Wait for a specific time (for async tests).
 *
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>}
 */
export function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Wait for next tick (DOM update).
 *
 * @returns {Promise<void>}
 */
export function nextTick() {
  return new Promise(resolve => {
    requestAnimationFrame(resolve)
  })
}

/**
 * Flush all promises (useful after state changes).
 *
 * @returns {Promise<void>}
 */
export async function flushPromises() {
  await new Promise(resolve => setTimeout(resolve, 0))
}

/**
 * Simulate user events.
 */
export const userEvent = {
  /**
   * Click an element.
   * @param {Element} element
   */
  async click(element) {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()
  },

  /**
   * Type text into an input.
   * @param {HTMLInputElement} input
   * @param {string} text
   */
  async type(input, text) {
    input.value = text
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await flushPromises()
  },

  /**
   * Submit a form.
   * @param {HTMLFormElement} form
   */
  async submit(form) {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await flushPromises()
  },

  /**
   * Change a select value.
   * @param {HTMLSelectElement} select
   * @param {string} value
   */
  async select(select, value) {
    select.value = value
    select.dispatchEvent(new Event('change', { bubbles: true }))
    await flushPromises()
  }
}

/**
 * Create DOM element helpers.
 */
export const dom = {
  /**
   * Query element by selector.
   * @param {string} selector
   * @param {Element} [container=document]
   * @returns {Element|null}
   */
  query(selector, container = document) {
    return container.querySelector(selector)
  },

  /**
   * Query all elements by selector.
   * @param {string} selector
   * @param {Element} [container=document]
   * @returns {NodeList}
   */
  queryAll(selector, container = document) {
    return container.querySelectorAll(selector)
  },

  /**
   * Check if element has class.
   * @param {Element} element
   * @param {string} className
   * @returns {boolean}
   */
  hasClass(element, className) {
    return element?.classList?.contains(className) || false
  },

  /**
   * Get text content.
   * @param {Element} element
   * @returns {string}
   */
  text(element) {
    return element?.textContent?.trim() || ''
  }
}

// Export namespace
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
