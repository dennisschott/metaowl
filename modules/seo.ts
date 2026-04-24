/**
 * @module SEO
 *
 * SEO utilities for MetaOwl applications.
 */

type ChangeFrequency = 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'

export interface SitemapEntry {
  url?: string
  lastmod?: string
  priority?: number
  changefreq?: ChangeFrequency | string
  image?: string
}

export interface RobotsConfig {
  userAgent?: string
  allow?: string[]
  disallow?: string[]
  crawlDelay?: number
  sitemap?: string
  host?: string
}

export type JsonLdSchema = {
  '@context'?: string
  '@type': string
} & Record<string, unknown>

interface SitemapOptions {
  baseUrl?: string
}

interface CanonicalOptions {
  removeQueryParams?: boolean
  allowedParams?: string[]
}

interface OpenGraphData {
  title: string
  description?: string
  type?: string
  url?: string
  image?: string
  siteName?: string
}

interface TwitterCardData {
  title: string
  description?: string
  card?: string
  image?: string
  site?: string
}

interface SitemapValidationResult {
  valid: boolean
  errors: string[]
}

interface PriorityOptions {
  maxDepth?: number
}

interface SitemapReference {
  loc: string
  lastmod?: string
}

const VALID_CHANGE_FREQUENCIES: ChangeFrequency[] = ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never']

