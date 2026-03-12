import { describe, it, expect } from 'vitest'
import {
  generateManifest,
  isOnline,
  subscribeToConnectivity,
  sync,
  showNotification,
  cache,
  checkCapabilities,
  PWA
} from '../modules/pwa.js'

describe('PWA', () => {
  describe('Exports', () => {
    it('should export all functions', () => {
      expect(typeof generateManifest).toBe('function')
      expect(typeof isOnline).toBe('function')
      expect(typeof subscribeToConnectivity).toBe('function')
      expect(typeof sync).toBe('function')
      expect(typeof showNotification).toBe('function')
      expect(typeof cache).toBe('object')
      expect(typeof checkCapabilities).toBe('function')
    })

    it('should export PWA namespace', () => {
      expect(PWA.generateManifest).toBe(generateManifest)
      expect(PWA.isOnline).toBe(isOnline)
      expect(PWA.cache).toBe(cache)
    })
  })

  describe('generateManifest', () => {
    it('should generate basic manifest', () => {
      const manifest = generateManifest({
        name: 'My App',
        shortName: 'MyApp'
      })

      expect(manifest.name).toBe('My App')
      expect(manifest.short_name).toBe('MyApp')
      expect(manifest.display).toBe('standalone')
      expect(manifest.theme_color).toBe('#000000')
    })

    it('should include optional fields', () => {
      const manifest = generateManifest({
        name: 'Full App',
        shortName: 'Full',
        description: 'A complete app',
        startUrl: '/home',
        display: 'fullscreen',
        themeColor: '#007bff',
        backgroundColor: '#ffffff',
        scope: '/app',
        icons: [
          { src: '/icon.png', sizes: '192x192', type: 'image/png' }
        ]
      })

      expect(manifest.description).toBe('A complete app')
      expect(manifest.start_url).toBe('/home')
      expect(manifest.display).toBe('fullscreen')
      expect(manifest.theme_color).toBe('#007bff')
      expect(manifest.background_color).toBe('#ffffff')
      expect(manifest.scope).toBe('/app')
      expect(manifest.icons).toHaveLength(1)
    })

    it('should use default values', () => {
      const manifest = generateManifest({
        name: 'Minimal'
      })

      expect(manifest.display).toBe('standalone')
      expect(manifest.theme_color).toBe('#000000')
      expect(manifest.start_url).toBe('./')
    })

    it('should include orientation', () => {
      const manifest = generateManifest({ name: 'Test' })
      expect(manifest.orientation).toBe('any')
    })
  })

  describe('isOnline', () => {
    it('should return navigator.onLine', () => {
      const result = isOnline()
      expect(typeof result).toBe('boolean')
    })
  })

  describe('subscribeToConnectivity', () => {
    it('should return unsubscribe function', () => {
      const unsubscribe = subscribeToConnectivity({})
      expect(typeof unsubscribe).toBe('function')

      // Cleanup
      unsubscribe()
    })

    it('should not throw without callbacks', () => {
      const unsubscribe = subscribeToConnectivity({})
      expect(typeof unsubscribe).toBe('function')
      unsubscribe()
    })
  })

  describe('sync', () => {
    it('should return false without service worker', async () => {
      const result = await sync('test-tag')
      expect(result).toBe(false)
    })
  })

  describe('showNotification', () => {
    it('should not throw', async () => {
      await showNotification('Test', { body: 'Body' })
      // Should complete without error
    })
  })

  describe('cache', () => {
    it('should have cache methods', () => {
      expect(typeof cache.add).toBe('function')
      expect(typeof cache.remove).toBe('function')
      expect(typeof cache.clear).toBe('function')
      expect(typeof cache.info).toBe('function')
    })

    it('should return empty array for info without caches', async () => {
      const info = await cache.info()
      expect(Array.isArray(info)).toBe(true)
    })
  })

  describe('checkCapabilities', () => {
    it('should return capability object', () => {
      const caps = checkCapabilities()

      expect(typeof caps.serviceWorker).toBe('boolean')
      expect(typeof caps.push).toBe('boolean')
      expect(typeof caps.notifications).toBe('boolean')
      expect(typeof caps.backgroundSync).toBe('boolean')
      expect(typeof caps.persistentStorage).toBe('boolean')
      expect(typeof caps.addToHomeScreen).toBe('boolean')
      expect(typeof caps.offline).toBe('boolean')
    })

    it('should detect service worker support', () => {
      const caps = checkCapabilities()
      expect(caps.serviceWorker).toBeDefined()
    })
  })
})
