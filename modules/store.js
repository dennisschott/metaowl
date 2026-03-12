/**
 * @module Store
 *
 * Lightweight state management for OWL applications, inspired by Pinia/Vuex.
 *
 * Features:
 * - Reactive state with OWL's reactivity system
 * - Synchronous mutations for state changes
 * - Asynchronous actions with context access
 * - Getter support for computed values
 * - Module composition via plugins
 * - DevTools integration support
 * - Persistence plugin for localStorage/sessionStorage
 *
 * @example
 * import { Store } from 'metaowl'
 *
 * const useUserStore = Store.define('user', {
 *   state: () => ({ name: '', loggedIn: false }),
 *   getters: {
 *     displayName: (state) => state.name || 'Guest'
 *   },
 *   mutations: {
 *     setName: (state, name) => { state.name = name },
 *     setLoggedIn: (state, value) => { state.loggedIn = value }
 *   },
 *   actions: {
 *     async login({ commit, state }, credentials) {
 *       const result = await Fetch.url('/api/login', 'POST', credentials)
 *       commit('setName', result.name)
 *       commit('setLoggedIn', true)
 *       return result
 *     },
 *     logout({ commit }) {
 *       commit('setName', '')
 *       commit('setLoggedIn', false)
 *     }
 *   }
 * })
 *
 * // In a component:
 * const store = useUserStore()
 * console.log(store.state.name)
 * console.log(store.getters.displayName)
 * store.commit('setName', 'John')
 * await store.dispatch('login', { email, password })
 */

import { reactive } from '@odoo/owl'

/**
 * Registry of all defined stores by their ID.
 * @type {Map<string, Store>}
 */
const _stores = new Map()

/**
 * Global plugins applied to all stores.
 * @type {Function[]}
 */
const _plugins = []

/**
 * Store class implementing the state management pattern.
 */
export class Store {
  /**
   * Creates a new Store instance.
   *
   * @param {string} id - Unique identifier for the store
   * @param {object} config - Store configuration
   * @param {Function} config.state - Factory function returning initial state object
   * @param {Object.<string, Function>} [config.getters] - Computed property functions
   * @param {Object.<string, Function>} [config.mutations] - Synchronous state mutation functions
   * @param {Object.<string, Function>} [config.actions] - Asynchronous action functions
   */
  constructor(id, config) {
    this._id = id
    this._config = config
    this._state = reactive(config.state ? config.state() : {})
    this._getters = {}
    this._mutations = config.mutations || {}
    this._actions = config.actions || {}
    this._subscribers = []
    this._actionSubscribers = []

    // Initialize getters as getter functions
    if (config.getters) {
      for (const [name, fn] of Object.entries(config.getters)) {
        Object.defineProperty(this._getters, name, {
          get: () => fn(this._state, this._getters),
          enumerable: true,
          configurable: true
        })
      }
    }

    // Apply global plugins
    for (const plugin of _plugins) {
      plugin(this)
    }
  }

  /**
   * The store's unique identifier.
   * @returns {string}
   */
  get id() {
    return this._id
  }

  /**
   * Reactive state object. Direct mutation is discouraged; use commit() instead.
   * @returns {object}
   */
  get state() {
    return this._state
  }

  /**
   * Computed getters object.
   * @returns {object}
   */
  get getters() {
    return this._getters
  }

  /**
   * Commit a synchronous mutation to modify state.
   *
   * @param {string} type - Mutation name
   * @param {*} payload - Data passed to mutation handler
   * @returns {*} Return value from mutation
   * @throws {Error} If mutation is not defined
   */
  commit(type, payload) {
    const mutation = this._mutations[type]
    if (!mutation) {
      throw new Error(`[metaowl] Mutation "${type}" not found in store "${this._id}"`)
    }

    const prevState = JSON.parse(JSON.stringify(this._state))
    const result = mutation(this._state, payload)

    // Notify subscribers
    for (const subscriber of this._subscribers) {
      subscriber({ type, payload }, this._state, prevState)
    }

    return result
  }

  /**
   * Dispatch an asynchronous action.
   *
   * @param {string} type - Action name
   * @param {*} payload - Data passed to action handler
   * @returns {Promise<*>} Return value from action
   * @throws {Error} If action is not defined
   */
  async dispatch(type, payload) {
    const action = this._actions[type]
    if (!action) {
      throw new Error(`[metaowl] Action "${type}" not found in store "${this._id}"`)
    }

    const context = {
      state: this._state,
      getters: this._getters,
      commit: this.commit.bind(this),
      dispatch: this.dispatch.bind(this)
    }

    // Notify action subscribers (before)
    for (const subscriber of this._actionSubscribers) {
      subscriber({ type, payload }, 'before')
    }

    try {
      const result = await action(context, payload)

      // Notify action subscribers (after)
      for (const subscriber of this._actionSubscribers) {
        subscriber({ type, payload }, 'after', result)
      }

      return result
    } catch (error) {
      // Notify action subscribers (error)
      for (const subscriber of this._actionSubscribers) {
        subscriber({ type, payload }, 'error', error)
      }
      throw error
    }
  }

