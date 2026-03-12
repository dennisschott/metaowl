/**
 * @module PWA
 *
 * Progressive Web App utilities for MetaOwl applications.
 *
 * Features:
 * - Web App Manifest generation
 * - Service Worker registration and management
 * - Offline/online status detection
 * - Background sync helpers
 * - Push notification utilities
 * - Cache management for offline support
 *
 * Usage:
 *   import { PWA } from 'metaowl'
 *
 *   // Generate manifest
 *   const manifest = PWA.generateManifest({
 *     name: 'My App',
 *     shortName: 'MyApp',
 *     themeColor: '#007bff'
 *   })
 *
 *   // Register service worker
 *   await PWA.registerServiceWorker('/sw.js')
 *
 *   // Check online status
 *   if (PWA.isOnline()) {
 *     // sync data
 *   }
 */

/**
 * @typedef {Object} ManifestOptions
 * @property {string} name - Full app name
 * @property {string} shortName - Short name (max 12 chars)
 * @property {string} [description] - App description
 * @property {string} [startUrl='./'] - Start URL
 * @property {string} [display='standalone'] - Display mode
 * @property {string} [themeColor='#000000'] - Theme color
 * @property {string} [backgroundColor='#ffffff'] - Background color
 * @property {string} [scope='./'] - App scope
 * @property {Array<{src: string, sizes: string, type: string}>} [icons] - App icons
 */

/**
 * Generate Web App Manifest JSON.
 *
 * @param {ManifestOptions} options - Manifest options
 * @returns {Object} Web App Manifest object
 *
 * @example
 * const manifest = generateManifest({
 *   name: 'My Awesome App',
 *   shortName: 'MyApp',
 *   description: 'A great app built with MetaOwl',
 *   themeColor: '#007bff',
 *   backgroundColor: '#ffffff',
 *   icons: [
 *     { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
 *     { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
 *   ]
 * })
 */
export function generateManifest(options) {
  const {
    name,
    shortName,
    description,
    startUrl = './',
    display = 'standalone',
    themeColor = '#000000',
    backgroundColor = '#ffffff',
    scope = './',
    icons = []
  } = options

  const manifest = {
    name,
    short_name: shortName,
    start_url: startUrl,
    display,
    theme_color: themeColor,
    background_color: backgroundColor,
    scope
  }

  if (description) {
    manifest.description = description
  }

  if (icons.length > 0) {
    manifest.icons = icons
  }

  // Add default orientation
  manifest.orientation = 'any'

  return manifest
}

/**
 * Register the service worker.
 *
 * @param {string} path - Service Worker script path
 * @param {Object} options - Registration options
 * @param {Function} [options.onUpdate] - Called when update found
 * @param {Function} [options.onReady] - Called when SW is active
 * @returns {Promise<ServiceWorkerRegistration|null>}
 *
 * @example
 * await registerServiceWorker('/sw.js', {
 *   onUpdate: (registration) => {
 *     console.log('New version available!')
 *   },
 *   onReady: (registration) => {
 *     console.log('App is ready for offline use')
 *   }
 * })
 */
export async function registerServiceWorker(path, options = {}) {
  const { onUpdate, onReady } = options

  if (!('serviceWorker' in navigator)) {
    console.warn('[PWA] Service workers not supported')
    return null
  }

  try {
    const registration = await navigator.serviceWorker.register(path)

    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New update available
          if (onUpdate) {
            onUpdate(registration)
          }
        } else if (newWorker.state === 'activated') {
          // Service worker is active
          if (onReady) {
            onReady(registration)
          }
        }
      })
    })

    // Check if already active
    if (registration.active) {
      if (onReady) {
        onReady(registration)
      }
    }

    return registration
  } catch (error) {
    console.error('[PWA] Service worker registration failed:', error)
    return null
  }
}

/**
 * Unregister the service worker.
 *
 * @returns {Promise<boolean>} True if unregistered successfully
 */
export async function unregisterServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return false
  }

  try {
    const registration = await navigator.serviceWorker.ready
    await registration.unregister()
    return true
  } catch {
    return false
  }
}

/**
 * Check if app is running as installed PWA.
 *
 * @returns {boolean}
 */
export function isStandalone() {
  // Check if matchMedia exists (browser environment)
  if (window.matchMedia) {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator?.standalone === true
  }
  return false
}

/**
 * Check if online.
 *
 * @returns {boolean}
 */
export function isOnline() {
  return navigator.onLine
}

/**
 * Subscribe to online/offline events.
 *
 * @param {Object} callbacks - Callback functions
 * @param {Function} callbacks.onOnline - Called when going online
 * @param {Function} callbacks.onOffline - Called when going offline
 * @returns {Function} Unsubscribe function
 *
 * @example
 * const unsubscribe = subscribeToConnectivity({
 *   onOnline: () => console.log('Back online'),
 *   onOffline: () => console.log('Gone offline')
 * })
 *
 * // Later: unsubscribe()
 */
export function subscribeToConnectivity(callbacks) {
  const { onOnline, onOffline } = callbacks

  const handleOnline = () => {
    if (onOnline) onOnline()
  }

  const handleOffline = () => {
    if (onOffline) onOffline()
  }

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
}

