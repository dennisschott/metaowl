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

    // Mock location - create a new object that can be used for both window and document
    const mockLocation = {
      pathname: '/',
      search: '',
      href: 'http://localhost/',
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
    it('registers and calls global beforeEach guard', async () => {
      const guard = vi.fn((to, from, next) => next())

      beforeEachGuard(guard)
      window.location.pathname = '/about'

      await processRoutes(mockRoutes)

      expect(guard).toHaveBeenCalled()
      expect(guard.mock.calls[0][0].name).toBe('about')
      expect(guard.mock.calls[0][0].fullPath).toBe('/about')
    })

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

    it('allows navigation with next()', async () => {
      const guard = vi.fn((to, from, next) => next())

      beforeEachGuard(guard)
      window.location.pathname = '/about'

      const result = await processRoutes(mockRoutes)

      expect(result).toBeDefined()
      expect(result[0].name).toBe('about')
    })

    it('blocks navigation with next(false)', async () => {
      const guard = vi.fn((to, from, next) => next(false))

      beforeEachGuard(guard)
      window.location.pathname = '/about'

      await expect(processRoutes(mockRoutes)).rejects.toThrow('Navigation cancelled')
    })

    it('redirects with next(path)', async () => {
      const guard = vi.fn((to, from, next) => {
        if (to.meta.requiresAuth) {
          next('/login')
        } else {
          next()
        }
      })

      beforeEachGuard(guard)

      // Mock window.location.href setter
      const hrefSetter = vi.fn()
      Object.defineProperty(window, 'location', {
        value: {
          ...window.location,
          pathname: '/admin',
          href: '',
          get href() { return '' },
          set href(val) { hrefSetter(val) }
        },
        writable: true
      })

      mockRoutes[3].beforeEnter = guard
      await expect(processRoutes(mockRoutes)).rejects.toThrow('Navigation redirect')
    })

    it('allows returning path directly from guard', async () => {
      const guard = vi.fn((to, from, next) => {
        return '/login'
      })

      beforeEachGuard(guard)
      window.location.pathname = '/admin'
      mockRoutes[3].meta = { requiresAuth: true }

      await expect(processRoutes(mockRoutes)).rejects.toThrow('Navigation redirect')
    })

    it('allows returning false directly from guard', async () => {
      const guard = vi.fn((to, from, next) => {
        return false
      })

      beforeEachGuard(guard)
      window.location.pathname = '/about'

      await expect(processRoutes(mockRoutes)).rejects.toThrow('Navigation cancelled')
    })

    it('supports async guards', async () => {
      const guard = vi.fn(async (to, from, next) => {
        await new Promise(resolve => setTimeout(resolve, 10))
        next()
      })

      beforeEachGuard(guard)
      window.location.pathname = '/about'

      const result = await processRoutes(mockRoutes)

      expect(guard).toHaveBeenCalled()
      expect(result[0].name).toBe('about')
    })

    it('handles errors in guards', async () => {
      const guard = vi.fn((to, from, next) => {
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

      // Guard was called only once before unsubscribe
      expect(guard).not.toHaveBeenCalled()
    })

    it('calls multiple guards in order', async () => {
      const order = []
      const guard1 = vi.fn((to, from, next) => { order.push(1); next() })
      const guard2 = vi.fn((to, from, next) => { order.push(2); next() })
      const guard3 = vi.fn((to, from, next) => { order.push(3); next() })

      beforeEachGuard(guard1)
      beforeEachGuard(guard2)
      beforeEachGuard(guard3)

      window.location.pathname = '/about'
      await processRoutes(mockRoutes)

      expect(order).toEqual([1, 2, 3])
    })
  })

  describe('afterEach hooks', () => {
    it('calls afterEach hooks after navigation', async () => {
      const hook = vi.fn()

      afterEachHook(hook)
      window.location.pathname = '/about'

      await processRoutes(mockRoutes)

      expect(hook).toHaveBeenCalled()
      expect(hook.mock.calls[0][0].name).toBe('about')
    })

    it('provides to and from to hook', async () => {
      const hook = vi.fn((to, from) => {
        expect(to).toHaveProperty('name')
        expect(to).toHaveProperty('path')
        expect(from).toBeNull() // No previous route on initial
      })

      afterEachHook(hook)
      window.location.pathname = '/about'

      await processRoutes(mockRoutes)

      expect(hook).toHaveBeenCalled()
    })

    it('provides previous route on second navigation', async () => {
      let capturedFrom = null

      afterEachHook((to, from) => {
        capturedFrom = from
      })

      // First navigation
      window.location.pathname = '/'
      await processRoutes(mockRoutes)

      // Second navigation
      window.location.pathname = '/about'
      await processRoutes(mockRoutes)

      expect(capturedFrom).not.toBeNull()
      expect(capturedFrom.name).toBe('index')
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

  describe('per-route beforeEnter', () => {
    it('calls beforeEnter when defined on route', async () => {
      const beforeEnter = vi.fn((to, from, next) => next())

      mockRoutes[3].beforeEnter = beforeEnter
      window.location.pathname = '/admin'

      await processRoutes(mockRoutes)

      expect(beforeEnter).toHaveBeenCalled()
    })

    it('runs per-route guard after global guards', async () => {
      const order = []
      const globalGuard = vi.fn((to, from, next) => { order.push('global'); next() })
      const routeGuard = vi.fn((to, from, next) => { order.push('route'); next() })

      beforeEachGuard(globalGuard)
      mockRoutes[3].beforeEnter = routeGuard

      window.location.pathname = '/admin'
      await processRoutes(mockRoutes)

      expect(order).toEqual(['global', 'route'])
    })

    it('blocks navigation in beforeEnter', async () => {
      const beforeEnter = vi.fn((to, from, next) => next(false))

      mockRoutes[3].beforeEnter = beforeEnter
      window.location.pathname = '/admin'

      await expect(processRoutes(mockRoutes)).rejects.toThrow('Navigation cancelled')
    })
  })

  describe('route metadata', () => {
    it('provides meta object on route', async () => {
      const guard = vi.fn((to, from, next) => {
        expect(to.meta).toEqual({ requiresAuth: true })
        next()
      })

      beforeEachGuard(guard)

      window.location.pathname = '/admin'
      mockRoutes[3].meta = { requiresAuth: true }

      await processRoutes(mockRoutes)

      expect(guard).toHaveBeenCalled()
    })

    it('meta is empty object when not defined', async () => {
      const guard = vi.fn((to, from, next) => {
        expect(to.meta).toEqual({})
        next()
      })

      beforeEachGuard(guard)
      window.location.pathname = '/about'

      await processRoutes(mockRoutes)

      expect(guard).toHaveBeenCalled()
    })
  })

  describe('query string parsing', () => {
    it('parses query parameters into route', async () => {
      const guard = vi.fn((to, from, next) => {
        expect(to.query).toEqual({ foo: 'bar', baz: 'qux' })
        next()
      })

      beforeEachGuard(guard)

      window.location.pathname = '/about'
      window.location.search = '?foo=bar&baz=qux'

      await processRoutes(mockRoutes)

      expect(guard).toHaveBeenCalled()
    })

    it('handles empty query string', async () => {
      const guard = vi.fn((to, from, next) => {
        expect(to.query).toEqual({})
        next()
      })

      beforeEachGuard(guard)

      window.location.pathname = '/about'
      window.location.search = ''

      await processRoutes(mockRoutes)

      expect(guard).toHaveBeenCalled()
    })

    it('handles repeated query parameters as array', async () => {
      const guard = vi.fn((to, from, next) => {
        expect(to.query.tag).toEqual(['foo', 'bar'])
        next()
      })

      beforeEachGuard(guard)

      window.location.pathname = '/about'
      window.location.search = '?tag=foo&tag=bar'

      await processRoutes(mockRoutes)

      expect(guard).toHaveBeenCalled()
    })
  })

  describe('dynamic route parameters', () => {
    it('extracts params from dynamic routes', async () => {
      const guard = vi.fn((to, from, next) => {
        expect(to.params).toEqual({ id: '123' })
        next()
      })

      beforeEachGuard(guard)

      window.location.pathname = '/user/123'

      await processRoutes(mockRoutes)

      expect(guard).toHaveBeenCalled()
    })

    it('params is empty object for static routes', async () => {
      const guard = vi.fn((to, from, next) => {
        expect(to.params).toEqual({})
        next()
      })

      beforeEachGuard(guard)

      window.location.pathname = '/about'

      await processRoutes(mockRoutes)

      expect(guard).toHaveBeenCalled()
    })
  })

  describe('route state tracking', () => {
    it('tracks current route', async () => {
      window.location.pathname = '/about'

      await processRoutes(mockRoutes)

      expect(getCurrentRoute().name).toBe('about')
      expect(getCurrentRoute().fullPath).toBe('/about')
    })

    it('tracks previous route after second navigation', async () => {
      window.location.pathname = '/'
      await processRoutes(mockRoutes)

      window.location.pathname = '/about'
      await processRoutes(mockRoutes)

      expect(getPreviousRoute().name).toBe('index')
      expect(getCurrentRoute().name).toBe('about')
    })
  })

  describe('navigation state', () => {
    it('tracks navigation in progress', async () => {
      let wasNavigating = false

      beforeEachGuard((to, from, next) => {
        wasNavigating = isNavigating()
        next()
      })

      window.location.pathname = '/about'
      await processRoutes(mockRoutes)

      expect(wasNavigating).toBe(true)
      expect(isNavigating()).toBe(false)
    })

    it('can cancel navigation', async () => {
      const guard = vi.fn((to, from, next) => {
        cancelNavigation()
        next()
      })

      beforeEachGuard(guard)
      window.location.pathname = '/about'

      // Should still complete because cancel just sets flag
      const result = await processRoutes(mockRoutes)
      expect(result).toBeDefined()
    })
  })

  describe('router singleton', () => {
    it('exposes beforeEach method', () => {
      expect(typeof router.beforeEach).toBe('function')
    })

    it('exposes afterEach method', () => {
      expect(typeof router.afterEach).toBe('function')
    })

    it('exposes currentRoute getter', () => {
      expect(router.currentRoute).toBeNull()
    })

    it('exposes previousRoute getter', () => {
      expect(router.previousRoute).toBeNull()
    })

    it('exposes isNavigating getter', () => {
      expect(router.isNavigating).toBe(false)
    })

    it('exposes navigation methods', () => {
      expect(typeof router.push).toBe('function')
      expect(typeof router.replace).toBe('function')
      expect(typeof router.back).toBe('function')
      expect(typeof router.forward).toBe('function')
      expect(typeof router.go).toBe('function')
      expect(typeof router.cancel).toBe('function')
    })
  })

  describe('navigation helpers', () => {
    it('push navigates to path', () => {
      push('/new-path')

      expect(window.location.href).toBe('/new-path')
    })

    it('replace replaces current history entry', () => {
      replace('/new-path')

      expect(window.location.replace).toHaveBeenCalledWith('/new-path')
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

  describe('auth guard pattern', () => {
    it('implements typical auth guard pattern', async () => {
      // Mock auth state
      const auth = { isLoggedIn: false }

      const authGuard = vi.fn((to, from, next) => {
        if (to.meta.requiresAuth && !auth.isLoggedIn) {
          next('/login')
        } else {
          next()
        }
      })

      beforeEachGuard(authGuard)

      // Try to access protected route while not logged in
      window.location.pathname = '/admin'
      mockRoutes[3].meta = { requiresAuth: true }

      await expect(processRoutes(mockRoutes)).rejects.toThrow('Navigation redirect')

      // Now login and try again
      auth.isLoggedIn = true

      // Reset the mock to allow navigation
      authGuard.mockImplementation((to, from, next) => {
        if (to.meta.requiresAuth && !auth.isLoggedIn) {
          next('/login')
        } else {
          next()
        }
      })

      const result = await processRoutes(mockRoutes)
      expect(result[0].name).toBe('admin')
    })
  })

  describe('role-based guard pattern', () => {
    it('implements role-based access control', async () => {
      const auth = { user: { role: 'user' } }

      const roleGuard = vi.fn((to, from, next) => {
        if (to.meta.requiredRole && to.meta.requiredRole !== auth.user.role) {
          next('/unauthorized')
        } else {
          next()
        }
      })

      beforeEachGuard(roleGuard)

      // Try to access admin route as regular user
      window.location.pathname = '/admin'
      mockRoutes[3].meta = { requiredRole: 'admin' }

      await expect(processRoutes(mockRoutes)).rejects.toThrow('Navigation redirect')

      // Change to admin role
      auth.user.role = 'admin'

      const result = await processRoutes(mockRoutes)
      expect(result[0].name).toBe('admin')
    })
  })
})
