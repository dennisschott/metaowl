/**
 * @module OdooRPC
 *
 * Odoo JSON-RPC Service for MetaOwl applications.
 *
 * Features:
 * - JSON-RPC 2.0 compliant communication
 * - Authentication handling
 * - Automatic CSRF token management
 * - Session persistence
 * - Common Odoo operations (search_read, call, etc.)
 *
 * Usage:
 *   import { OdooService } from 'metaowl'
 *
 *   // Configure connection
 *   OdooService.configure({
 *     baseUrl: 'https://my-odoo-instance.com',
 *     database: 'my_database',
 *     username: 'admin',
 *     password: 'admin'
 *   })
 *
 *   // Authenticate
 *   await OdooService.authenticate()
 *
 *   // Search and read records
 *   const partners = await OdooService.searchRead('res.partner', {
 *     domain: [['is_company', '=', true]],
 *     fields: ['name', 'email'],
 *     limit: 10
 *   })
 *
 *   // Call any model method
 *   const result = await OdooService.call('res.partner', 'create', [{
 *     name: 'New Partner',
 *     email: 'partner@example.com'
 *   }])
 */

import { Fetch } from './fetch.js'

/**
 * @typedef {Object} OdooConfig
 * @property {string} baseUrl - Odoo instance URL
 * @property {string} database - Database name
 * @property {string} [username] - Username for authentication
 * @property {string} [password] - Password for authentication
 * @property {string} [apiKey] - API key for authentication (alternative to password)
 * @property {boolean} [persistSession=true] - Persist session in localStorage
 */

/**
 * @typedef {Object} SearchReadOptions
 * @property {Array[]} [domain=[]] - Search domain
 * @property {string[]} [fields=[]] - Fields to read
 * @property {number} [limit=80] - Max records
 * @property {number} [offset=0] - Offset for pagination
 * @property {string} [order] - Order by clause
 * @property {Object} [context={}] - Odoo context
 */

/**
 * @typedef {Object} OdooSession
 * @property {number} uid - User ID
 * @property {string} username - Username
 * @property {string} [name] - Display name
 * @property {number} [partner_id] - Partner ID
 * @property {string[]} [user_context] - User context
 */

/** @type {OdooConfig|null} */
let _config = null

/** @type {OdooSession|null} */
let _session = null

/** @type {string|null} */
let _csrfToken = null

/** @type {Function[]} */
const _authListeners = []

const SESSION_KEY = 'metaowl:odoo:session'
const CSRF_KEY = 'metaowl:odoo:csrf'

/**
 * Configure the Odoo RPC service.
 *
 * @param {OdooConfig} config
 */
export function configure(config) {
  _config = {
    persistSession: true,
    ...config
  }

  // Try to restore session from localStorage
  if (_config.persistSession) {
    restoreSession()
  }
}

/**
 * Get current configuration.
 *
 * @returns {OdooConfig|null}
 */
export function getConfig() {
  return _config
}

/**
 * Check if service is configured.
 *
 * @returns {boolean}
 */
export function isConfigured() {
  return _config !== null && !!_config.baseUrl && !!_config.database
}

/**
 * Restore session from localStorage.
 */
function restoreSession() {
  try {
    const sessionData = localStorage.getItem(SESSION_KEY)
    const csrfData = localStorage.getItem(CSRF_KEY)

    if (sessionData) {
      _session = JSON.parse(sessionData)
    }
    if (csrfData) {
      _csrfToken = csrfData
    }
  } catch {
    // Ignore storage errors
  }
}

/**
 * Save session to localStorage.
 */
function saveSession() {
  if (!_config?.persistSession) return

  try {
    if (_session) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(_session))
    } else {
      localStorage.removeItem(SESSION_KEY)
    }
    if (_csrfToken) {
      localStorage.setItem(CSRF_KEY, _csrfToken)
    } else {
      localStorage.removeItem(CSRF_KEY)
    }
  } catch {
    // Ignore storage errors
  }
}

/**
 * Make JSON-RPC request to Odoo.
 *
 * @param {string} service - Service name (e.g., 'common', 'object', 'db')
 @param {string} method - Method name
 * @param {any[]} args - Method arguments
 * @returns {Promise<any>}
 * @throws {Error}
 */
async function jsonRpc(service, method, args = []) {
  if (!isConfigured()) {
    throw new Error('[metaowl] OdooService not configured. Call configure() first.')
  }

  const url = `${_config.baseUrl}/jsonrpc`

  const payload = {
    jsonrpc: '2.0',
    method: 'call',
    params: {
      service,
      method,
      args
    },
    id: Math.floor(Math.random() * 1000000000)
  }

  const headers = {
    'Content-Type': 'application/json'
  }

  if (_csrfToken) {
    headers['X-CSRF-Token'] = _csrfToken
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    credentials: 'include'
  })

  if (!response.ok) {
    throw new Error(`[metaowl] HTTP ${response.status}: ${response.statusText}`)
  }

  const data = await response.json()

  if (data.error) {
    const error = data.error
    throw new Error(`[metaowl] Odoo Error: ${error.message || error.data?.message || JSON.stringify(error)}`)
  }

  // Extract CSRF token from cookies if present
  const setCookie = response.headers.get('set-cookie')
  if (setCookie?.includes('csrf_token')) {
    const match = setCookie.match(/csrf_token=([^;]+)/)
    if (match) {
      _csrfToken = match[1]
      saveSession()
    }
  }

  return data.result
}

/**
 * Authenticate with Odoo.
 *
 * @param {string} [username] - Override configured username
 * @param {string} [password] - Override configured password
 * @returns {Promise<OdooSession>} Session info
 * @throws {Error}
 */