  /**
   * Subscribe to state changes. Callback receives mutation info and state snapshots.
   *
   * @param {Function} callback - (mutation, state, prevState) => void
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    this._subscribers.push(callback)
    return () => {
      const index = this._subscribers.indexOf(callback)
      if (index > -1) this._subscribers.splice(index, 1)
    }
  }

  /**
   * Subscribe to action dispatches.
   *
   * @param {Function} callback - (action, status, result/error) => void
   * @returns {Function} Unsubscribe function
   */
  subscribeAction(callback) {
    this._actionSubscribers.push(callback)
    return () => {
      const index = this._actionSubscribers.indexOf(callback)
      if (index > -1) this._actionSubscribers.splice(index, 1)
    }
  }

  /**
   * Reset store state to initial values.
   */
  reset() {
    if (this._config.state) {
      const initialState = this._config.state()
      Object.keys(this._state).forEach(key => {
        delete this._state[key]
      })
      Object.assign(this._state, initialState)
    }
  }

  /**
   * Define a new store or retrieve existing one.
   *
   * @param {string} id - Unique store identifier
   * @param {object} config - Store configuration
   * @returns {Function} Hook function that returns store instance
   *
   * @example
   * const useCounterStore = Store.define('counter', {
   *   state: () => ({ count: 0 }),
   *   getters: { double: (state) => state.count * 2 },
   *   mutations: { increment: (state) => state.count++ }
   * })
   *
   * const store = useCounterStore()
   * store.commit('increment')
   * console.log(store.getters.double.value) // 2
   */
  static define(id, config) {
    return function useStore() {
      if (!_stores.has(id)) {
        _stores.set(id, new Store(id, config))
      }
      return _stores.get(id)
    }
  }

  /**
   * Get a store by ID (for advanced use cases).
   *
   * @param {string} id - Store identifier
   * @returns {Store|undefined}
   */
  static get(id) {
    return _stores.get(id)
  }

  /**
   * Check if a store exists.
   *
   * @param {string} id - Store identifier
   * @returns {boolean}
   */
  static has(id) {
    return _stores.has(id)
  }

  /**
   * Remove a store from the registry.
   *
   * @param {string} id - Store identifier
   * @returns {boolean} True if store was removed
   */
  static remove(id) {
    const store = _stores.get(id)
    if (store) {
      store.reset()
      return _stores.delete(id)
    }
    return false
  }

  /**
   * Clear all stores (useful for testing).
   */
  static clear() {
    _stores.clear()
  }

  /**
   * Get all registered store IDs.
   *
   * @returns {string[]}
   */
  static storeIds() {
    return Array.from(_stores.keys())
  }

  /**
   * Register a global plugin applied to all new stores.
   *
   * @param {Function} plugin - (store) => void
   */
  static use(plugin) {
    _plugins.push(plugin)
  }
}

/**
 * Plugin for persisting store state to storage (localStorage/sessionStorage).
 *
 * @param {object} options
 * @param {Storage} [options.storage=localStorage] - Storage implementation
 * @param {string} [options.key] - Custom storage key (defaults to store id)
 * @param {string[]} [options.paths] - Specific state paths to persist (default: all)
 *
 * @example
 * Store.use(createPersistencePlugin({
 *   storage: localStorage,
 *   paths: ['user', 'preferences']
 * }))
 */
export function createPersistencePlugin(options = {}) {
  const { storage = localStorage, key, paths } = options

  return function persistencePlugin(store) {
    const storageKey = key || `metaowl:store:${store.id}`

    // Restore state from storage on init
    try {
      const saved = storage.getItem(storageKey)
      if (saved) {
        const persisted = JSON.parse(saved)
        if (paths) {
          // Only restore specified paths
          for (const path of paths) {
            if (path in persisted && path in store.state) {
              store.state[path] = persisted[path]
            }
          }
        } else {
          // Restore all
          Object.assign(store.state, persisted)
        }
      }
    } catch (e) {
      console.warn('[metaowl] Failed to restore store from storage:', e)
    }

    // Subscribe to changes and persist
    store.subscribe((mutation, state) => {
      try {
        const toPersist = paths
          ? Object.fromEntries(paths.map(p => [p, state[p]]))
          : state
        storage.setItem(storageKey, JSON.stringify(toPersist))
      } catch (e) {
        console.warn('[metaowl] Failed to persist store:', e)
      }
    })
  }
}

/**
 * Simple store factory for basic use cases without full Store class overhead.
 *
 * @param {object} initialState - Initial state object
 * @returns {object} Reactive state object with $patch method
 *
 * @example
 * const counter = createStore({ count: 0 })
 * counter.count++ // reactive
 * counter.$patch({ count: 10 }) // batch update
 */
export function createStore(initialState = {}) {
  const state = reactive({ ...initialState })

  state.$patch = (partialState) => {
    Object.assign(state, partialState)
  }

  state.$reset = () => {
    Object.keys(state).forEach(key => {
      if (!key.startsWith('$')) {
        delete state[key]
      }
    })
    Object.assign(state, initialState)
  }

  return state
}
