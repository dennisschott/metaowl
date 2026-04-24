import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  authenticate,
  call,
  configure,
  create,
  getConfig,
  getSession,
  isAuthenticated,
  isConfigured,
  listDatabases,
  logout,
  OdooService,
  onAuthChange,
  read,
  searchCount,
  searchRead,
  unlink,
  versionInfo,
  write
} from '../modules/odoo-rpc.js'

describe('Odoo RPC Service', () => {
  beforeEach(() => {
    logout()
    localStorage.clear()
    vi.restoreAllMocks()
  })

  describe('Configuration', () => {
    it('should configure with valid config', () => {
      configure({
        baseUrl: 'https://test.odoo.com',
        database: 'test_db',
        username: 'admin',
        password: 'admin'
      })

      expect(isConfigured()).toBe(true)
      expect(getConfig()).toMatchObject({
        baseUrl: 'https://test.odoo.com',
        database: 'test_db',
        username: 'admin',
        password: 'admin',
        persistSession: true
      })
    })

    it('should not be configured without baseUrl', () => {
      configure({ database: 'test_db' })
      expect(isConfigured()).toBe(false)
    })

    it('should not be configured without database', () => {
      configure({ baseUrl: 'https://test.odoo.com' })
      expect(isConfigured()).toBe(false)
    })

    it('should allow apiKey instead of password', () => {
      configure({
        baseUrl: 'https://test.odoo.com',
        database: 'test_db',
        username: 'admin',
        apiKey: 'test-api-key-123'
      })

      expect(getConfig()?.apiKey).toBe('test-api-key-123')
      expect(getConfig()?.password).toBeUndefined()
    })

    it('should support disabling session persistence', () => {
      configure({
        baseUrl: 'https://test.odoo.com',
        database: 'test_db',
        persistSession: false
      })

      expect(getConfig()?.persistSession).toBe(false)
    })
  })

  describe('Authentication', () => {
    beforeEach(() => {
      configure({
        baseUrl: 'https://test.odoo.com',
        database: 'test_db',
        username: 'admin',
        password: 'admin'
      })
    })

    it('should authenticate successfully', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers(),
          json: async () => ({ jsonrpc: '2.0', id: 123, result: 1 })
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers(),
          json: async () => ({
            jsonrpc: '2.0',
            id: 123,
            result: [{
              id: 1,
              name: 'Administrator',
              partner_id: [3, 'Administrator'],
              lang: 'en_US',
              tz: 'Europe/Brussels'
            }]
          })
        }) as any

      const rpcSession = await authenticate()

      expect(rpcSession.uid).toBe(1)
      expect(rpcSession.username).toBe('admin')
      expect(rpcSession.name).toBe('Administrator')
      expect(isAuthenticated()).toBe(true)
    })

    it('should throw error without credentials', async () => {
      configure({
        baseUrl: 'https://test.odoo.com',
        database: 'test_db'
      })

      await expect(authenticate()).rejects.toThrow('requires username and password')
    })

    it('should allow custom credentials in authenticate()', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers(),
          json: async () => ({ jsonrpc: '2.0', id: 123, result: 2 })
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers(),
          json: async () => ({ jsonrpc: '2.0', id: 123, result: [] })
        }) as any

      const rpcSession = await authenticate('custom_user', 'custom_pass')
      expect(rpcSession.username).toBe('custom_user')
    })

    it('should handle authentication failure', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        headers: new Headers(),
        json: async () => ({ jsonrpc: '2.0', id: 123, result: false })
      }) as any

      await expect(authenticate()).rejects.toThrow('invalid credentials')
    })

    it('should logout and clear session', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers(),
          json: async () => ({ jsonrpc: '2.0', id: 123, result: 1 })
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers(),
          json: async () => ({ jsonrpc: '2.0', id: 123, result: [] })
        }) as any

      await authenticate()
      expect(isAuthenticated()).toBe(true)

      logout()
      expect(isAuthenticated()).toBe(false)
      expect(getSession()).toBeNull()
    })

    it('should notify auth listeners on change', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers(),
          json: async () => ({ jsonrpc: '2.0', id: 123, result: 1 })
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers(),
          json: async () => ({ jsonrpc: '2.0', id: 123, result: [] })
        }) as any

      const listener = vi.fn()
      const unsubscribe = onAuthChange(listener)

      await authenticate()
      expect(listener).toHaveBeenCalledTimes(1)
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({ uid: 1 }))

      unsubscribe()
    })
  })

  describe('RPC Operations', () => {
    beforeEach(() => {
      configure({
        baseUrl: 'https://test.odoo.com',
        database: 'test_db',
        username: 'admin',
        password: 'admin'
      })

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers(),
        json: async () => ({ jsonrpc: '2.0', id: 123, result: 1 })
      }) as any
    })

    it('should throw if not authenticated', async () => {
      await expect(searchRead('res.partner')).rejects.toThrow('Not authenticated')
    })

    it('should perform search_read', async () => {
      const mockResult = [
        { id: 1, name: 'Partner 1' },
        { id: 2, name: 'Partner 2' }
      ]

      global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, headers: new Headers(), json: async () => ({ jsonrpc: '2.0', id: 123, result: 1 }) })
        .mockResolvedValueOnce({ ok: true, headers: new Headers(), json: async () => ({ jsonrpc: '2.0', id: 123, result: [] }) })
        .mockResolvedValueOnce({ ok: true, headers: new Headers(), json: async () => ({ jsonrpc: '2.0', id: 123, result: mockResult }) }) as any

      await authenticate()
      const partners = await searchRead('res.partner', {
        domain: [['is_company', '=', true]],
        fields: ['name', 'email'],
        limit: 10
      })

      expect(partners).toEqual(mockResult)
    })

    it('should call model methods', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, headers: new Headers(), json: async () => ({ jsonrpc: '2.0', id: 123, result: 1 }) })
        .mockResolvedValueOnce({ ok: true, headers: new Headers(), json: async () => ({ jsonrpc: '2.0', id: 123, result: [] }) })
        .mockResolvedValueOnce({ ok: true, headers: new Headers(), json: async () => ({ jsonrpc: '2.0', id: 123, result: 42 }) }) as any

      await authenticate()
      const result = await call('res.partner', 'custom_method', [['arg1']])

      expect(result).toBe(42)
    })

    it('should read specific records', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, headers: new Headers(), json: async () => ({ jsonrpc: '2.0', id: 123, result: 1 }) })
        .mockResolvedValueOnce({ ok: true, headers: new Headers(), json: async () => ({ jsonrpc: '2.0', id: 123, result: [] }) })
        .mockResolvedValueOnce({ ok: true, headers: new Headers(), json: async () => ({ jsonrpc: '2.0', id: 123, result: [{ id: 1, name: 'Partner 1' }] }) }) as any

      await authenticate()
      const records = await read('res.partner', [1], ['name', 'email'])

      expect(records).toEqual([{ id: 1, name: 'Partner 1' }])
    })

    it('should create records', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, headers: new Headers(), json: async () => ({ jsonrpc: '2.0', id: 123, result: 1 }) })
        .mockResolvedValueOnce({ ok: true, headers: new Headers(), json: async () => ({ jsonrpc: '2.0', id: 123, result: [] }) })
        .mockResolvedValueOnce({ ok: true, headers: new Headers(), json: async () => ({ jsonrpc: '2.0', id: 123, result: 123 }) }) as any

      await authenticate()
      const newId = await create('res.partner', { name: 'New Partner' })
      expect(newId).toBe(123)
    })

    it('should update records', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, headers: new Headers(), json: async () => ({ jsonrpc: '2.0', id: 123, result: 1 }) })
        .mockResolvedValueOnce({ ok: true, headers: new Headers(), json: async () => ({ jsonrpc: '2.0', id: 123, result: [] }) })
        .mockResolvedValueOnce({ ok: true, headers: new Headers(), json: async () => ({ jsonrpc: '2.0', id: 123, result: true }) }) as any

      await authenticate()
      const result = await write('res.partner', [1], { name: 'Updated Partner' })
      expect(result).toBe(true)
    })

    it('should delete records', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, headers: new Headers(), json: async () => ({ jsonrpc: '2.0', id: 123, result: 1 }) })
        .mockResolvedValueOnce({ ok: true, headers: new Headers(), json: async () => ({ jsonrpc: '2.0', id: 123, result: [] }) })
        .mockResolvedValueOnce({ ok: true, headers: new Headers(), json: async () => ({ jsonrpc: '2.0', id: 123, result: true }) }) as any

      await authenticate()
      const result = await unlink('res.partner', [1])
      expect(result).toBe(true)
    })

    it('should get search count', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, headers: new Headers(), json: async () => ({ jsonrpc: '2.0', id: 123, result: 1 }) })
        .mockResolvedValueOnce({ ok: true, headers: new Headers(), json: async () => ({ jsonrpc: '2.0', id: 123, result: [] }) })
        .mockResolvedValueOnce({ ok: true, headers: new Headers(), json: async () => ({ jsonrpc: '2.0', id: 123, result: 42 }) }) as any

      await authenticate()
      const count = await searchCount('res.partner', [['is_company', '=', true]])

      expect(count).toBe(42)
    })
  })

  describe('Database Operations', () => {
    beforeEach(() => {
      configure({
        baseUrl: 'https://test.odoo.com',
        database: 'test_db'
      })
    })

    it('should list databases', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        headers: new Headers(),
        json: async () => ({ jsonrpc: '2.0', id: 123, result: ['db1', 'db2', 'db3'] })
      }) as any

      const dbs = await listDatabases()
      expect(dbs).toEqual(['db1', 'db2', 'db3'])
    })

    it('should get version info', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        headers: new Headers(),
        json: async () => ({
          result: {
            server_version: '16.0',
            server_version_info: [16, 0, 0, 'final', 0],
            protocol_version: 1
          }
        })
      }) as any

      const version = await versionInfo<{ server_version: string }>()
      expect(version.server_version).toBe('16.0')
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      configure({
        baseUrl: 'https://test.odoo.com',
        database: 'test_db',
        username: 'admin',
        password: 'admin'
      })
    })

    it('should handle RPC errors', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        headers: new Headers(),
        json: async () => ({
          jsonrpc: '2.0',
          id: 123,
          error: {
            message: 'Access Denied',
            data: { message: 'You do not have permission' }
          }
        })
      }) as any

      await expect(authenticate()).rejects.toThrow('Access Denied')
    })

    it('should handle HTTP errors', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Headers(),
        json: async () => ({})
      }) as any

      await expect(authenticate()).rejects.toThrow('HTTP 500')
    })

    it('should throw if not configured', async () => {
      configure({ baseUrl: '', database: '' })
      await expect(listDatabases()).rejects.toThrow('not configured')
    })
  })

  describe('OdooService Namespace', () => {
    it('should expose all methods via namespace', () => {
      expect(OdooService.configure).toBe(configure)
      expect(OdooService.authenticate).toBe(authenticate)
      expect(OdooService.logout).toBe(logout)
      expect(OdooService.searchRead).toBe(searchRead)
      expect(OdooService.call).toBe(call)
      expect(OdooService.isAuthenticated).toBe(isAuthenticated)
    })
  })
})