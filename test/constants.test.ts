import { describe, expect, it } from 'vitest'
import {
  buildRouteRegexPattern,
  buildSimpleRoutePattern,
  MAGIC_STRINGS,
  normalizeRoutePath,
  normalizePathForComparison,
  ROUTE_PATTERN_CONFIG,
  EXTERNAL_URL_REGEX
} from '../modules/constants.js'

describe('constants', () => {
  describe('MAGIC_STRINGS', () => {
    it('should have correct store session key', () => {
      expect(MAGIC_STRINGS.STORE_SESSION_KEY).toBe('metaowl:odoo:session')
    })

    it('should have correct store CSRF key', () => {
      expect(MAGIC_STRINGS.STORE_CSRF_KEY).toBe('metaowl:odoo:csrf')
    })

    it('should have correct mount element ID', () => {
      expect(MAGIC_STRINGS.MOUNT_ELEMENT_ID).toBe('metaowl')
    })

    it('should have correct link template name', () => {
      expect(MAGIC_STRINGS.LINK_TEMPLATE_NAME).toBe('Link')
    })
  })

  describe('ROUTE_PATTERN_CONFIG', () => {
    it('should have all required pattern keys', () => {
      expect(ROUTE_PATTERN_CONFIG).toHaveProperty('optionalParam')
      expect(ROUTE_PATTERN_CONFIG).toHaveProperty('catchAll')
      expect(ROUTE_PATTERN_CONFIG).toHaveProperty('namedParam')
      expect(ROUTE_PATTERN_CONFIG).toHaveProperty('wildcard')
      expect(ROUTE_PATTERN_CONFIG).toHaveProperty('separator')
    })
  })

  describe('buildRouteRegexPattern', () => {
    it('should escape slashes', () => {
      expect(buildRouteRegexPattern('/user/profile')).toBe('^\\/user\\/profile$')
    })

    it('should convert named params', () => {
      expect(buildRouteRegexPattern('/user/:id')).toBe('^\\/user\\/([^/]+)$')
    })

    it('should convert optional params', () => {
      expect(buildRouteRegexPattern('/user/:id?')).toBe('^\\/user\\(?:/([^/]+))?$')
    })

    it('should convert catch-all params', () => {
      expect(buildRouteRegexPattern('/user/:path(.*)')).toBe('^\\/user\\/(.(.*))$')
    })

    it('should convert wildcard', () => {
      expect(buildRouteRegexPattern('/*')).toBe('^\\/(.*)$')
    })

    it('should handle index route', () => {
      expect(buildRouteRegexPattern('/')).toBe('^\\/$')
    })

it('should handle complex route', () => {
      expect(buildRouteRegexPattern('/blog/:year/:slug?')).toBe('^\\/blog\\/([^/]+)(?:/([^/]+))?$')
    })
  })

  describe('buildSimpleRoutePattern', () => {
    it('should escape slashes', () => {
      expect(buildSimpleRoutePattern('/user/profile')).toBe('^\\/user\\/profile$')
    })

    it('should convert named params', () => {
      expect(buildSimpleRoutePattern('/user/:id')).toBe('^\\/user\\/([^/]+)$')
    })

    it('should convert optional params', () => {
      expect(buildSimpleRoutePattern('/user/:id?')).toBe('^\\/user\\(?:/([^/]+))?$')
    })

    it('should convert catch-all params', () => {
      expect(buildSimpleRoutePattern('/user/:path(.*)')).toBe('^\\/user\\(.(.*))$')
    })

    it('should convert wildcard', () => {
      expect(buildSimpleRoutePattern('/*')).toBe('^\\/(.*)$')
    })
  })

  describe('normalizeRoutePath', () => {
    it('should remove trailing slash', () => {
      expect(normalizeRoutePath('/user/')).toBe('/user')
    })

    it('should keep root path', () => {
      expect(normalizeRoutePath('/')).toBe('/')
    })

    it('should return / for empty after strip', () => {
      expect(normalizeRoutePath('')).toBe('/')
    })

    it('should not modify path without trailing slash', () => {
      expect(normalizeRoutePath('/user/profile')).toBe('/user/profile')
    })
  })

  describe('normalizePathForComparison', () => {
    it('should delegate to normalizeRoutePath', () => {
      expect(normalizePathForComparison('/user/')).toBe(normalizeRoutePath('/user/'))
      expect(normalizePathForComparison('/')).toBe('/')
    })
  })

  describe('EXTERNAL_URL_REGEX', () => {
    it('should match http URLs', () => {
      expect(EXTERNAL_URL_REGEX.test('http://example.com')).toBe(true)
      expect(EXTERNAL_URL_REGEX.test('https://example.com')).toBe(true)
    })

    it('should match protocol-relative URLs', () => {
      expect(EXTERNAL_URL_REGEX.test('//cdn.example.com')).toBe(true)
    })

    it('should match mailto', () => {
      expect(EXTERNAL_URL_REGEX.test('mailto:test@example.com')).toBe(true)
    })

    it('should match tel', () => {
      expect(EXTERNAL_URL_REGEX.test('tel:+1234567890')).toBe(true)
    })

    it('should match ftp', () => {
      expect(EXTERNAL_URL_REGEX.test('ftp://files.example.com')).toBe(true)
    })

    it('should match file protocol', () => {
      expect(EXTERNAL_URL_REGEX.test('file:///path/to/file')).toBe(true)
    })

    it('should match javascript protocol', () => {
      expect(EXTERNAL_URL_REGEX.test('javascript:void(0)')).toBe(true)
    })

    it('should not match relative paths', () => {
      expect(EXTERNAL_URL_REGEX.test('/user/profile')).toBe(false)
      expect(EXTERNAL_URL_REGEX.test('user/profile')).toBe(false)
    })

    it('should be case insensitive', () => {
      expect(EXTERNAL_URL_REGEX.test('HTTP://EXAMPLE.COM')).toBe(true)
      expect(EXTERNAL_URL_REGEX.test('HTTPS://EXAMPLE.COM')).toBe(true)
    })
  })
})
