import { describe, it, expect, beforeEach, vi } from 'vitest'
import Fetch from '../modules/fetch.js'

beforeEach(() => {
  Fetch.configure({ baseUrl: '', onError: null })
  vi.restoreAllMocks()
})

describe('Fetch.configure', () => {
  it('sets baseUrl', () => {
    Fetch.configure({ baseUrl: 'https://api.example.com' })
    expect(Fetch._baseUrl).toBe('https://api.example.com')
  })

  it('sets onError callback', () => {
    const handler = vi.fn()
    Fetch.configure({ onError: handler })
    expect(Fetch._onError).toBe(handler)
  })

  it('defaults baseUrl to empty string', () => {
    Fetch.configure({})
    expect(Fetch._baseUrl).toBe('')
  })
})

describe('Fetch.url', () => {
  it('prepends baseUrl for internal requests', async () => {
    Fetch.configure({ baseUrl: 'https://api.example.com' })
    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ ok: true })
    })
    vi.stubGlobal('fetch', mockFetch)

    await Fetch.url('/items')
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/items',
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('does not prepend baseUrl when internal=false', async () => {
    Fetch.configure({ baseUrl: 'https://api.example.com' })
    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({})
    })
    vi.stubGlobal('fetch', mockFetch)

    await Fetch.url('https://other.com/data', 'GET', null, false)
    expect(mockFetch).toHaveBeenCalledWith(
      'https://other.com/data',
      expect.anything()
    )
  })

  it('sends JSON body for POST requests', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({})
    })
    vi.stubGlobal('fetch', mockFetch)

    await Fetch.url('/items', 'POST', { name: 'test' })
    expect(mockFetch).toHaveBeenCalledWith(
      '/items',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'test' })
      })
    )
  })

  it('returns null and calls onError on network failure', async () => {
    const onError = vi.fn()
    Fetch.configure({ onError })
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))

    const result = await Fetch.url('/fail')
    expect(result).toBeNull()
    expect(onError).toHaveBeenCalledOnce()
  })

  it('returns null and skips onError when triggerErrorHandler=false', async () => {
    const onError = vi.fn()
    Fetch.configure({ onError })
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))

    const result = await Fetch.url('/fail', 'GET', null, true, false)
    expect(result).toBeNull()
    expect(onError).not.toHaveBeenCalled()
  })

  it('returns parsed JSON on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ id: 42 })
    }))

    const result = await Fetch.url('/item/42')
    expect(result).toEqual({ id: 42 })
  })
})