export async function authenticate(username, password) {
  const user = username || _config?.username
  const pass = password || _config?.password || _config?.apiKey

  if (!user || !pass) {
    throw new Error('[metaowl] Authentication requires username and password/apiKey')
  }

  const uid = await jsonRpc('common', 'authenticate', [
    _config.database,
    user,
    pass,
    {}
  ])

  if (!uid) {
    throw new Error('[metaowl] Authentication failed: invalid credentials')
  }

  _session = {
    uid,
    username: user
  }

  // Get user info
  try {
    const userInfo = await searchRead('res.users', {
      domain: [['id', '=', uid]],
      fields: ['name', 'partner_id', 'lang', 'tz'],
      limit: 1
    })

    if (userInfo.length > 0) {
      _session.name = userInfo[0].name
      _session.partner_id = userInfo[0].partner_id?.[0]
      _session.lang = userInfo[0].lang
      _session.tz = userInfo[0].tz
    }
  } catch {
    // Ignore user info fetch errors
  }

  saveSession()
  notifyAuthListeners()

  return _session
}

/**
 * Check if currently authenticated.
 *
 * @returns {boolean}
 */
export function isAuthenticated() {
  return _session !== null && _session.uid !== null
}

/**
 * Get current session.
 *
 * @returns {OdooSession|null}
 */
export function getSession() {
  return _session
}

/**
 * Logout and clear session.
 */
export function logout() {
  _session = null
  _csrfToken = null
  saveSession()
  notifyAuthListeners()
}

/**
 * Search and read records from Odoo.
 *
 * @param {string} model - Model name (e.g., 'res.partner')
 * @param {SearchReadOptions} options - Search options
 * @returns {Promise<Object[]>} Records
 */
export async function searchRead(model, options = {}) {
  const {
    domain = [],
    fields = [],
    limit = 80,
    offset = 0,
    order = '',
    context = {}
  } = options

  if (!isAuthenticated()) {
    throw new Error('[metaowl] Not authenticated. Call authenticate() first.')
  }

  const args = [
    _config.database,
    _session.uid,
    _config.password || _config.apiKey,
    model,
    'search_read',
    [domain],
    { fields, limit, offset, order, context }
  ]

  return await jsonRpc('object', 'execute_kw', args)
}

/**
 * Call any model method.
 *
 * @param {string} model - Model name
 * @param {string} method - Method name
 * @param {any[]} [args=[]] - Positional arguments
 * @param {Object} [kwargs={}] - Keyword arguments
 * @returns {Promise<any>}
 */
export async function call(model, method, args = [], kwargs = {}) {
  if (!isAuthenticated()) {
    throw new Error('[metaowl] Not authenticated. Call authenticate() first.')
  }

  const rpcArgs = [
    _config.database,
    _session.uid,
    _config.password || _config.apiKey,
    model,
    method,
    args,
    kwargs
  ]

  return await jsonRpc('object', 'execute_kw', rpcArgs)
}

/**
 * Read specific records by ID.
 *
 * @param {string} model - Model name
 * @param {number[]} ids - Record IDs
 * @param {string[]} [fields=[]] - Fields to read
 * @returns {Promise<Object[]>}
 */
export async function read(model, ids, fields = []) {
  return await call(model, 'read', [ids], { fields })
}

/**
 * Create a new record.
 *
 * @param {string} model - Model name
 * @param {Object} values - Field values
 * @returns {Promise<number>} New record ID
 */
export async function create(model, values) {
  return await call(model, 'create', [[values]])
}

/**
 * Update existing records.
 *
 * @param {string} model - Model name
 * @param {number[]} ids - Record IDs to update
 * @param {Object} values - New field values
 * @returns {Promise<boolean>}
 */
export async function write(model, ids, values) {
  return await call(model, 'write', [ids, values])
}

/**
 * Delete records.
 *
 * @param {string} model - Model name
 * @param {number[]} ids - Record IDs to delete
 * @returns {Promise<boolean>}
 */
export async function unlink(model, ids) {
  return await call(model, 'unlink', [ids])
}

/**
 * Get count of records matching domain.
 *
 * @param {string} model - Model name
 * @param {Array[]} [domain=[]] - Search domain
 * @returns {Promise<number>}
 */
export async function searchCount(model, domain = []) {
  return await call(model, 'search_count', [domain])
}

/**
 * Get list of available databases.
 *
 * @returns {Promise<string[]>}
 */
export async function listDatabases() {
  return await jsonRpc('db', 'list', [])}

/**
 * Check version of Odoo server.
 *
 * @returns {Promise<Object>} Version info
 */
export async function versionInfo() {
  const response = await fetch(`${_config.baseUrl}/web/webclient/version_info`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}'
  })

  if (!response.ok) {
    throw new Error(`[metaowl] Failed to get version info: ${response.status}`)
  }

  const data = await response.json()
  return data.result
}

/**
 * Register auth state change listener.
 *
 * @param {Function} callback - Called with (session|null) when auth changes
 * @returns {Function} Unsubscribe function
 */
export function onAuthChange(callback) {
  _authListeners.push(callback)
  return () => {
    const index = _authListeners.indexOf(callback)
    if (index > -1) {
      _authListeners.splice(index, 1)
    }
  }
}

/**
 * Notify all auth listeners.
 */
function notifyAuthListeners() {
  for (const listener of _authListeners) {
    try {
      listener(_session)
    } catch {
      // Ignore listener errors
    }
  }
}

/**
 * OdooService namespace for convenient access.
 */
export const OdooService = {
  configure,
  getConfig,
  isConfigured,
  authenticate,
  isAuthenticated,
  getSession,
  logout,
  searchRead,
  call,
  read,
  create,
  write,
  unlink,
  searchCount,
  listDatabases,
  versionInfo,
  onAuthChange
}

export default OdooService
