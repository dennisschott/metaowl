import { beforeEach, describe, expect, it } from 'vitest'
import { createPersistencePlugin, createStore, Store } from '../modules/store.js'

describe('Store', () => {
  beforeEach(() => {
    Store.clear()
  })

  describe('Store.define()', () => {
    it('creates a store factory function', () => {
      const useCounterStore = Store.define('counter', {
        state: () => ({ count: 0 })
      })

      expect(typeof useCounterStore).toBe('function')
    })

    it('returns singleton instance on multiple calls', () => {
      const useCounterStore = Store.define('counter', {
        state: () => ({ count: 0 })
      })

      const store1 = useCounterStore()
      const store2 = useCounterStore()

      expect(store1).toBe(store2)
    })

    it('creates reactive state', () => {
      const useCounterStore = Store.define('counter', {
        state: () => ({ count: 0 })
      })

      const store = useCounterStore() as any
      expect(store.state.count).toBe(0)
    })
  })

  describe('state management', () => {
    let useCounterStore: () => Store

    beforeEach(() => {
      useCounterStore = Store.define('counter', {
        state: () => ({ count: 0, name: 'test' }),
        mutations: {
          increment: (state) => ((state as any).count += 1),
          setName: (state, name) => { ;(state as any).name = name },
          add: (state, amount) => { ;(state as any).count += Number(amount) }
        }
      })
    })

    it('commits mutations synchronously', () => {
      const store = useCounterStore() as any
      store.commit('increment')
      expect(store.state.count).toBe(1)
    })

    it('commits mutations with payload', () => {
      const store = useCounterStore() as any
      store.commit('setName', 'new name')
      expect(store.state.name).toBe('new name')
    })

    it('commits mutations with numeric payload', () => {
      const store = useCounterStore() as any
      store.commit('add', 5)
      expect(store.state.count).toBe(5)
    })

    it('throws on unknown mutation', () => {
      const store = useCounterStore()
      expect(() => store.commit('unknown')).toThrow('Mutation "unknown" not found')
    })
  })

  describe('getters', () => {
    it('computes getter values', () => {
      const useCounterStore = Store.define('counter', {
        state: () => ({ count: 5 }),
        getters: {
          double: (state) => (state as any).count * 2,
          triple: (state) => (state as any).count * 3
        }
      })

      const store = useCounterStore() as any
      expect(store.getters.double).toBe(10)
      expect(store.getters.triple).toBe(15)
    })

    it('updates getters when state changes', () => {
      const useCounterStore = Store.define('counter', {
        state: () => ({ count: 5 }),
        getters: {
          double: (state) => (state as any).count * 2
        },
        mutations: {
          increment: (state) => ((state as any).count += 1)
        }
      })

      const store = useCounterStore() as any
      expect(store.getters.double).toBe(10)

      store.commit('increment')
      expect(store.getters.double).toBe(12)
    })
  })

  describe('actions', () => {
    it('dispatches async actions', async () => {
      const useCounterStore = Store.define('counter', {
        state: () => ({ count: 0 }),
        mutations: {
          increment: (state) => ((state as any).count += 1)
        },
        actions: {
          async incrementAsync({ commit }) {
            await new Promise((resolve) => setTimeout(resolve, 10))
            commit('increment')
          }
        }
      })

      const store = useCounterStore() as any
      await store.dispatch('incrementAsync')
      expect(store.state.count).toBe(1)
    })

    it('passes payload to actions', async () => {
      const useCounterStore = Store.define('counter', {
        state: () => ({ count: 0 }),
        mutations: {
          add: (state, amount) => { ;(state as any).count += Number(amount) }
        },
        actions: {
          async addAsync({ commit }, amount) {
            commit('add', amount)
          }
        }
      })

      const store = useCounterStore() as any
      await store.dispatch('addAsync', 10)
      expect(store.state.count).toBe(10)
    })

    it('provides context to actions', async () => {
      const actionContext: Record<string, boolean> = {}

      const useCounterStore = Store.define('counter2', {
        state: () => ({ count: 0 }),
        getters: { double: (state) => (state as any).count * 2 },
        mutations: { increment: (state) => ((state as any).count += 1) },
        actions: {
          async testContext(context) {
            Object.assign(actionContext, {
              hasState: 'state' in context,
              hasGetters: 'getters' in context,
              hasCommit: typeof context.commit === 'function',
              hasDispatch: typeof context.dispatch === 'function'
            })
          }
        }
      })

      const store = useCounterStore()
      await store.dispatch('testContext')

      expect(actionContext.hasState).toBe(true)
      expect(actionContext.hasGetters).toBe(true)
      expect(actionContext.hasCommit).toBe(true)
      expect(actionContext.hasDispatch).toBe(true)
    })

    it('throws on unknown action', async () => {
      const useCounterStore = Store.define('counter', {
        state: () => ({ count: 0 })
      })

      const store = useCounterStore()
      await expect(store.dispatch('unknown')).rejects.toThrow('Action "unknown" not found')
    })

    it('returns action result', async () => {
      const useCounterStore = Store.define('counter', {
        state: () => ({ count: 5 }),
        actions: {
          async fetchData() {
            return { data: 'test' }
          }
        }
      })

      const store = useCounterStore()
      const result = await store.dispatch('fetchData')
      expect(result).toEqual({ data: 'test' })
    })
  })

  describe('subscriptions', () => {
    it('notifies subscribers on mutation', () => {
      const useCounterStore = Store.define('counter', {
        state: () => ({ count: 0 }),
        mutations: { increment: (state) => ((state as any).count += 1) }
      })

      const store = useCounterStore() as any
      let receivedMutation: any
      let receivedState: any
      let receivedPrevState: any
      store.subscribe((mutation: any, state: any, prevState: any) => {
        receivedMutation = mutation
        receivedState = state
        receivedPrevState = prevState
      })

      store.commit('increment')

      expect(receivedMutation.type).toBe('increment')
      expect(receivedState.count).toBe(1)
      expect(receivedPrevState.count).toBe(0)
    })

    it('allows unsubscribing', () => {
      const useCounterStore = Store.define('counter', {
        state: () => ({ count: 0 }),
        mutations: { increment: (state) => ((state as any).count += 1) }
      })

      const store = useCounterStore()
      let callCount = 0
      const unsubscribe = store.subscribe(() => {
        callCount += 1
      })

      store.commit('increment')
      expect(callCount).toBe(1)

      unsubscribe()
      store.commit('increment')
      expect(callCount).toBe(1)
    })
  })

  describe('action subscriptions', () => {
    it('notifies action subscribers', async () => {
      const useCounterStore = Store.define('counter', {
        state: () => ({ count: 0 }),
        actions: {
          async testAction() {
            return 'result'
          }
        }
      })

      const store = useCounterStore()
      const events: Array<{ action: any; status: string; result?: unknown }> = []

      store.subscribeAction((action, status, result) => {
        events.push({ action, status, result })
      })

      await store.dispatch('testAction')

      expect(events.length).toBe(2)
      expect(events[0]?.status).toBe('before')
      expect(events[1]?.status).toBe('after')
      expect(events[1]?.result).toBe('result')
    })

    it('notifies on action error', async () => {
      const useCounterStore = Store.define('counter', {
        actions: {
          async failingAction() {
            throw new Error('test error')
          }
        }
      })

      const store = useCounterStore()
      const events: Array<{ action: any; status: string; result?: unknown }> = []

      store.subscribeAction((action, status, result) => {
        events.push({ action, status, result })
      })

      try {
        await store.dispatch('failingAction')
      } catch {
        // expected
      }

      expect(events.length).toBe(2)
      expect(events[0]?.status).toBe('before')
      expect(events[1]?.status).toBe('error')
    })
  })

  describe('reset', () => {
    it('resets state to initial values', () => {
      const useCounterStore = Store.define('counter', {
        state: () => ({ count: 0, name: 'initial' }),
        mutations: {
          setCount: (state, value) => { ;(state as any).count = value },
          setName: (state, value) => { ;(state as any).name = value }
        }
      })

      const store = useCounterStore() as any
      store.commit('setCount', 100)
      store.commit('setName', 'changed')

      store.reset()

      expect(store.state.count).toBe(0)
      expect(store.state.name).toBe('initial')
    })
  })

  describe('static methods', () => {
    it('Store.get() retrieves store by id', () => {
      const useCounterStore = Store.define('counter', {
        state: () => ({ count: 0 })
      })

      const store = useCounterStore()
      const retrieved = Store.get('counter')
      expect(retrieved).toBe(store)
    })

    it('Store.has() checks store existence', () => {
      const useCounterStore = Store.define('counter', {
        state: () => ({ count: 0 })
      })

      useCounterStore()
      expect(Store.has('counter')).toBe(true)
      expect(Store.has('unknown')).toBe(false)
    })

    it('Store.remove() removes store', () => {
      const useCounterStore = Store.define('counter', {
        state: () => ({ count: 0 })
      })

      useCounterStore()
      expect(Store.has('counter')).toBe(true)

      Store.remove('counter')
      expect(Store.has('counter')).toBe(false)
    })

    it('Store.storeIds() returns all store IDs', () => {
      const useStore1 = Store.define('store1', { state: () => ({}) })
      const useStore2 = Store.define('store2', { state: () => ({}) })

      useStore1()
      useStore2()

      const ids = Store.storeIds()
      expect(ids).toContain('store1')
      expect(ids).toContain('store2')
    })
  })

  describe('persistence plugin', () => {
    it('persists state to storage', () => {
      const storage: { data: Record<string, string>; getItem: (key: string) => string | null; setItem: (key: string, value: string) => void } = {
        data: {},
        getItem(key) { return this.data[key] || null },
        setItem(key, value) { this.data[key] = value }
      }

      Store.use(createPersistencePlugin({ storage }))

      const useCounterStore = Store.define('counter', {
        state: () => ({ count: 0 }),
        mutations: { increment: (state) => ((state as any).count += 1) }
      })

      const store = useCounterStore()
      store.commit('increment')

      expect(storage.data['metaowl:store:counter']).toContain('"count":1')
    })

    it('restores state from storage', () => {
      const storage: { data: Record<string, string>; getItem: (key: string) => string | null; setItem: (key: string, value: string) => void } = {
        data: { 'metaowl:store:counter': '{"count":42}' },
        getItem(key) { return this.data[key] || null },
        setItem(key, value) { this.data[key] = value }
      }

      Store.use(createPersistencePlugin({ storage }))

      const useCounterStore = Store.define('counter', {
        state: () => ({ count: 0 }),
        mutations: { increment: (state) => ((state as any).count += 1) }
      })

      const store = useCounterStore() as any
      expect(store.state.count).toBe(42)
    })

    it('persists only specified paths', () => {
      const storage: { data: Record<string, string>; getItem: (key: string) => string | null; setItem: (key: string, value: string) => void } = {
        data: {},
        getItem(key) { return this.data[key] || null },
        setItem(key, value) { this.data[key] = value }
      }

      Store.use(createPersistencePlugin({ storage, paths: ['persistent'] }))

      const useStore = Store.define('test', {
        state: () => ({ persistent: 'value', temporary: 'data' }),
        mutations: {
          setPersistent: (state, value) => { ;(state as any).persistent = value },
          setTemporary: (state, value) => { ;(state as any).temporary = value }
        }
      })

      const store = useStore()
      store.commit('setPersistent', 'new value')
      store.commit('setTemporary', 'new temp')

      const saved = JSON.parse(storage.data['metaowl:store:test'] || '{}') as Record<string, unknown>
      expect(saved.persistent).toBe('new value')
      expect(saved.temporary).toBeUndefined()
    })
  })
})

describe('createStore', () => {
  it('creates reactive state object', () => {
    const state = createStore({ count: 0 }) as any
    expect(state.count).toBe(0)
  })

  it('has $patch method for batch updates', () => {
    const state = createStore({ count: 0, name: 'test' }) as any

    state.$patch({ count: 10, name: 'updated' })

    expect(state.count).toBe(10)
    expect(state.name).toBe('updated')
  })

  it('has $reset method to restore initial state', () => {
    const state = createStore({ count: 0 }) as any

    state.count = 100
    state.$reset()

    expect(state.count).toBe(0)
  })
})