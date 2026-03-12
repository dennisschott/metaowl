import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  createMockStore,
  mockRouter,
  mountComponent,
  wait,
  nextTick,
  flushPromises,
  userEvent,
  dom,
  TestUtils
} from '../modules/test-utils.js'

describe('TestUtils', () => {
  describe('Exports', () => {
    it('should export all functions', () => {
      expect(typeof createMockStore).toBe('function')
      expect(typeof mockRouter).toBe('function')
      expect(typeof mountComponent).toBe('function')
      expect(typeof wait).toBe('function')
      expect(typeof nextTick).toBe('function')
      expect(typeof flushPromises).toBe('function')
      expect(typeof userEvent.click).toBe('function')
      expect(typeof dom.query).toBe('function')
    })

    it('should export TestUtils namespace', () => {
      expect(TestUtils.createMockStore).toBe(createMockStore)
      expect(TestUtils.mockRouter).toBe(mockRouter)
      expect(TestUtils.mountComponent).toBe(mountComponent)
    })
  })

  describe('createMockStore', () => {
    it('should create store with initial state', () => {
      const store = createMockStore({
        state: { count: 0, user: null }
      })

      expect(store.state.count).toBe(0)
      expect(store.state.user).toBeNull()
    })

    it('should handle mutations', () => {
      const store = createMockStore({
        state: { count: 0 },
        mutations: {
          increment: (state) => { state.count++ },
          add: (state, n) => { state.count += n }
        }
      })

      store.commit('increment')
      expect(store.state.count).toBe(1)

      store.commit('add', 5)
      expect(store.state.count).toBe(6)
    })

    it('should handle actions', async () => {
      const store = createMockStore({
        state: { user: null },
        mutations: {
          setUser: (state, user) => { state.user = user }
        },
        actions: {
          login: async ({ commit }, credentials) => {
            const user = { name: 'Test User', email: credentials.email }
            commit('setUser', user)
            return user
          }
        }
      })

      const result = await store.dispatch('login', { email: 'test@test.com', password: '123' })

      expect(store.state.user.name).toBe('Test User')
      expect(result.name).toBe('Test User')
    })

    it('should handle getters', () => {
      const store = createMockStore({
        state: { count: 5 },
        getters: {
          doubled: (state) => state.count * 2,
          isPositive: (state) => state.count > 0
        }
      })

      expect(store.getters.doubled).toBe(10)
      expect(store.getters.isPositive).toBe(true)
    })

    it('should reset state', () => {
      const store = createMockStore({
        state: { count: 0, name: 'Initial' }
      })

      store.state.count = 10
      store.state.name = 'Changed'

      store.reset()

      expect(store.state.count).toBe(0)
      expect(store.state.name).toBe('Initial')
    })

    it('should set state directly', () => {
      const store = createMockStore({
        state: { count: 0 }
      })

      store.setState({ count: 42, extra: 'value' })

      expect(store.state.count).toBe(42)
      expect(store.state.extra).toBe('value')
    })
  })

  describe('mockRouter', () => {
    it('should create router with initial route', () => {
      const router = mockRouter({
        initialRoute: '/dashboard'
      })

      expect(router.currentRoute.path).toBe('/dashboard')
    })

    it('should navigate with push', async () => {
      const router = mockRouter({
        routes: [{ path: '/', name: 'home' }, { path: '/about', name: 'about' }]
      })

      await router.push('/about')

      expect(router.currentRoute.path).toBe('/about')
      expect(router.currentRoute.name).toBe('about')
    })

    it('should parse route params', async () => {
      const router = mockRouter({
        routes: [{ path: '/user/:id', name: 'user' }]
      })

      await router.push('/user/123')

      expect(router.currentRoute.params.id).toBe('123')
    })

    it('should parse query params', async () => {
      const router = mockRouter()

      await router.push('/search?q=test&page=2')

      expect(router.currentRoute.query.q).toBe('test')
      expect(router.currentRoute.query.page).toBe('2')
    })

    it('should run beforeEach guards', async () => {
      const guard = vi.fn()
      const router = mockRouter()

      router.beforeEach(guard)
      await router.push('/protected')

      expect(guard).toHaveBeenCalled()
    })

    it('should run afterEach hooks', async () => {
      const hook = vi.fn()
      const router = mockRouter()

      router.afterEach(hook)
      await router.push('/page')

      expect(hook).toHaveBeenCalled()
    })

    it('should unsubscribe from guards', async () => {
      const guard = vi.fn()
      const router = mockRouter()

      const unsubscribe = router.beforeEach(guard)
      unsubscribe()

      await router.push('/page')
      expect(guard).not.toHaveBeenCalled()
    })

    it('should resolve named routes', () => {
      const router = mockRouter({
        routes: [
          { path: '/', name: 'home' },
          { path: '/user/:id', name: 'user' }
        ]
      })

      expect(router.resolve('home')).toBe('/')
      expect(router.resolve('user', { id: 123 })).toBe('/user/123')
    })

    it('should handle hash', async () => {
      const router = mockRouter()

      await router.push('/page#section1')

      expect(router.currentRoute.hash).toBe('section1')
    })
  })

  describe('Async utilities', () => {
    it('wait should delay execution', async () => {
      const start = Date.now()
      await wait(50)
      const elapsed = Date.now() - start

      expect(elapsed).toBeGreaterThanOrEqual(45)
    })

    it('flushPromises should resolve pending promises', async () => {
      let resolved = false
      Promise.resolve().then(() => { resolved = true })

      expect(resolved).toBe(false)
      await flushPromises()
      expect(resolved).toBe(true)
    })
  })

  describe('DOM utilities', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div id="app">
          <button class="btn primary">Click me</button>
          <span class="text">Hello World</span>
        </div>
      `
    })

    it('should query element', () => {
      const button = dom.query('.btn')
      expect(button).not.toBeNull()
      expect(button.tagName).toBe('BUTTON')
    })

    it('should query all elements', () => {
      const spans = dom.queryAll('.text')
      expect(spans.length).toBe(1)
    })

    it('should check for class', () => {
      const button = dom.query('.btn')
      expect(dom.hasClass(button, 'btn')).toBe(true)
      expect(dom.hasClass(button, 'primary')).toBe(true)
      expect(dom.hasClass(button, 'nonexistent')).toBe(false)
    })

    it('should get text content', () => {
      const span = dom.query('.text')
      expect(dom.text(span)).toBe('Hello World')
    })
  })

  describe('userEvent utilities', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <input id="input" type="text" />
        <form id="form">
          <button type="submit">Submit</button>
        </form>
        <select id="select">
          <option value="a">A</option>
          <option value="b">B</option>
        </select>
      `
    })

    it('should simulate click', async () => {
      const button = document.querySelector('button')
      const handler = vi.fn()
      button.addEventListener('click', handler)

      await userEvent.click(button)

      expect(handler).toHaveBeenCalled()
    })

    it('should simulate typing', async () => {
      const input = document.querySelector('#input')

      await userEvent.type(input, 'hello')

      expect(input.value).toBe('hello')
    })

    it('should simulate form submit', async () => {
      const form = document.querySelector('#form')
      const handler = vi.fn(e => e.preventDefault())
      form.addEventListener('submit', handler)

      await userEvent.submit(form)

      expect(handler).toHaveBeenCalled()
    })

    it('should simulate select change', async () => {
      const select = document.querySelector('#select')

      await userEvent.select(select, 'b')

      expect(select.value).toBe('b')
    })
  })
})
