import { describe, it, expect, beforeEach, vi } from 'vitest'
import Fetch from '../src/modules/fetch.js'

beforeEach(() => {
  Fetch.configure({ baseUrl: '', onError: null })
  vi.restoreAllMocks()
})

describe('Fetch.configure', () => {
  it('sets baseUrl', () => {
    Fetch.configure({ baseUrl: 'https://api.example.com' })
    expect((Fetch as unknown as { _baseUrl: string })._baseUrl).toBe('https://api.example.com')
  })

  it('sets onError callback', () => {
    const handler = vi.fn()
    Fetch.configure({ onError: handler })
    expect((Fetch as unknown as { _onError: typeof handler })._onError).toBe(handler)
  })

  it('defaults baseUrl to empty string', () => {
    Fetch.configure({})
    expect((Fetch as unknown as { _baseUrl: string })._baseUrl).toBe('')
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
})
