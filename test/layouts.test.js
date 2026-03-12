import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  registerLayout,
  unregisterLayout,
  getLayout,
  hasLayout,
  getLayoutNames,
  setDefaultLayout,
  getDefaultLayout,
  resolveLayout,
  setRouteLayout,
  getRouteLayout,
  createLayoutWrapper,
  subscribeToLayouts,
  clearLayouts,
  layout,
  defineLayout,
  buildLayouts
} from '../modules/layouts.js'

// Mock Component class
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
      registerLayout('default', DefaultLayout)

      expect(hasLayout('default')).toBe(true)
      expect(getLayout('default')).toBe(DefaultLayout)
    })

    it('can register multiple layouts', () => {
      registerLayout('default', DefaultLayout)
      registerLayout('admin', AdminLayout)

      expect(getLayoutNames()).toContain('default')
      expect(getLayoutNames()).toContain('admin')
    })

    it('sets default layout when option is true', () => {
      registerLayout('custom', DefaultLayout, { default: true })

      expect(getDefaultLayout()).toBe('custom')
    })

    it('notifies listeners on register', () => {
      const listener = vi.fn()
      subscribeToLayouts(listener)

      registerLayout('test', MockComponent)

      expect(listener).toHaveBeenCalledWith({
        type: 'register',
        name: 'test',
        layout: MockComponent
      })
    })
  })

  describe('unregisterLayout', () => {
    it('removes a registered layout', () => {
      registerLayout('default', DefaultLayout)
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

      registerLayout('test', MockComponent)
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
      registerLayout('admin', AdminLayout)

      expect(getLayout('admin')).toBe(AdminLayout)
    })
  })

  describe('getLayoutNames', () => {
    it('returns empty array when no layouts', () => {
      expect(getLayoutNames()).toEqual([])
    })

    it('returns all registered layout names', () => {
      registerLayout('default', DefaultLayout)
      registerLayout('admin', AdminLayout)

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
      registerLayout('admin', AdminLayout)

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
      registerLayout('default', DefaultLayout)
      registerLayout('admin', AdminLayout)
    })

    it('returns default layout when component has no layout property', () => {
      class MyPage extends MockComponent {}

      expect(resolveLayout(MyPage)).toBe('default')
    })

    it('returns component layout property', () => {
      class AdminPage extends MockComponent {
        static layout = 'admin'
      }

      expect(resolveLayout(AdminPage)).toBe('admin')
    })

    it('returns route-specific layout over component layout', () => {
      class MyPage extends MockComponent {
        static layout = 'default'
      }

      setRouteLayout('/admin/dashboard', 'admin')

      expect(resolveLayout(MyPage, '/admin/dashboard')).toBe('admin')
    })

    it('returns component layout when no route-specific layout', () => {
      class AdminPage extends MockComponent {
        static layout = 'admin'
      }

      expect(resolveLayout(AdminPage, '/other/path')).toBe('admin')
    })

    it('returns _layout property if set', () => {
      class MyPage extends MockComponent {}
      MyPage._layout = 'admin'

      expect(resolveLayout(MyPage)).toBe('admin')
    })
  })

  describe('setRouteLayout / getRouteLayout', () => {
    it('assigns layout to route', () => {
      registerLayout('admin', AdminLayout)

      setRouteLayout('/admin/users', 'admin')

      expect(getRouteLayout('/admin/users')).toBe('admin')
    })

    it('returns undefined for unassigned route', () => {
      expect(getRouteLayout('/unknown')).toBeUndefined()
    })

    it('can override previous assignment', () => {
      registerLayout('default', DefaultLayout)
      registerLayout('admin', AdminLayout)

      setRouteLayout('/page', 'default')
      expect(getRouteLayout('/page')).toBe('default')

      setRouteLayout('/page', 'admin')
      expect(getRouteLayout('/page')).toBe('admin')
    })
  })

  describe('createLayoutWrapper', () => {
    it('creates a wrapper component', () => {
      const Wrapper = createLayoutWrapper(DefaultLayout, MockComponent)

      expect(Wrapper).toBeDefined()
      expect(typeof Wrapper).toBe('function')
    })

    it('wrapper extends Component', () => {
      const Wrapper = createLayoutWrapper(DefaultLayout, MockComponent)

      expect(Wrapper.prototype).toBeDefined()
    })

    it('wrapper has template property', () => {
      const Wrapper = createLayoutWrapper(DefaultLayout, MockComponent)

      expect(Wrapper.template).toBeDefined()
    })
  })

  describe('subscribeToLayouts', () => {
    it('subscribes to layout events', () => {
      const listener = vi.fn()
      subscribeToLayouts(listener)

      registerLayout('test', MockComponent)

      expect(listener).toHaveBeenCalled()
    })

    it('returns unsubscribe function', () => {
      const listener = vi.fn()
      const unsubscribe = subscribeToLayouts(listener)

      unsubscribe()
      registerLayout('test', MockComponent)

      // Should only be called once (before unsubscribe)
      expect(listener).toHaveBeenCalledTimes(0)
    })
  })

  describe('clearLayouts', () => {
    it('removes all layouts', () => {
      registerLayout('default', DefaultLayout)
      registerLayout('admin', AdminLayout)

      clearLayouts()

      expect(getLayoutNames()).toHaveLength(0)
    })

    it('resets default layout', () => {
      registerLayout('admin', AdminLayout, { default: true })
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
      registerLayout('test', MockComponent)

      // Listener should not be called after clear
      expect(listener).not.toHaveBeenCalled()
    })
  })

  describe('layout decorator', () => {
    it('sets layout property on component', () => {
      @layout('admin')
      class AdminPage extends MockComponent {}

      expect(AdminPage.layout).toBe('admin')
    })

    it('returns the component class', () => {
      const Decorator = layout('admin')
      class TestPage extends MockComponent {}

      const result = Decorator(TestPage)

      expect(result).toBe(TestPage)
    })
  })

  describe('defineLayout decorator', () => {
    it('sets layout property', () => {
      @defineLayout('admin')
      class AdminPage extends MockComponent {}

      expect(AdminPage.layout).toBe('admin')
    })

    it('sets layoutOptions property', () => {
      @defineLayout('admin', { persistent: true })
      class AdminPage extends MockComponent {}

      expect(AdminPage.layoutOptions).toEqual({ persistent: true })
    })
  })

  describe('buildLayouts', () => {
    it('builds layouts from glob modules', () => {
      const modules = {
        './layouts/default/DefaultLayout.js': { default: DefaultLayout },
        './layouts/admin/AdminLayout.js': { default: AdminLayout }
      }

      const layouts = buildLayouts(modules)

      expect(layouts.default).toBe(DefaultLayout)
      expect(layouts.admin).toBe(AdminLayout)
    })

    it('extracts layout name from path', () => {
      const modules = {
        './layouts/custom/CustomLayout.js': { default: MockComponent }
      }

      const layouts = buildLayouts(modules)

      expect(layouts.custom).toBe(MockComponent)
    })

    it('handles non-default exports', () => {
      const modules = {
        './layouts/default/DefaultLayout.js': { DefaultLayout }
      }

      const layouts = buildLayouts(modules)

      expect(layouts.default).toBe(DefaultLayout)
    })

    it('ignores invalid paths', () => {
      const modules = {
        './components/Button.js': { default: MockComponent },
        './layouts/valid/ValidLayout.js': { default: DefaultLayout }
      }

      const layouts = buildLayouts(modules)

      expect(layouts.valid).toBe(DefaultLayout)
      expect(layouts.Button).toBeUndefined()
    })

    it('registers layouts automatically', () => {
      const modules = {
        './layouts/test/TestLayout.js': { default: MockComponent }
      }

      buildLayouts(modules)

      expect(hasLayout('test')).toBe(true)
    })
  })
})