/**
 * Request persistent storage.
 *
 * @returns {Promise<boolean>} True if persistent storage granted
 */
export async function requestPersistentStorage() {
  if (navigator.storage && navigator.storage.persist) {
    return await navigator.storage.persist()
  }
  return false
}

/**
 * Get storage usage information.
 *
 * @returns {Promise<{usage: number, quota: number}|null>}
 */
export async function getStorageInfo() {
  if (navigator.storage && navigator.storage.estimate) {
    return await navigator.storage.estimate()
  }
  return null
}

/**
 * Trigger a background sync event.
 *
 * @param {string} tag - Sync tag name
 * @returns {Promise<boolean>} True if sync registered
 */
export async function sync(tag) {
  if (!('serviceWorker' in navigator)) {
    return false
  }

  try {
    const registration = await navigator.serviceWorker.ready

    if ('sync' in registration) {
      await registration.sync.register(tag)
      return true
    }
  } catch {
    // Background sync not supported or failed
  }

  return false
}

/**
 * Request notification permission and subscribe.
 *
 * @param {Object} options - Push options
 * @param {string} options.serverUrl - Push server URL
 * @param {string} options.publicKey - VAPID public key
 * @returns {Promise<PushSubscription|null>}
 *
 * @example
 * const subscription = await subscribeToPush({
 *   serverUrl: 'https://myserver.com/push',
 *   publicKey: 'BLCxhd...'
 * })
 */
export async function subscribeToPush(options) {
  const { serverUrl, publicKey } = options

  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('[PWA] Push notifications not supported')
    return null
  }

  try {
    // Check permission
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      return null
    }

    const registration = await navigator.serviceWorker.ready

    // Subscribe
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
    })

    // Send to server
    if (serverUrl) {
      await fetch(serverUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription)
      })
    }

    return subscription
  } catch (error) {
    console.error('[PWA] Push subscription failed:', error)
    return null
  }
}

/**
 * Unsubscribe from push notifications.
 *
 * @returns {Promise<boolean>}
 */
export async function unsubscribeFromPush() {
  if (!('serviceWorker' in navigator)) {
    return false
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      await subscription.unsubscribe()
      return true
    }
  } catch {
    // Ignore errors
  }

  return false
}

/**
 * Show a notification.
 *
 * @param {string} title - Notification title
 * @param {Object} options - Notification options
 * @returns {Promise<void>}
 */
export async function showNotification(title, options = {}) {
  if (!('serviceWorker' in navigator)) {
    return
  }

  try {
    const registration = await navigator.serviceWorker.ready
    await registration.showNotification(title, options)
  } catch (error) {
    console.error('[PWA] Show notification failed:', error)
  }
}

/**
 * Convert URL-safe base64 to Uint8Array.
 *
 * @param {string} base64String
 * @returns {Uint8Array}
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}

/**
 * Cache management for PWA.
 */
export const cache = {
  /**
   * Add resources to cache.
   *
   * @param {string} cacheName - Cache name
   * @param {string[]} urls - URLs to cache
   * @returns {Promise<void>}
   */
  async add(cacheName, urls) {
    if (!('caches' in window)) return

    const cache = await caches.open(cacheName)
    await cache.addAll(urls)
  },

  /**
   * Remove resources from cache.
   *
   * @param {string} cacheName - Cache name
   * @param {string[]} urls - URLs to remove
   * @returns {Promise<void>}
   */
  async remove(cacheName, urls) {
    if (!('caches' in window)) return

    const cache = await caches.open(cacheName)
    for (const url of urls) {
      await cache.delete(url)
    }
  },

  /**
   * Clear all caches.
   *
   * @returns {Promise<void>}
   */
  async clear() {
    if (!('caches' in window)) return

    const keys = await caches.keys()
    await Promise.all(keys.map(key => caches.delete(key)))
  },

  /**
   * Get cache info.
   *
   * @returns {Promise<Array<{name: string, size: number}>>}
   */
  async info() {
    if (!('caches' in window)) return []

    const keys = await caches.keys()
    const info = []

    for (const key of keys) {
      const cache = await caches.open(key)
      const keys = await cache.keys()
      info.push({ name: key, size: keys.length })
    }

    return info
  }
}

/**
 * Check PWA capabilities.
 *
 * @returns {Object} Capability info
 */
export function checkCapabilities() {
  return {
    serviceWorker: 'serviceWorker' in navigator,
    push: 'PushManager' in window,
    notifications: 'Notification' in window,
    backgroundSync: false,  // Would require ServiceWorkerRegistration check in real browser
    persistentStorage: !!(navigator.storage && navigator.storage.persist),
    addToHomeScreen: !isStandalone(),
    offline: 'serviceWorker' in navigator
  }
}

/**
 * PWA namespace for convenient access.
 */
export const PWA = {
  generateManifest,
  registerServiceWorker,
  unregisterServiceWorker,
  isStandalone,
  isOnline,
  subscribeToConnectivity,
  requestPersistentStorage,
  getStorageInfo,
  sync,
  subscribeToPush,
  unsubscribeFromPush,
  showNotification,
  cache,
  checkCapabilities
}

export default PWA
