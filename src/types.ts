/**
 * Core type definitions for metaowl
 */

import type { ComponentConstructor } from '@odoo/owl'

/**
 * Route definition for metaowl router
 */
export interface Route {
  name: string
  path: string[]
  component: ComponentConstructor
}

/**
 * Route table passed to processRoutes
 */
export type RouteTable = Route[]

/**
 * Module imported via import.meta.glob
 */
export interface GlobModule {
  default?: unknown
  [key: string]: unknown
}

/**
 * Result of import.meta.glob with eager: true
 */
export type GlobModules = Record<string, GlobModule>

/**
 * OWL mount configuration options
 */
export interface OwlConfig {
  warnIfNoStaticProps?: boolean
  willStartTimeout?: number
  translatableAttributes?: string[]
  templates?: string
  [key: string]: unknown
}

/**
 * Meta tag configuration extracted from JS source
 */
export interface MetaConfig {
  title?: string
  description?: string
  keywords?: string
  author?: string
  canonical?: string
  ogTitle?: string
  ogDescription?: string
  ogImage?: string
  ogUrl?: string
  ogType?: string
  ogSiteName?: string
  ogImageWidth?: string | number
  ogImageHeight?: string | number
  ogLocale?: string
  twitterCard?: string
  twitterSite?: string
  twitterCreator?: string
  twitterTitle?: string
  twitterDescription?: string
  twitterImage?: string
  twitterImageAlt?: string
  twitterUrl?: string
  twitterSiteId?: string
  twitterCreatorId?: string
}

/**
 * Fetch configuration options
 */
export interface FetchConfig {
  baseUrl?: string
  onError?: ((error: Error) => void) | null
}

/**
 * HTTP methods supported by Fetch
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
