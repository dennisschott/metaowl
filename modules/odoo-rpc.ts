/**
 * @module OdooRPC
 *
 * Odoo JSON-RPC Service for MetaOwl applications.
 */

export interface OdooConfig {
  baseUrl: string
  database: string
  username?: string
  password?: string
  apiKey?: string
  persistSession?: boolean
}

export interface SearchReadOptions {
  domain?: unknown[][]
  fields?: string[]
  limit?: number
  offset?: number
  order?: string
  context?: Record<string, unknown>
}

export interface OdooSession {
  uid: number
  username: string
  name?: string
  partner_id?: number
  lang?: string
  tz?: string
  user_context?: string[]
}

interface JsonRpcErrorPayload {
  message?: string
  data?: {
    message?: string
  }
}

interface JsonRpcResponse<T> {
  result?: T
  error?: JsonRpcErrorPayload
}

type AuthListener = (session: OdooSession | null) => void

let config: OdooConfig | null = null
let session: OdooSession | null = null
let csrfToken: string | null = null
const authListeners: AuthListener[] = []

const SESSION_KEY = 'metaowl:odoo:session'
const CSRF_KEY = 'metaowl:odoo:csrf'

export function configure(nextConfig: Partial<OdooConfig>): void {
  config = {
    persistSession: true,
    baseUrl: '',
    database: '',
    ...nextConfig
  }

  if (config.persistSession) {
    restoreSession()
  }
}

export function getConfig(): OdooConfig | null {
  return config
}

export function isConfigured(): boolean {
  return config !== null && Boolean(config.baseUrl) && Boolean(config.database)
}

function restoreSession(): void {
  try {
    const sessionData = localStorage.getItem(SESSION_KEY)
    const csrfData = localStorage.getItem(CSRF_KEY)

    if (sessionData) {
      session = JSON.parse(sessionData) as OdooSession
    }
    if (csrfData) {
      csrfToken = csrfData
    }
  } catch {
    // Ignore storage errors
  }
}

function saveSession(): void {
  if (!config?.persistSession) return

  try {
    if (session) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    } else {
      localStorage.removeItem(SESSION_KEY)
    }

    if (csrfToken) {
      localStorage.setItem(CSRF_KEY, csrfToken)
    } else {
      localStorage.removeItem(CSRF_KEY)
    }
  } catch {
    // Ignore storage errors
  }
}

async function jsonRpc<T = unknown>(service: string, method: string, args: unknown[] = []): Promise<T> {
  if (!isConfigured() || !config) {
    throw new Error('[metaowl] OdooService not configured. Call configure() first.')
  }

  const url = `${config.baseUrl}/jsonrpc`
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

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }

  if (csrfToken) {
    headers['X-CSRF-Token'] = csrfToken
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

  const data = await response.json() as JsonRpcResponse<T>

  if (data.error) {
    const error = data.error
    throw new Error(`[metaowl] Odoo Error: ${error.message || error.data?.message || JSON.stringify(error)}`)
  }

  const setCookie = response.headers.get('set-cookie')
  if (setCookie?.includes('csrf_token')) {
    const match = setCookie.match(/csrf_token=([^;]+)/)
    if (match) {
      csrfToken = match[1] ?? null
      saveSession()
    }
  }

  return data.result as T
}

