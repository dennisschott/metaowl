/**
 * @module Store
 *
 * Lightweight state management for OWL applications, inspired by Pinia/Vuex.
 */

import { reactive } from '@odoo/owl'

type StoreState = Record<string, unknown>
type GetterFn = (state: StoreState, getters: Record<string, unknown>) => unknown
type MutationFn = (state: StoreState, payload?: unknown) => unknown
type SubscriberFn = (mutation: { type: string; payload?: unknown }, state: StoreState, prevState: StoreState) => void
type ActionSubscriberFn = (action: { type: string; payload?: unknown }, status: 'before' | 'after' | 'error', result?: unknown) => void

interface ActionContext {
  state: StoreState
  getters: Record<string, unknown>
  commit: (type: string, payload?: unknown) => unknown
  dispatch: (type: string, payload?: unknown) => Promise<unknown>
}

type ActionFn = (context: ActionContext, payload?: unknown) => unknown | Promise<unknown>

interface StoreConfig {
  state?: () => StoreState
  getters?: Record<string, GetterFn>
  mutations?: Record<string, MutationFn>
  actions?: Record<string, ActionFn>
}

interface PersistenceOptions {
  storage?: Pick<Storage, 'getItem' | 'setItem'>
  key?: string
  paths?: string[]
}

type StorePlugin = (store: Store) => void

const stores = new Map<string, Store>()
const plugins: StorePlugin[] = []

export class Store {
  private _id: string
  private _config: StoreConfig
  private _state: StoreState
  private _getters: Record<string, unknown>
  private _mutations: Record<string, MutationFn>
  private _actions: Record<string, ActionFn>
  private _subscribers: SubscriberFn[]
  private _actionSubscribers: ActionSubscriberFn[]

  constructor(id: string, config: StoreConfig) {
    this._id = id
    this._config = config
    this._state = reactive(config.state ? config.state() : {}) as StoreState
    this._getters = {}
    this._mutations = config.mutations || {}
    this._actions = config.actions || {}
    this._subscribers = []
    this._actionSubscribers = []

    if (config.getters) {
      for (const [name, fn] of Object.entries(config.getters)) {
        Object.defineProperty(this._getters, name, {
          get: () => fn(this._state, this._getters),
          enumerable: true,
          configurable: true
        })
      }
    }

    for (const plugin of plugins) {
      plugin(this)
    }
  }

  get id(): string {
    return this._id
  }

  get state(): StoreState {
    return this._state
  }

  get getters(): Record<string, unknown> {
    return this._getters
  }

  commit(type: string, payload?: unknown): unknown {
    const mutation = this._mutations[type]
    if (!mutation) {
      throw new Error(`[metaowl] Mutation "${type}" not found in store "${this._id}"`)
    }

    const prevState = JSON.parse(JSON.stringify(this._state)) as StoreState
    const result = mutation(this._state, payload)

    for (const subscriber of this._subscribers) {
      subscriber({ type, payload }, this._state, prevState)
    }

    return result
  }

  async dispatch(type: string, payload?: unknown): Promise<unknown> {
    const action = this._actions[type]
    if (!action) {
      throw new Error(`[metaowl] Action "${type}" not found in store "${this._id}"`)
    }

    const context: ActionContext = {
      state: this._state,
      getters: this._getters,
      commit: this.commit.bind(this),
      dispatch: this.dispatch.bind(this)
    }

    for (const subscriber of this._actionSubscribers) {
      subscriber({ type, payload }, 'before')
    }

    try {
      const result = await action(context, payload)

      for (const subscriber of this._actionSubscribers) {
        subscriber({ type, payload }, 'after', result)
      }

      return result
    } catch (error) {
      for (const subscriber of this._actionSubscribers) {
        subscriber({ type, payload }, 'error', error)
      }
      throw error
    }
  }

  subscribe(callback: SubscriberFn): () => void {
    this._subscribers.push(callback)
    return () => {
      const index = this._subscribers.indexOf(callback)
      if (index > -1) this._subscribers.splice(index, 1)
    }
  }

  subscribeAction(callback: ActionSubscriberFn): () => void {
    this._actionSubscribers.push(callback)
    return () => {
      const index = this._actionSubscribers.indexOf(callback)
      if (index > -1) this._actionSubscribers.splice(index, 1)
    }
  }

  reset(): void {
    if (this._config.state) {
      const initialState = this._config.state()
      Object.keys(this._state).forEach((key) => {
        delete this._state[key]
      })
      Object.assign(this._state, initialState)
    }
  }

  static define(id: string, config: StoreConfig): () => Store {
    return function useStore(): Store {
      if (!stores.has(id)) {
        stores.set(id, new Store(id, config))
      }
      return stores.get(id) as Store
    }
  }

  static get(id: string): Store | undefined {
    return stores.get(id)
  }

  static has(id: string): boolean {
    return stores.has(id)
  }

  static remove(id: string): boolean {
    const store = stores.get(id)
    if (store) {
      store.reset()
      return stores.delete(id)
    }
    return false
  }

  static clear(): void {
    stores.clear()
  }

  static storeIds(): string[] {
    return Array.from(stores.keys())
  }

  static use(plugin: StorePlugin): void {
    plugins.push(plugin)
  }
}

export function createPersistencePlugin(options: PersistenceOptions = {}): StorePlugin {
  const { storage = localStorage, key, paths } = options

  return function persistencePlugin(store: Store): void {
    const storageKey = key || `metaowl:store:${store.id}`

    try {
      const saved = storage.getItem(storageKey)
      if (saved) {
        const persisted = JSON.parse(saved) as StoreState
        if (paths) {
          for (const path of paths) {
            if (path in persisted && path in store.state) {
              store.state[path] = persisted[path]
            }
          }
        } else {
          Object.assign(store.state, persisted)
        }
      }
    } catch (error) {
      console.warn('[metaowl] Failed to restore store from storage:', error)
    }

    store.subscribe((_mutation, state) => {
      try {
        const toPersist = paths
          ? Object.fromEntries(paths.map((path) => [path, state[path]]))
          : state
        storage.setItem(storageKey, JSON.stringify(toPersist))
      } catch (error) {
        console.warn('[metaowl] Failed to persist store:', error)
      }
    })
  }
}

export function createStore(initialState: StoreState = {}): StoreState & {
  $patch: (partialState: StoreState) => void
  $reset: () => void
} {
  const state = reactive({ ...initialState }) as StoreState & {
    $patch: (partialState: StoreState) => void
    $reset: () => void
  }

  state.$patch = (partialState: StoreState): void => {
    Object.assign(state, partialState)
  }

  state.$reset = (): void => {
    Object.keys(state).forEach((key) => {
      if (!key.startsWith('$')) {
        delete state[key]
      }
    })
    Object.assign(state, initialState)
  }

  return state
}