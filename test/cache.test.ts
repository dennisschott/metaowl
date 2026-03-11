import { describe, it, expect, beforeEach } from 'vitest'
import Cache from '../src/modules/cache.js'

const store: Record<string, string> = {}
const localStorageMock = {
  getItem: (k: string): string | null => store[k] ?? null,
  setItem: (k: string, v: string): void => { store[k] = v },
  removeItem: (k: string): void => { delete store[k] },
  clear: (): void => { Object.keys(store).forEach(k => delete store[k]) },
  get length(): number { return Object.keys(store).length },
  key: (i: number): string | null => Object.keys(store)[i] ?? null
}
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true })

beforeEach(() => localStorageMock.clear())

describe('Cache', () => {
  it('set and get a string value', async () => {
    await Cache.set('name', 'metaowl')
    expect(await Cache.get('name')).toBe('metaowl')
  })

  it('set and get an object', async () => {
    await Cache.set('obj', { a: 1, b: [2, 3] })
    expect(await Cache.get('obj')).toEqual({ a: 1, b: [2, 3] })
  })

  it('get returns null for missing key', async () => {
    expect(await Cache.get('missing')).toBeNull()
  })

  it('remove deletes the key', async () => {
    await Cache.set('tmp', 'x')
    await Cache.remove('tmp')
    expect(await Cache.get('tmp')).toBeNull()
  })

  it('clear removes all keys', async () => {
    await Cache.set('a', 1)
    await Cache.set('b', 2)
    await Cache.clear()
    expect(await Cache.get('a')).toBeNull()
    expect(await Cache.get('b')).toBeNull()
  })

  it('keys returns all stored keys', async () => {
    await Cache.set('x', 1)
    await Cache.set('y', 2)
    const keys = await Cache.keys()
    expect(keys).toContain('x')
    expect(keys).toContain('y')
    expect(keys).toHaveLength(2)
  })
})
