/**
 * @module PWA
 *
 * Progressive Web App utilities for MetaOwl applications.
 */

type AppDisplayMode = 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser'

interface ManifestIcon {
  src: string
  sizes: string
  type: string
}

export interface ManifestOptions {
  name: string
  shortName?: string
  description?: string
  startUrl?: string
  display?: AppDisplayMode | string
  themeColor?: string
  backgroundColor?: string
  scope?: string
  icons?: ManifestIcon[]
}

interface ServiceWorkerCallbacks {
  onUpdate?: (registration: ServiceWorkerRegistration) => void
  onReady?: (registration: ServiceWorkerRegistration) => void
}

interface ConnectivityCallbacks {
  onOnline?: () => void
  onOffline?: () => void
}

interface PushOptions {
  serverUrl?: string
  publicKey: string
}

interface CacheInfo {
  name: string
  size: number
}

interface CapabilityInfo {
  serviceWorker: boolean
  push: boolean
  notifications: boolean
  backgroundSync: boolean
  persistentStorage: boolean
  addToHomeScreen: boolean
  offline: boolean
}

export function generateManifest(options: ManifestOptions): Record<string, unknown> {
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

  const manifest: Record<string, unknown> = {
    name,
    short_name: shortName,
    start_url: startUrl,
    display,
    theme_color: themeColor,
    background_color: backgroundColor,
    scope,
    orientation: 'any'
  }

  if (description) {
    manifest.description = description
  }

  if (icons.length > 0) {
    manifest.icons = icons
  }

  return manifest
}

export async function registerServiceWorker(
  path: string,
  options: ServiceWorkerCallbacks = {}
): Promise<ServiceWorkerRegistration | null> {
  const { onUpdate, onReady } = options

  if (!('serviceWorker' in navigator)) {
    console.warn('[PWA] Service workers not supported')
    return null
  }

  try {
    const registration = await navigator.serviceWorker.register(path)

    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing
      if (!newWorker) return

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          if (onUpdate) {
            onUpdate(registration)
          }
        } else if (newWorker.state === 'activated') {
          if (onReady) {
            onReady(registration)
          }
        }
      })
    })

    if (registration.active && onReady) {
      onReady(registration)
    }

    return registration
  } catch (error) {
    console.error('[PWA] Service worker registration failed:', error)
    return null
  }
}

export async function unregisterServiceWorker(): Promise<boolean> {
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

export function isStandalone(): boolean {
  if (window.matchMedia) {
    const standaloneNavigator = window.navigator as Navigator & { standalone?: boolean }
    return window.matchMedia('(display-mode: standalone)').matches || standaloneNavigator.standalone === true
  }

  return false
}

export function isOnline(): boolean {
  return navigator.onLine
}

export function subscribeToConnectivity(callbacks: ConnectivityCallbacks): () => void {
  const { onOnline, onOffline } = callbacks

  const handleOnline = (): void => {
    if (onOnline) onOnline()
  }

  const handleOffline = (): void => {
    if (onOffline) onOffline()
  }

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
}

export async function requestPersistentStorage(): Promise<boolean> {
  if (navigator.storage?.persist) {
    return await navigator.storage.persist()
  }

  return false
}

export async function getStorageInfo(): Promise<StorageEstimate | null> {
  if (navigator.storage?.estimate) {
    return await navigator.storage.estimate()
  }

  return null
}

export async function sync(tag: string): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const syncRegistration = registration as ServiceWorkerRegistration & {
      sync?: { register: (syncTag: string) => Promise<void> }
    }

    if (syncRegistration.sync) {
      await syncRegistration.sync.register(tag)
      return true
    }
  } catch {
    // Background sync not supported or failed
  }

  return false
}

export async function subscribeToPush(options: PushOptions): Promise<PushSubscription | null> {
  const { serverUrl, publicKey } = options

  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('[PWA] Push notifications not supported')
    return null
  }

  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      return null
    }

    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource
    })

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

export async function unsubscribeFromPush(): Promise<boolean> {
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

export async function showNotification(title: string, options: NotificationOptions = {}): Promise<void> {
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

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let index = 0; index < rawData.length; ++index) {
    outputArray[index] = rawData.charCodeAt(index)
  }

  return outputArray
}

export const cache = {
  async add(cacheName: string, urls: string[]): Promise<void> {
    if (!('caches' in window)) return

    const cacheStorage = await caches.open(cacheName)
    await cacheStorage.addAll(urls)
  },

  async remove(cacheName: string, urls: string[]): Promise<void> {
    if (!('caches' in window)) return

    const cacheStorage = await caches.open(cacheName)
    for (const url of urls) {
      await cacheStorage.delete(url)
    }
  },

  async clear(): Promise<void> {
    if (!('caches' in window)) return

    const cacheKeys = await caches.keys()
    await Promise.all(cacheKeys.map((key) => caches.delete(key)))
  },

  async info(): Promise<CacheInfo[]> {
    if (!('caches' in window)) return []

    const cacheKeys = await caches.keys()
    const info: CacheInfo[] = []

    for (const key of cacheKeys) {
      const cacheStorage = await caches.open(key)
      const requests = await cacheStorage.keys()
      info.push({ name: key, size: requests.length })
    }

    return info
  }
}

export function checkCapabilities(): CapabilityInfo {
  return {
    serviceWorker: 'serviceWorker' in navigator,
    push: 'PushManager' in window,
    notifications: 'Notification' in window,
    backgroundSync: false,
    persistentStorage: Boolean(navigator.storage?.persist),
    addToHomeScreen: !isStandalone(),
    offline: 'serviceWorker' in navigator
  }
}

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