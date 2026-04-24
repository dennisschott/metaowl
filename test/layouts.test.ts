import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildLayouts,
  clearLayouts,
  createLayoutWrapper,
  defineLayout,
  getDefaultLayout,
  getLayout,
  getLayoutNames,
  getRouteLayout,
  hasLayout,
  layout,
  registerLayout,
  resolveLayout,
  setDefaultLayout,
  setRouteLayout,
  subscribeToLayouts,
  unregisterLayout
} from '../modules/layouts.js'

class MockComponent {
  static template = '<div>Mock</div>'
}

class DefaultLayout extends MockComponent {
  static template = '<div class="default"><t t-slot="default"/></div>'
}

class AdminLayout extends MockComponent {
  static template = '<div class="admin"><t t-slot="default"/></div>'
}

describe('Layouts', () => {
  beforeEach(() => {
    clearLayouts()
  })

  describe('registerLayout', () => {
    it('registers a layout component', () => {
      registerLayout('default', DefaultLayout as any)

      expect(hasLayout('default')).toBe(true)
      expect(getLayout('default')).toBe(DefaultLayout)
    })

    it('can register multiple layouts', () => {
      registerLayout('default', DefaultLayout as any)
      registerLayout('admin', AdminLayout as any)

      expect(getLayoutNames()).toContain('default')
      expect(getLayoutNames()).toContain('admin')
    })

    it('sets default layout when option is true', () => {
      registerLayout('custom', DefaultLayout as any, { default: true })

      expect(getDefaultLayout()).toBe('custom')
    })

    it('notifies listeners on register', () => {
      const listener = vi.fn()
      subscribeToLayouts(listener)

      registerLayout('test', MockComponent as any)

      expect(listener).toHaveBeenCalledWith({
        type: 'register',
        name: 'test',
        layout: MockComponent
      })
    })
  })

  describe('unregisterLayout', () => {
    it('removes a registered layout', () => {
      registerLayout('default', DefaultLayout as any)
      expect(hasLayout('default')).toBe(true)

      unregisterLayout('default')
      expect(hasLayout('default')).toBe(false)
    })

    it('returns false for unregistered layout', () => {
      expect(unregisterLayout('unknown')).toBe(false)
    })

    it('notifies listeners on unregister', () => {
      const listener = vi.fn()
      subscribeToLayouts(listener)

      registerLayout('test', MockComponent as any)
      unregisterLayout('test')

      expect(listener).toHaveBeenLastCalledWith({
        type: 'unregister',
        name: 'test'
      })
    })
  })

  describe('getLayout', () => {
    it('returns undefined for unregistered layout', () => {
      expect(getLayout('unknown')).toBeUndefined()
    })

    it('returns the correct layout component', () => {
      registerLayout('admin', AdminLayout as any)

      expect(getLayout('admin')).toBe(AdminLayout)
    })
  })

  describe('getLayoutNames', () => {
    it('returns empty array when no layouts', () => {
      expect(getLayoutNames()).toEqual([])
    })

    it('returns all registered layout names', () => {
      registerLayout('default', DefaultLayout as any)
      registerLayout('admin', AdminLayout as any)

      const names = getLayoutNames()
      expect(names).toHaveLength(2)
      expect(names).toContain('default')
      expect(names).toContain('admin')
    })
  })

  describe('setDefaultLayout / getDefaultLayout', () => {
    it('default is "default" initially', () => {
      expect(getDefaultLayout()).toBe('default')
    })

    it('sets and gets default layout', () => {
      registerLayout('admin', AdminLayout as any)

      setDefaultLayout('admin')

      expect(getDefaultLayout()).toBe('admin')
    })

    it('warns when setting unregistered layout', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      setDefaultLayout('unknown')

      expect(consoleSpy).toHaveBeenCalledWith('[metaowl] Layout "unknown" is not registered yet')
      consoleSpy.mockRestore()
    })
  })

  describe('resolveLayout', () => {
    beforeEach(() => {
      registerLayout('default', DefaultLayout as any)
      registerLayout('admin', AdminLayout as any)
    })

    it('returns default layout when component has no layout property', () => {
      class MyPage extends MockComponent {}

      expect(resolveLayout(MyPage as any)).toBe('default')
    })

    it('returns component layout property', () => {
      class AdminPage extends MockComponent {
        static layout = 'admin'
      }

      expect(resolveLayout(AdminPage as any)).toBe('admin')
    })

    it('returns route-specific layout over component layout', () => {
      class MyPage extends MockComponent {
        static layout = 'default'
      }

      setRouteLayout('/admin/dashboard', 'admin')

      expect(resolveLayout(MyPage as any, '/admin/dashboard')).toBe('admin')
    })

    it('returns component layout when no route-specific layout', () => {
      class AdminPage extends MockComponent {
        static layout = 'admin'
      }

      expect(resolveLayout(AdminPage as any, '/other/path')).toBe('admin')
    })

    it('returns _layout property if set', () => {
      class MyPage extends MockComponent {}
      ;(MyPage as any)._layout = 'admin'

      expect(resolveLayout(MyPage as any)).toBe('admin')
    })
  })

  describe('setRouteLayout / getRouteLayout', () => {
    it('assigns layout to route', () => {
      registerLayout('admin', AdminLayout as any)

      setRouteLayout('/admin/users', 'admin')

      expect(getRouteLayout('/admin/users')).toBe('admin')
    })

    it('returns undefined for unassigned route', () => {
      expect(getRouteLayout('/unknown')).toBeUndefined()
    })

    it('can override previous assignment', () => {
      registerLayout('default', DefaultLayout as any)
      registerLayout('admin', AdminLayout as any)

      setRouteLayout('/page', 'default')
      expect(getRouteLayout('/page')).toBe('default')

      setRouteLayout('/page', 'admin')
      expect(getRouteLayout('/page')).toBe('admin')
    })
  })

  describe('createLayoutWrapper', () => {
    it('creates a wrapper component', () => {
      const Wrapper = createLayoutWrapper(DefaultLayout as any, MockComponent as any)

      expect(Wrapper).toBeDefined()
      expect(typeof Wrapper).toBe('function')
    })

    it('wrapper extends Component', () => {
      const Wrapper = createLayoutWrapper(DefaultLayout as any, MockComponent as any)

      expect(Wrapper.prototype).toBeDefined()
    })

    it('wrapper has template property', () => {
      const Wrapper = createLayoutWrapper(DefaultLayout as any, MockComponent as any)

      expect(Wrapper.template).toBeDefined()
    })
  })

  describe('subscribeToLayouts', () => {
    it('subscribes to layout events', () => {
      const listener = vi.fn()
      subscribeToLayouts(listener)

      registerLayout('test', MockComponent as any)

      expect(listener).toHaveBeenCalled()
    })

    it('returns unsubscribe function', () => {
      const listener = vi.fn()
      const unsubscribe = subscribeToLayouts(listener)

      unsubscribe()
      registerLayout('test', MockComponent as any)

      expect(listener).toHaveBeenCalledTimes(0)
    })
  })

  describe('clearLayouts', () => {
    it('removes all layouts', () => {
      registerLayout('default', DefaultLayout as any)
      registerLayout('admin', AdminLayout as any)

      clearLayouts()

      expect(getLayoutNames()).toHaveLength(0)
    })

    it('resets default layout', () => {
      registerLayout('admin', AdminLayout as any, { default: true })
      expect(getDefaultLayout()).toBe('admin')

      clearLayouts()

      expect(getDefaultLayout()).toBe('default')
    })

    it('clears route layouts', () => {
      setRouteLayout('/page', 'admin')

      clearLayouts()

      expect(getRouteLayout('/page')).toBeUndefined()
    })

    it('clears listeners', () => {
      const listener = vi.fn()
      subscribeToLayouts(listener)

      clearLayouts()
      registerLayout('test', MockComponent as any)

      expect(listener).not.toHaveBeenCalled()
    })
  })

  describe('layout decorator', () => {
    it('sets layout property on component', () => {
      class AdminPage extends MockComponent {}
      layout('admin')(AdminPage as any)

      expect((AdminPage as any).layout).toBe('admin')
    })

    it('returns the component class', () => {
      const Decorator = layout('admin')
      class TestPage extends MockComponent {}

      const result = Decorator(TestPage as any)

      expect(result).toBe(TestPage)
    })
  })

  describe('defineLayout decorator', () => {
    it('sets layout property', () => {
      class AdminPage extends MockComponent {}
      defineLayout('admin')(AdminPage as any)

      expect((AdminPage as any).layout).toBe('admin')
    })

    it('sets layoutOptions property', () => {
      class AdminPage extends MockComponent {}
      defineLayout('admin', { persistent: true })(AdminPage as any)

      expect((AdminPage as any).layoutOptions).toEqual({ persistent: true })
    })
  })

  describe('buildLayouts', () => {
    it('builds layouts from glob modules', () => {
      const modules = {
        './layouts/default/DefaultLayout.js': { default: DefaultLayout },
        './layouts/admin/AdminLayout.js': { default: AdminLayout }
      }

      const builtLayouts = buildLayouts(modules as any)

      expect(builtLayouts.default).toBe(DefaultLayout)
      expect(builtLayouts.admin).toBe(AdminLayout)
    })

    it('extracts layout name from path', () => {
      const modules = {
        './layouts/custom/CustomLayout.js': { default: MockComponent }
      }

      const builtLayouts = buildLayouts(modules as any)

      expect(builtLayouts.custom).toBe(MockComponent)
    })

    it('handles non-default exports', () => {
      const modules = {
        './layouts/default/DefaultLayout.js': { DefaultLayout }
      }

      const builtLayouts = buildLayouts(modules as any)

      expect(builtLayouts.default).toBe(DefaultLayout)
    })

    it('ignores invalid paths', () => {
      const modules = {
        './components/Button.js': { default: MockComponent },
        './layouts/valid/ValidLayout.js': { default: DefaultLayout }
      }

      const builtLayouts = buildLayouts(modules as any)

      expect(builtLayouts.valid).toBe(DefaultLayout)
      expect((builtLayouts as Record<string, unknown>).Button).toBeUndefined()
    })

    it('registers layouts automatically', () => {
      const modules = {
        './layouts/test/TestLayout.js': { default: MockComponent }
      }

      buildLayouts(modules as any)

      expect(hasLayout('test')).toBe(true)
    })
  })
})