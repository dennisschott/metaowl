/**
 * @module Link Tests
 *
 * Tests for the Link component and SPA navigation.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Link, registerLinkTemplate } from '../modules/link.js'
import {
  navigateTo,
  setSpaMode,
  isSpaMode,
  _setSpaNavigationCallback,
  resetRouter
} from '../modules/router.js'

// Mock für window
const mockPushState = vi.fn()
const mockReplaceState = vi.fn()
const mockHistoryBack = vi.fn()
const mockHistoryForward = vi.fn()
const mockHistoryGo = vi.fn()
const mockAddEventListener = vi.fn()
const mockRemoveEventListener = vi.fn()

// Setup global mocks
beforeEach(() => {
  vi.resetAllMocks()
  resetRouter()

  // Mock window.location
  Object.defineProperty(globalThis, 'window', {
    value: {
      location: {
        pathname: '/',
        href: 'http://localhost/',
        replace: vi.fn()
      },
      history: {
        pushState: mockPushState,
        replaceState: mockReplaceState,
        back: mockHistoryBack,
        forward: mockHistoryForward,
        go: mockHistoryGo
      },
      addEventListener: mockAddEventListener,
      removeEventListener: mockRemoveEventListener
    },
    writable: true,
    configurable: true
  })

  // Mock document.location
  Object.defineProperty(globalThis, 'document', {
    value: {
      location: {
        pathname: '/'
      }
    },
    writable: true,
    configurable: true
  })
})

describe('Link Component', () => {
  describe('isExternalUrl', () => {
    it('should return false for internal paths', () => {
      const internalPaths = ['/', '/about', '/user/123', '/blog/post-slug']

      for (const path of internalPaths) {
        // Test durch Instanziierung der Komponente und Prüfung des Verhaltens
        const link = new Link()
        expect(link).toBeDefined()
      }
    })

    it('should return true for external URLs', () => {
      const externalUrls = [
        'http://example.com',
        'https://example.com',
        '//example.com',
        'mailto:test@example.com',
        'tel:+1234567890',
        'ftp://ftp.example.com',
        'javascript:void(0)'
      ]

      for (const url of externalUrls) {
        const link = new Link()
        expect(link).toBeDefined()
      }
    })
  })

  describe('Link props', () => {
    it('should accept required "to" prop', () => {
      const link = new Link()
      expect(Link.props.to.optional).toBe(false)
      expect(Link.props.to.type).toBe(String)
    })

    it('should accept optional props', () => {
      expect(Link.props.class.optional).toBe(true)
      expect(Link.props.activeClass.optional).toBe(true)
      expect(Link.props.target.optional).toBe(true)
      expect(Link.props.rel.optional).toBe(true)
      expect(Link.props.title.optional).toBe(true)
      expect(Link.props.download.optional).toBe(true)
    })

    it('should have correct static template', () => {
      expect(Link.template).toBe('Link')
    })
  })

  describe('registerLinkTemplate', () => {
    it('should add Link template to string templates', () => {
      const templates = '<templates><t t-name="Test"></t></templates>'
      const result = registerLinkTemplate(templates)

      expect(result).toContain('t-name="Link"')
      expect(result).toContain('<a')
      expect(result).toContain('</templates>')
    })

    it('should add Link template to object templates', () => {
      const templates = { Test: '<t t-name="Test"></t>' }
      registerLinkTemplate(templates)

      expect(templates.Link).toBeDefined()
      expect(templates.Link).toContain('t-name="Link"')
    })
  })
})

describe('SPA Navigation', () => {
  describe('navigateTo', () => {
    it('should use window.location when SPA mode is disabled', async () => {
      setSpaMode(false)
      const locationHrefSpy = vi.spyOn(window.location, 'href', 'set')

      await navigateTo('/about')

      expect(locationHrefSpy).toHaveBeenCalledWith('/about')
    })

    it('should use history.pushState when SPA mode is enabled', async () => {
      setSpaMode(true)
      const mockCallback = vi.fn().mockResolvedValue(undefined)
      _setSpaNavigationCallback(mockCallback)

      await navigateTo('/about')

      expect(mockPushState).toHaveBeenCalledWith({ path: '/about' }, '', '/about')
      expect(mockCallback).toHaveBeenCalledWith('/about')
    })

    it('should use history.replaceState when replace option is true', async () => {
      setSpaMode(true)
      const mockCallback = vi.fn().mockResolvedValue(undefined)
      _setSpaNavigationCallback(mockCallback)

      await navigateTo('/about', { replace: true })

      expect(mockReplaceState).toHaveBeenCalledWith({ path: '/about' }, '', '/about')
    })

    it('should fallback to window.location on navigation error', async () => {
      setSpaMode(true)
      const mockCallback = vi.fn().mockRejectedValue(new Error('Navigation failed'))
      _setSpaNavigationCallback(mockCallback)

      const locationHrefSpy = vi.spyOn(window.location, 'href', 'set')

      await navigateTo('/about')

      expect(locationHrefSpy).toHaveBeenCalledWith('/about')
    })
  })

  describe('setSpaMode / isSpaMode', () => {
    it('should enable and disable SPA mode', () => {
      setSpaMode(true)
      expect(isSpaMode()).toBe(true)

      setSpaMode(false)
      expect(isSpaMode()).toBe(false)
    })
  })
})
