import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  afterEach as afterEachHook,
  back,
  beforeEach as beforeEachGuard,
  cancelNavigation,
  forward,
  getCurrentRoute,
  getPreviousRoute,
  go,
  isNavigating,
  navigate,
  processRoutes,
  push,
  replace,
  resetRouter,
  router
} from '../modules/router.js'

describe('Router Guards', () => {
  let originalLocation: Location
  let originalDocument: Document
  let mockRoutes: Array<Record<string, unknown>>

  beforeEach(() => {
    originalLocation = window.location
    originalDocument = document

    let currentPathname = '/'
    let currentSearch = ''

    const mockLocation = {
      get pathname() { return currentPathname },
      set pathname(value: string) { currentPathname = value },
      get search() { return currentSearch },
      set search(value: string) { currentSearch = value },
      get href() { return `http://localhost${currentPathname}${currentSearch}` },
      set href(value: string) {
        const url = new URL(value, 'http://localhost')
        currentPathname = url.pathname
        currentSearch = url.search
      },
      replace: vi.fn(),
      assign: vi.fn()
    }

    Object.defineProperty(window, 'location', {
      value: mockLocation,
      configurable: true,
      writable: true
    })
    Object.defineProperty(globalThis, 'document', {
      value: { location: mockLocation },
      configurable: true,
      writable: true
    })

    window.history = {
      ...window.history,
      back: vi.fn(),
      forward: vi.fn(),
      go: vi.fn(),
      pushState: vi.fn(),
      replaceState: vi.fn()
    }

    vi.clearAllMocks()
    resetRouter()

    mockRoutes = [
      { name: 'index', path: ['/'], component: class Index {} },
      { name: 'about', path: ['/about'], component: class About {} },
      { name: 'user', path: ['/user/:id'], component: class User {} },
      {
        name: 'admin',
        path: ['/admin'],
        component: class Admin {},
        meta: { requiresAuth: true },
        beforeEnter: null
      },
      { name: 'login', path: ['/login'], component: class Login {} }
    ]
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      configurable: true,
      writable: true
    })
    Object.defineProperty(globalThis, 'document', {
      value: originalDocument,
      configurable: true,
      writable: true
    })
  })

  describe('beforeEach guards', () => {
    it('provides to, from, and next to guard', async () => {
      const guard = vi.fn((to, from, next) => {
        expect(to).toHaveProperty('name')
        expect(to).toHaveProperty('path')
        expect(to).toHaveProperty('fullPath')
        expect(to).toHaveProperty('meta')
        expect(typeof next).toBe('function')
        next()
      })

      beforeEachGuard(guard)
      window.location.pathname = '/about'

      await processRoutes(mockRoutes as any)

      expect(guard).toHaveBeenCalled()
    })

    it('blocks navigation with next(false)', async () => {
      const guard = vi.fn((_to, _from, next) => next(false))

      beforeEachGuard(guard)
      window.location.pathname = '/about'

      await expect(processRoutes(mockRoutes as any)).rejects.toThrow('Navigation cancelled')
    })

    it('allows returning false directly from guard', async () => {
      const guard = vi.fn(() => false)

      beforeEachGuard(guard)
      window.location.pathname = '/about'

      await expect(processRoutes(mockRoutes as any)).rejects.toThrow('Navigation cancelled')
    })

    it('handles errors in guards', async () => {
      const guard = vi.fn(() => {
        throw new Error('Guard error')
      })

      beforeEachGuard(guard)
      window.location.pathname = '/about'

      await expect(processRoutes(mockRoutes as any)).rejects.toThrow('Guard error')
    })

    it('removes guard when unsubscribe is called', async () => {
      const guard = vi.fn((_to, _from, next) => next())

      const unsubscribe = beforeEachGuard(guard)
      unsubscribe()

      window.location.pathname = '/about'
      await processRoutes(mockRoutes as any)

      expect(guard).not.toHaveBeenCalled()
    })

    it('calls multiple guards in order', async () => {
      const order: number[] = []

      beforeEachGuard((_to, _from, next) => {
        order.push(1)
        next()
      })

      beforeEachGuard((_to, _from, next) => {
        order.push(2)
        next()
      })

      window.location.pathname = '/about'
      await processRoutes(mockRoutes as any)

      expect(order).toEqual([1, 2])
    })
  })

  describe('afterEach hooks', () => {
    it('provides to and from to hook', async () => {
      const hook = vi.fn((to, from) => {
        expect(to).toHaveProperty('name')
        expect(from).toBeNull()
      })

      afterEachHook(hook)
      window.location.pathname = '/about'

      await processRoutes(mockRoutes as any)

      expect(hook).toHaveBeenCalled()
    })

    it('removes hook when unsubscribe is called', async () => {
      const hook = vi.fn()

      const unsubscribe = afterEachHook(hook)
      unsubscribe()

      window.location.pathname = '/about'
      await processRoutes(mockRoutes as any)

      expect(hook).not.toHaveBeenCalled()
    })
  })

  describe('route state tracking', () => {
    it('exposes beforeEach method', () => {
      expect(router.beforeEach).toBe(beforeEachGuard)
    })

    it('exposes afterEach method', () => {
      expect(router.afterEach).toBe(afterEachHook)
    })

    it('exposes isNavigating getter', () => {
      expect(typeof router.isNavigating).toBe('boolean')
      expect(typeof isNavigating()).toBe('boolean')
    })

    it('exposes navigation methods', () => {
      expect(typeof router.push).toBe('function')
      expect(typeof router.replace).toBe('function')
      expect(typeof router.back).toBe('function')
      expect(typeof router.forward).toBe('function')
      expect(typeof router.go).toBe('function')
      expect(typeof navigate).toBe('function')
      expect(typeof push).toBe('function')
      expect(typeof replace).toBe('function')
      expect(typeof cancelNavigation).toBe('function')
      expect(getCurrentRoute()).toBeNull()
      expect(getPreviousRoute()).toBeNull()
    })

    it('back calls history.back', () => {
      back()
      expect(window.history.back).toHaveBeenCalled()
    })

    it('forward calls history.forward', () => {
      forward()
      expect(window.history.forward).toHaveBeenCalled()
    })

    it('go calls history.go', () => {
      go(-2)
      expect(window.history.go).toHaveBeenCalledWith(-2)
    })
  })
})