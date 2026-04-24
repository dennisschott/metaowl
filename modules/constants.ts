import type { Component } from '@odoo/owl'

export interface RouteConfig {
  path?: string
  meta?: Record<string, unknown>
  beforeEnter?: (...args: unknown[]) => unknown
  [key: string]: unknown
}

export type OwlComponent = {
  new (...args: unknown[]): Component
  route?: RouteConfig
  template?: string
  name?: string
}

export const MAGIC_STRINGS = {
  STORE_SESSION_KEY: 'metaowl:odoo:session',
  STORE_CSRF_KEY: 'metaowl:odoo:csrf',
  MOUNT_ELEMENT_ID: 'metaowl',
  LINK_TEMPLATE_NAME: 'Link'
} as const

export const ROUTE_PATTERN_CONFIG = {
  optionalParam: /\/:([^/(]+)\?/g,
  catchAll: /\/:([^/(]+)\(\.\*\)/g,
  namedParam: /:([^/(?\s]+)/g,
  wildcard: /\*/g,
  separator: /\//g
} as const

export function buildRouteRegexPattern(path: string): string {
  const pattern = path
    .replace(ROUTE_PATTERN_CONFIG.separator, '\\/')
    .replace(ROUTE_PATTERN_CONFIG.catchAll, '/(.*)')
    .replace(ROUTE_PATTERN_CONFIG.optionalParam, '(?:/([^/]+))?')
    .replace(ROUTE_PATTERN_CONFIG.namedParam, '([^/]+)')
    .replace(ROUTE_PATTERN_CONFIG.wildcard, '(.*)')

  return '^' + pattern + '$'
}

export function buildSimpleRoutePattern(routePath: string): string {
  const pattern = routePath
    .replace(ROUTE_PATTERN_CONFIG.separator, '\\/')
    .replace(ROUTE_PATTERN_CONFIG.catchAll, '(.*)')
    .replace(ROUTE_PATTERN_CONFIG.optionalParam, '(?:/([^/]+))?')
    .replace(ROUTE_PATTERN_CONFIG.namedParam, '([^/]+)')
    .replace(ROUTE_PATTERN_CONFIG.wildcard, '(.*)')

  return '^' + pattern + '$'
}

export function normalizeRoutePath(path: string): string {
  return (path.replace(/\/$/, '') || '/')
}

export function normalizePathForComparison(path: string): string {
  return normalizeRoutePath(path)
}

export const EXTERNAL_URL_REGEX = /^(https?:|\/\/|mailto:|tel:|ftp:|file:|javascript:)/i