export async function authenticate(username?: string, password?: string): Promise<OdooSession> {
  const user = username || config?.username
  const pass = password || config?.password || config?.apiKey

  if (!user || !pass || !config) {
    throw new Error('[metaowl] Authentication requires username and password/apiKey')
  }

  const uid = await jsonRpc<number | false>('common', 'authenticate', [
    config.database,
    user,
    pass,
    {}
  ])

  if (!uid) {
    throw new Error('[metaowl] Authentication failed: invalid credentials')
  }

  session = {
    uid,
    username: user
  }

  try {
    const userInfo = await searchRead<Record<string, unknown>>('res.users', {
      domain: [['id', '=', uid]],
      fields: ['name', 'partner_id', 'lang', 'tz'],
      limit: 1
    })

    if (userInfo.length > 0) {
      const firstUser = userInfo[0]
      session.name = typeof firstUser.name === 'string' ? firstUser.name : undefined
      session.partner_id = Array.isArray(firstUser.partner_id) ? Number(firstUser.partner_id[0]) : undefined
      session.lang = typeof firstUser.lang === 'string' ? firstUser.lang : undefined
      session.tz = typeof firstUser.tz === 'string' ? firstUser.tz : undefined
    }
  } catch {
    // Ignore user info fetch errors
  }

  saveSession()
  notifyAuthListeners()

  return session
}

export function isAuthenticated(): boolean {
  return session !== null && session.uid !== null
}

export function getSession(): OdooSession | null {
  return session
}

export function logout(): void {
  session = null
  csrfToken = null
  saveSession()
  notifyAuthListeners()
}

export async function searchRead<T extends Record<string, unknown> = Record<string, unknown>>(
  model: string,
  options: SearchReadOptions = {}
): Promise<T[]> {
  const {
    domain = [],
    fields = [],
    limit = 80,
    offset = 0,
    order = '',
    context = {}
  } = options

  if (!isAuthenticated() || !config || !session) {
    throw new Error('[metaowl] Not authenticated. Call authenticate() first.')
  }

  const args = [
    config.database,
    session.uid,
    config.password || config.apiKey,
    model,
    'search_read',
    [domain],
    { fields, limit, offset, order, context }
  ]

  return await jsonRpc<T[]>('object', 'execute_kw', args)
}

export async function call<T = unknown>(model: string, method: string, args: unknown[] = [], kwargs: Record<string, unknown> = {}): Promise<T> {
  if (!isAuthenticated() || !config || !session) {
    throw new Error('[metaowl] Not authenticated. Call authenticate() first.')
  }

  const rpcArgs = [
    config.database,
    session.uid,
    config.password || config.apiKey,
    model,
    method,
    args,
    kwargs
  ]

  return await jsonRpc<T>('object', 'execute_kw', rpcArgs)
}

export async function read<T extends Record<string, unknown> = Record<string, unknown>>(model: string, ids: number[], fields: string[] = []): Promise<T[]> {
  return await call<T[]>(model, 'read', [ids], { fields })
}

export async function create(model: string, values: Record<string, unknown>): Promise<number> {
  return await call<number>(model, 'create', [[values]])
}

export async function write(model: string, ids: number[], values: Record<string, unknown>): Promise<boolean> {
  return await call<boolean>(model, 'write', [ids, values])
}

export async function unlink(model: string, ids: number[]): Promise<boolean> {
  return await call<boolean>(model, 'unlink', [ids])
}

export async function searchCount(model: string, domain: unknown[][] = []): Promise<number> {
  return await call<number>(model, 'search_count', [domain])
}

export async function listDatabases(): Promise<string[]> {
  return await jsonRpc<string[]>('db', 'list', [])
}

export async function versionInfo<T extends Record<string, unknown> = Record<string, unknown>>(): Promise<T> {
  if (!config) {
    throw new Error('[metaowl] OdooService not configured. Call configure() first.')
  }

  const response = await fetch(`${config.baseUrl}/web/webclient/version_info`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}'
  })

  if (!response.ok) {
    throw new Error(`[metaowl] Failed to get version info: ${response.status}`)
  }

  const data = await response.json() as { result: T }
  return data.result
}

export function onAuthChange(callback: AuthListener): () => void {
  authListeners.push(callback)
  return () => {
    const index = authListeners.indexOf(callback)
    if (index > -1) {
      authListeners.splice(index, 1)
    }
  }
}

function notifyAuthListeners(): void {
  for (const listener of authListeners) {
    try {
      listener(session)
    } catch {
      // Ignore listener errors
    }
  }
}

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