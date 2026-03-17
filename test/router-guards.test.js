import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  processRoutes,
  beforeEach as beforeEachGuard,
  afterEach as afterEachHook,
  getCurrentRoute,
  getPreviousRoute,
  isNavigating,
  cancelNavigation,
  navigate,
  push,
  replace,
  back,
  forward,
  go,
  router,
  resetRouter
} from '../modules/router.js'

// Mock document.location
describe('Router Guards', () => {
  let originalLocation
  let mockRoutes

  beforeEach(() => {
    // Save original location
    originalLocation = window.location

    // Create a shared pathname that both window.location and document.location will use
    let currentPathname = '/'
    let currentSearch = ''

    const mockLocation = {
      get pathname() { return currentPathname },
      set pathname(value) { currentPathname = value },
      get search() { return currentSearch },
      set search(value) { currentSearch = value },
      get href() { return `http://localhost${currentPathname}${currentSearch}` },
      replace: vi.fn(),
      assign: vi.fn()
    }

    // Mock location
    delete window.location
    window.location = mockLocation

    // Also mock document.location for router (use same object reference)
    document.location = mockLocation

    // Mock history
    window.history = {
      back: vi.fn(),
      forward: vi.fn(),
      go: vi.fn()
    }

    // Reset router state
    vi.clearAllMocks()
    resetRouter()

    // Define test routes
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
    // Restore original location
    window.location = originalLocation
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

      await processRoutes(mockRoutes)

      expect(guard).toHaveBeenCalled()
    })

    it('blocks navigation with next(false)', async () => {
      const guard = vi.fn((to, from, next) => next(false))

      beforeEachGuard(guard)
      window.location.pathname = '/about'

      await expect(processRoutes(mockRoutes)).rejects.toThrow('Navigation cancelled')
    })

    it('allows returning false directly from guard', async () => {
      const guard = vi.fn(() => false)

      beforeEachGuard(guard)
      window.location.pathname = '/about'

      await expect(processRoutes(mockRoutes)).rejects.toThrow('Navigation cancelled')
    })

    it('handles errors in guards', async () => {
      const guard = vi.fn(() => {
        throw new Error('Guard error')
      })

      beforeEachGuard(guard)
      window.location.pathname = '/about'

      await expect(processRoutes(mockRoutes)).rejects.toThrow('Guard error')
    })

    it('removes guard when unsubscribe is called', async () => {
      const guard = vi.fn((to, from, next) => next())

      const unsubscribe = beforeEachGuard(guard)
      unsubscribe()

      window.location.pathname = '/about'
      await processRoutes(mockRoutes)

      // Guard should not be called after unsubscribe
      expect(guard).not.toHaveBeenCalled()
    })

    it('calls multiple guards in order', async () => {
      const order = []

      beforeEachGuard((to, from, next) => {
        order.push(1)
        next()
      })

      beforeEachGuard((to, from, next) => {
        order.push(2)
        next()
      })

      window.location.pathname = '/about'
      await processRoutes(mockRoutes)

      expect(order).toEqual([1, 2])
    })
  })

  describe('afterEach hooks', () => {
    it('provides to and from to hook', async () => {
      const hook = vi.fn((to, from) => {
        expect(to).toHaveProperty('name')
        expect(from).toBeNull() // First navigation
      })

      afterEachHook(hook)
      window.location.pathname = '/about'

      await processRoutes(mockRoutes)

      expect(hook).toHaveBeenCalled()
    })

    it('removes hook when unsubscribe is called', async () => {
      const hook = vi.fn()

      const unsubscribe = afterEachHook(hook)
      unsubscribe()

      window.location.pathname = '/about'
      await processRoutes(mockRoutes)

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
    })

    it('exposes navigation methods', () => {
      expect(typeof router.push).toBe('function')
      expect(typeof router.replace).toBe('function')
      expect(typeof router.back).toBe('function')
      expect(typeof router.forward).toBe('function')
      expect(typeof router.go).toBe('function')
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