export function generateSitemap(entries: SitemapEntry[], options: SitemapOptions = {}): string {
  const { baseUrl } = options

  if (!baseUrl) {
    throw new Error('[SEO] baseUrl is required for sitemap generation')
  }

  const normalizedBase = baseUrl.replace(/\/$/, '')

  const urls = entries.map((entry) => {
    const routeUrl = entry.url ?? ''
    const location = routeUrl.startsWith('http')
      ? routeUrl
      : `${normalizedBase}${routeUrl.startsWith('/') ? routeUrl : '/' + routeUrl}`

    let urlXml = `  <url>\n    <loc>${escapeXml(location)}</loc>\n`

    if (entry.lastmod) {
      urlXml += `    <lastmod>${entry.lastmod}</lastmod>\n`
    }

    if (entry.changefreq && VALID_CHANGE_FREQUENCIES.includes(entry.changefreq as ChangeFrequency)) {
      urlXml += `    <changefreq>${entry.changefreq}</changefreq>\n`
    }

    if (entry.priority !== undefined) {
      const priority = Math.max(0, Math.min(1, entry.priority)).toFixed(1)
      urlXml += `    <priority>${priority}</priority>\n`
    }

    if (entry.image) {
      urlXml += '    <image:image xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n'
      urlXml += `      <image:loc>${escapeXml(entry.image)}</image:loc>\n`
      urlXml += '    </image:image>\n'
    }

    urlXml += '  </url>'
    return urlXml
  })

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`
}

export function generateRobotsTxt(config: RobotsConfig | RobotsConfig[] = {}): string {
  const configs = Array.isArray(config) ? config : [config]

  const sections = configs.map((cfg) => {
    const {
      userAgent = '*',
      allow = [],
      disallow = [],
      crawlDelay
    } = cfg

    let section = `User-agent: ${userAgent}\n`

    for (const path of allow) {
      section += `Allow: ${path}\n`
    }

    for (const path of disallow) {
      section += `Disallow: ${path}\n`
    }

    if (crawlDelay !== undefined && crawlDelay > 0) {
      section += `Crawl-delay: ${crawlDelay}\n`
    }

    return section.trim()
  })

  const globalConfig = configs.find((cfg) => cfg.sitemap || cfg.host)
  if (globalConfig?.sitemap) {
    sections.push(`Sitemap: ${globalConfig.sitemap}`)
  }
  if (globalConfig?.host) {
    sections.push(`Host: ${globalConfig.host}`)
  }

  return sections.join('\n\n')
}

export function jsonLd(schema: JsonLdSchema): string {
  const fullSchema: JsonLdSchema = {
    '@context': 'https://schema.org',
    ...schema
  }

  return JSON.stringify(fullSchema, null, 2)
}

export function createCanonicalUrl(baseUrl: string, path: string, options: CanonicalOptions = {}): string {
  const { removeQueryParams = false, allowedParams = [] } = options
  const normalizedBase = baseUrl.replace(/\/$/, '')
  const [pathname, queryString] = path.split('?')
  const normalizedPath = pathname.startsWith('/') ? pathname : '/' + pathname

  if (!queryString || removeQueryParams) {
    return `${normalizedBase}${normalizedPath}`
  }

  if (allowedParams.length > 0) {
    const params = new URLSearchParams(queryString)
    const filtered = new URLSearchParams()

    for (const key of allowedParams) {
      const value = params.get(key)
      if (value !== null) {
        filtered.set(key, value)
      }
    }

    const filteredQuery = filtered.toString()
    return filteredQuery
      ? `${normalizedBase}${normalizedPath}?${filteredQuery}`
      : `${normalizedBase}${normalizedPath}`
  }

  return `${normalizedBase}${normalizedPath}?${queryString}`
}

export function generateOpenGraph(data: OpenGraphData): Record<string, string> {
  const {
    title,
    description,
    type = 'website',
    url,
    image,
    siteName
  } = data

  const tags: Record<string, string> = {
    'og:title': title,
    'og:type': type
  }

  if (description) tags['og:description'] = description
  if (url) tags['og:url'] = url
  if (image) tags['og:image'] = image
  if (siteName) tags['og:site_name'] = siteName

  return tags
}

export function generateTwitterCard(data: TwitterCardData): Record<string, string> {
  const {
    title,
    description,
    card = 'summary_large_image',
    image,
    site
  } = data

  const tags: Record<string, string> = {
    'twitter:card': card,
    'twitter:title': title
  }

  if (description) tags['twitter:description'] = description
  if (image) tags['twitter:image'] = image
  if (site) tags['twitter:site'] = site

  return tags
}

export function validateSitemap(entries: SitemapEntry[]): SitemapValidationResult {
  const errors: string[] = []

  for (let index = 0; index < entries.length; index++) {
    const entry = entries[index]

    if (!entry.url) {
      errors.push(`Entry ${index}: Missing required 'url'`)
    }

    if (entry.priority !== undefined && (entry.priority < 0 || entry.priority > 1)) {
      errors.push(`Entry ${index}: Priority must be between 0 and 1`)
    }

    if (entry.changefreq && !VALID_CHANGE_FREQUENCIES.includes(entry.changefreq as ChangeFrequency)) {
      errors.push(`Entry ${index}: Invalid changefreq '${entry.changefreq}'`)
    }

    if (entry.lastmod) {
      const date = new Date(entry.lastmod)
      if (Number.isNaN(date.getTime())) {
        errors.push(`Entry ${index}: Invalid lastmod date '${entry.lastmod}'`)
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

export function getPriorityByDepth(url: string, options: PriorityOptions = {}): number {
  const { maxDepth = 3 } = options
  const depth = url.split('/').filter(Boolean).length
  const priority = Math.max(0.1, 1 - (depth / maxDepth) * 0.3)
  return Math.round(priority * 10) / 10
}

export function generateSitemapIndex(sitemaps: SitemapReference[]): string {
  const entries = sitemaps.map((sitemap) => {
    let entry = `  <sitemap>\n    <loc>${escapeXml(sitemap.loc)}</loc>\n`
    if (sitemap.lastmod) {
      entry += `    <lastmod>${sitemap.lastmod}</lastmod>\n`
    }
    entry += '  </sitemap>'
    return entry
  })

  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</sitemapindex>`
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

export const SEO = {
  generateSitemap,
  generateRobotsTxt,
  jsonLd,
  createCanonicalUrl,
  generateOpenGraph,
  generateTwitterCard,
  validateSitemap,
  getPriorityByDepth,
  generateSitemapIndex
}

export default SEO