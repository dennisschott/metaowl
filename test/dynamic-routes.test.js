import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  pathFromKey,
  matchRoute,
  isDynamicRoute,
  findRoute,
  generateUrl,
  validateRouteParams,
  createCatchAllRoute,
  createRedirectRoute,
  buildRoutes,
  defineRoute,
  route
} from '../modules/file-router.js'

// Mock Component class
class MockComponent {
  static template = '<div>Mock</div>'
}

class TestPage extends MockComponent {}
class UserPage extends MockComponent {}
class ProductPage extends MockComponent {}
class CatchAllPage extends MockComponent {}

describe('Dynamic Routes', () => {
  describe('pathFromKey', () => {
    it('converts static routes', () => {
      expect(pathFromKey('./pages/about/About.js')).toBe('/about')
      expect(pathFromKey('./pages/blog/post/Post.js')).toBe('/blog/post')
    })

    it('converts index route', () => {
      expect(pathFromKey('./pages/index/Index.js')).toBe('/')
    })

    it('converts [param] routes', () => {
      expect(pathFromKey('./pages/user/[id]/User.js')).toBe('/user/:id')
    })

    it('converts nested [params]', () => {
      expect(pathFromKey('./pages/product/[category]/[slug]/Product.js'))
        .toBe('/product/:category/:slug')
    })

    it('converts optional params [param?]', () => {
      expect(pathFromKey('./pages/blog/[id]/[slug?]/Blog.js'))
        .toBe('/blog/:id/:slug?')
    })

    it('converts catch-all [...path]', () => {
      expect(pathFromKey('./pages/docs/[...path]/Docs.js'))
        .toBe('/docs/:path(.*)')
    })

    it('handles root level params', () => {
      expect(pathFromKey('./pages/[id]/Page.js')).toBe('/:id')
    })
  })

  describe('matchRoute', () => {
    it('matches static routes', () => {
      const match = matchRoute('/about', '/about')
      expect(match).toEqual({ params: {}, pattern: '/about' })
    })

    it('extracts single param', () => {
      const match = matchRoute('/user/:id', '/user/123')
      expect(match.params).toEqual({ id: '123' })
    })

    it('extracts multiple params', () => {
      const match = matchRoute('/product/:category/:slug', '/product/tech/hello-world')
      expect(match.params).toEqual({ category: 'tech', slug: 'hello-world' })
    })

    it('returns null for non-matching route', () => {
      const match = matchRoute('/user/:id', '/about')
      expect(match).toBeNull()
    })

    it('matches optional params when provided', () => {
      const match = matchRoute('/blog/:id/:slug?', '/blog/123/my-post')
      expect(match.params).toEqual({ id: '123', slug: 'my-post' })
    })

    it('matches optional params when omitted', () => {
      const match = matchRoute('/blog/:id/:slug?', '/blog/123')
      expect(match.params).toEqual({ id: '123' })
    })

    it('matches catch-all routes', () => {
      const match = matchRoute('/docs/:path(.*)', '/docs/getting-started/install')
      expect(match.params).toEqual({ path: 'getting-started/install' })
    })

    it('handles root catch-all', () => {
      const match = matchRoute('/:path(.*)', '/anything/here')
      expect(match.params).toEqual({ path: 'anything/here' })
    })

    it('handles routes with special characters in params', () => {
      const match = matchRoute('/user/:id', '/user/user%40example.com')
      expect(match.params.id).toBe('user%40example.com')
    })

    it('does not match when required param is missing', () => {
      const match = matchRoute('/user/:id/profile', '/user/')
      expect(match).toBeNull()
    })
  })

  describe('isDynamicRoute', () => {
    it('returns true for routes with params', () => {
      expect(isDynamicRoute('/user/:id')).toBe(true)
      expect(isDynamicRoute('/product/:category/:id')).toBe(true)
    })

    it('returns false for static routes', () => {
      expect(isDynamicRoute('/about')).toBe(false)
      expect(isDynamicRoute('/blog/post')).toBe(false)
    })

    it('returns true for optional params', () => {
      expect(isDynamicRoute('/blog/:id?')).toBe(true)
    })

    it('returns true for catch-all', () => {
      expect(isDynamicRoute('/:path(.*)')).toBe(true)
    })
  })

  describe('findRoute', () => {
    const routes = [
      { name: 'index', path: ['/'], component: MockComponent },
      { name: 'about', path: ['/about'], component: MockComponent },
      { name: 'user', path: ['/user/:id'], component: UserPage, params: ['id'] },
      { name: 'product', path: ['/product/:category/:slug'], component: ProductPage, params: ['category', 'slug'] },
      { name: 'catch-all', path: ['/:path(.*)'], component: CatchAllPage, params: ['path'] }
    ]

    it('finds static route', () => {
      const route = findRoute(routes, '/about')
      expect(route.name).toBe('about')
    })

    it('finds dynamic route with params', () => {
      const route = findRoute(routes, '/user/123')
      expect(route.name).toBe('user')
      expect(route.params).toEqual({ id: '123' })
    })

    it('finds route with multiple params', () => {
      const route = findRoute(routes, '/product/tech/hello')
      expect(route.name).toBe('product')
      expect(route.params).toEqual({ category: 'tech', slug: 'hello' })
    })

    it('finds catch-all route', () => {
      const route = findRoute(routes, '/not/a/known/path')
      expect(route.name).toBe('catch-all')
      expect(route.params.path).toBe('not/a/known/path')
    })

    it('returns null for unknown route', () => {
      const route = findRoute(routes, '/unknown')
      // Should find catch-all instead
      expect(route?.name).toBe('catch-all')
    })

    it('prefers exact match over dynamic', () => {
      const specificRoutes = [
        { name: 'specific', path: ['/user/me'], component: MockComponent },
        { name: 'dynamic', path: ['/user/:id'], component: MockComponent, params: ['id'] }
      ]

      const route = findRoute(specificRoutes, '/user/me')
      expect(route.name).toBe('specific')
    })
  })

  describe('generateUrl', () => {
    const routes = [
      { name: 'index', path: ['/'] },
      { name: 'about', path: ['/about'] },
      { name: 'user', path: ['/user/:id'] },
      { name: 'product', path: ['/product/:category/:slug'] },
      { name: 'optional', path: ['/blog/:id/:slug?'] }
    ]

    it('generates static URL', () => {
      expect(generateUrl(routes, 'about')).toBe('/about')
    })

    it('generates URL with single param', () => {
      expect(generateUrl(routes, 'user', { id: '123' })).toBe('/user/123')
    })

    it('generates URL with multiple params', () => {
      expect(generateUrl(routes, 'product', { category: 'tech', slug: 'hello' }))
        .toBe('/product/tech/hello')
    })

    it('throws for unknown route', () => {
      expect(() => generateUrl(routes, 'unknown')).toThrow('Route "unknown" not found')
    })

    it('handles optional param when provided', () => {
      expect(generateUrl(routes, 'optional', { id: '123', slug: 'my-post' }))
        .toBe('/blog/123/my-post')
    })

    it('handles optional param when omitted', () => {
      expect(generateUrl(routes, 'optional', { id: '123' }))
        .toBe('/blog/123')
    })
  })

  describe('validateRouteParams', () => {
    const route = {
      name: 'user',
      params: ['id', 'name']
    }

    it('returns valid when all params provided', () => {
      const result = validateRouteParams(route, { id: '123', name: 'John' })
      expect(result.valid).toBe(true)
      expect(result.missing).toEqual([])
      expect(result.extra).toEqual([])
    })

    it('returns missing params', () => {
      const result = validateRouteParams(route, { id: '123' })
      expect(result.valid).toBe(false)
      expect(result.missing).toEqual(['name'])
      expect(result.extra).toEqual([])
    })

    it('returns extra params', () => {
      const result = validateRouteParams(route, { id: '123', name: 'John', extra: 'value' })
      expect(result.valid).toBe(true)
      expect(result.missing).toEqual([])
      expect(result.extra).toEqual(['extra'])
    })

    it('handles route without params', () => {
      const staticRoute = { name: 'about' }
      const result = validateRouteParams(staticRoute, {})
      expect(result.valid).toBe(true)
    })
  })

  describe('createCatchAllRoute', () => {
    it('creates catch-all route', () => {
      const route = createCatchAllRoute(CatchAllPage)

      expect(route.name).toBe('404')
      expect(route.path).toEqual(['/:path(.*)'])
      expect(route.component).toBe(CatchAllPage)
      expect(route.params).toEqual(['path'])
      expect(route.meta.catchAll).toBe(true)
    })

    it('accepts custom name', () => {
      const route = createCatchAllRoute(CatchAllPage, { name: 'not-found' })
      expect(route.name).toBe('not-found')
    })

    it('accepts custom meta', () => {
      const route = createCatchAllRoute(CatchAllPage, { meta: { requiresAuth: true } })
      expect(route.meta.requiresAuth).toBe(true)
      expect(route.meta.catchAll).toBe(true)
    })
  })

  describe('createRedirectRoute', () => {
    it('creates redirect route', () => {
      const route = createRedirectRoute('/old-path', '/new-path')

      expect(route.name).toBe('redirect-old-path')
      expect(route.path).toEqual(['/old-path'])
      expect(route.redirect).toBe('/new-path')
      expect(route.component).toBeNull()
    })

    it('sanitizes name from path', () => {
      const route = createRedirectRoute('/path/with/many/slashes', '/new')
      expect(route.name).toBe('redirect-path-with-many-slashes')
    })
  })

  describe('buildRoutes', () => {
    it('extracts component from module', () => {
      const modules = {
        './pages/Test.js': { default: TestPage }
      }

      const routes = buildRoutes(modules)

      expect(routes[0].component).toBe(TestPage)
    })

    it('falls back to first named export', () => {
      const modules = {
        './pages/About.js': { AboutPage: MockComponent }
      }

      const routes = buildRoutes(modules)

      expect(routes[0].component).toBe(MockComponent)
    })

    it('copies route config from component', () => {
      class ConfiguredPage extends MockComponent {
        static route = {
          meta: { requiresAuth: true },
          beforeEnter: () => {}
        }
      }

      const modules = {
        './pages/Configured.js': { default: ConfiguredPage }
      }

      const routes = buildRoutes(modules)

      expect(routes[0].meta).toEqual({ requiresAuth: true })
      expect(routes[0].beforeEnter).toBeDefined()
    })

    it('throws on missing component export', () => {
      const modules = {
        './pages/Empty.js': {}
      }

      expect(() => buildRoutes(modules)).toThrow('No component export found')
    })
  })

  describe('defineRoute', () => {
    it('returns route config object', () => {
      const config = defineRoute({
        path: '/custom',
        meta: { requiresAuth: true }
      })

      expect(config.path).toBe('/custom')
      expect(config.meta.requiresAuth).toBe(true)
    })

    it('can be assigned to component', () => {
      class MyPage extends MockComponent {}
      MyPage.route = defineRoute({
        path: '/my-page',
        meta: { title: 'My Page' }
      })

      expect(MyPage.route.path).toBe('/my-page')
    })
  })

  describe('route decorator', () => {
    it('sets route config on component', () => {
      const decorator = route({ meta: { requiresAuth: true } })
      class TestComponent extends MockComponent {}

      decorator(TestComponent)

      expect(TestComponent.route.meta.requiresAuth).toBe(true)
    })

    it('returns the component class', () => {
      const decorator = route({})
      class TestComponent extends MockComponent {}

      const result = decorator(TestComponent)

      expect(result).toBe(TestComponent)
    })
  })

  describe('complex routing scenarios', () => {
    it('handles blog with categories and posts', () => {
      const modules = {
        './pages/blog/Blog.js': { default: MockComponent },
        './pages/blog/[category]/Category.js': { default: MockComponent },
        './pages/blog/[category]/[slug]/Post.js': { default: MockComponent }
      }

      const routes = buildRoutes(modules)

      expect(routes).toHaveLength(3)

      // Check that routes are sorted correctly
      const blogRoute = routes.find(r => r.name === 'blog')
      const categoryRoute = routes.find(r => r.name.includes('category'))
      const postRoute = routes.find(r => r.name.includes('slug'))

      expect(blogRoute.path[0]).toBe('/blog')
      expect(categoryRoute.path[0]).toBe('/blog/:category')
      expect(postRoute.path[0]).toBe('/blog/:category/:slug')
    })

    it('handles admin area with nested routes', () => {
      const modules = {
        './pages/admin/dashboard/Dashboard.js': { default: MockComponent },
        './pages/admin/users/[id]/User.js': { default: MockComponent },
        './pages/admin/settings/Settings.js': { default: MockComponent }
      }

      const routes = buildRoutes(modules)

      expect(routes).toHaveLength(3)
      expect(routes.every(r => r.name.startsWith('admin'))).toBe(true)
    })

    it('handles catch-all 404 page', () => {
      const modules = {
        './pages/index/Index.js': { default: MockComponent },
        './pages/[...path]/NotFound.js': { default: MockComponent }
      }

      const routes = buildRoutes(modules)

      const notFoundRoute = routes.find(r => r.name === 'path')
      expect(notFoundRoute.path[0]).toBe('/:path(.*)')
    })
  })

  describe('edge cases', () => {
    it('handles empty modules', () => {
      const routes = buildRoutes({})
      expect(routes).toEqual([])
    })

    it('handles deep nesting', () => {
      const modules = {
        './pages/a/b/c/d/e/Deep.js': { default: MockComponent }
      }

      const routes = buildRoutes(modules)

      expect(routes[0].path[0]).toBe('/a/b/c/d/e')
      expect(routes[0].name).toBe('a-b-c-d-e')
    })

    it('handles special characters in paths', () => {
      // These would be unusual but should work
      const modules = {
        './pages/[id]/[action]/Dynamic.js': { default: MockComponent }
      }

      const routes = buildRoutes(modules)

      expect(routes[0].path[0]).toBe('/:id/:action')
    })

    it('handles single letter params', () => {
      const modules = {
        './pages/[a]/[b]/[c]/Page.js': { default: MockComponent }
      }

      const routes = buildRoutes(modules)

      expect(routes[0].path[0]).toBe('/:a/:b/:c')
      expect(routes[0].params).toEqual(['a', 'b', 'c'])
    })
  })
})
