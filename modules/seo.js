/**
 * @module SEO
 *
 * SEO utilities for MetaOwl applications.
 *
 * Features:
 * - Sitemap generation
 * - robots.txt generation
 * - Meta tag helpers
 * - Structured data (JSON-LD) helpers
 * - Canonical URL generation
 * - Open Graph utilities
 *
 * Usage:
 *   import { SEO } from 'metaowl'
 *
 *   // Generate sitemap
 *   const sitemap = SEO.generateSitemap([
 *     { url: '/', priority: 1.0, changefreq: 'daily' },
 *     { url: '/about', priority: 0.8 }
 *   ], {
 *     baseUrl: 'https://myapp.com'
 *   })
 *
 *   // Generate robots.txt
 *   const robots = SEO.generateRobotsTxt({
 *     userAgent: '*',
 *     allow: ['/'],
 *     sitemap: 'https://myapp.com/sitemap.xml'
 *   })
 *
 *   // JSON-LD structured data
 *   const schema = SEO.jsonLd({
 *     '@type': 'Organization',
 *     name: 'My Company',
 *     url: 'https://myapp.com'
 *   })
 */

/**
 * @typedef {Object} SitemapEntry
 * @property {string} url - URL path (e.g., '/about')
 * @property {string} [lastmod] - Last modification date (ISO 8601)
 * @property {number} [priority] - Priority (0.0 to 1.0)
 * @property {string} [changefreq] - Change frequency (always, hourly, daily, weekly, monthly, yearly, never)
 * @property {string} [image] - Image URL
 */

/**
 * @typedef {Object} RobotsConfig
 * @property {string} [userAgent='*'] - User agent
 * @property {string[]} [allow=[]] - Allowed paths
 * @property {string[]} [disallow=[]] - Disallowed paths
 * @property {number} [crawlDelay] - Crawl delay in seconds
 * @property {string} [sitemap] - Sitemap URL
 * @property {string} [host] - Preferred host
 */

/**
 * @typedef {Object} JsonLdSchema
 * @property {string} '@context' - Schema context (usually https://schema.org)
 * @property {string} '@type' - Schema type
 */

/**
 * Generate XML sitemap.
 *
 * @param {SitemapEntry[]} entries - Sitemap entries
 * @param {Object} options - Options
 * @param {string} options.baseUrl - Base URL for the site
 * @returns {string} XML sitemap content
 *
 * @example
 * const sitemap = generateSitemap([
 *   { url: '/', priority: 1.0, changefreq: 'daily' },
 *   { url: '/products', priority: 0.8, changefreq: 'weekly' },
 *   { url: '/about', priority: 0.5 }
 * ], { baseUrl: 'https://myapp.com' })
 *
 * console.log(sitemap)
 * // <?xml version="1.0" encoding="UTF-8"?>
 * // <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
 * //   <url>
 * //     <loc>https://myapp.com/</loc>
 * //     <priority>1.0</priority>
 * //     <changefreq>daily</changefreq>
 * //   </url>
 * //   ...
 * // </urlset>
 */
export function generateSitemap(entries, options = {}) {
  const { baseUrl } = options

  if (!baseUrl) {
    throw new Error('[SEO] baseUrl is required for sitemap generation')
  }

  // Normalize base URL (remove trailing slash)
  const normalizedBase = baseUrl.replace(/\/$/, '')

  const urls = entries.map(entry => {
    const loc = entry.url.startsWith('http')
      ? entry.url
      : `${normalizedBase}${entry.url.startsWith('/') ? entry.url : '/' + entry.url}`

    let urlXml = `  <url>\n    <loc>${escapeXml(loc)}</loc>\n`

    if (entry.lastmod) {
      urlXml += `    <lastmod>${entry.lastmod}</lastmod>\n`
    }

    if (entry.changefreq) {
      const validFreqs = ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never']
      if (validFreqs.includes(entry.changefreq)) {
        urlXml += `    <changefreq>${entry.changefreq}</changefreq>\n`
      }
    }

    if (entry.priority !== undefined) {
      const priority = Math.max(0, Math.min(1, entry.priority)).toFixed(1)
      urlXml += `    <priority>${priority}</priority>\n`
    }

    if (entry.image) {
      urlXml += `    <image:image xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`
      urlXml += `      <image:loc>${escapeXml(entry.image)}</image:loc>\n`
      urlXml += `    </image:image>\n`
    }

    urlXml += '  </url>'
    return urlXml
  })

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`
}

/**
 * Generate robots.txt content.
 *
 * @param {RobotsConfig|RobotsConfig[]} config - Robots configuration
 * @returns {string} robots.txt content
 *
 * @example
 * const robots = generateRobotsTxt({
 *   userAgent: '*',
 *   allow: ['/'],
 *   disallow: ['/admin/', '/private/'],
 *   sitemap: 'https://myapp.com/sitemap.xml'
 * })
 *
 * console.log(robots)
 * // User-agent: *
 * // Allow: /
 * // Disallow: /admin/
 * // Disallow: /private/
 * //
 * // Sitemap: https://myapp.com/sitemap.xml
 */
export function generateRobotsTxt(config = {}) {
  const configs = Array.isArray(config) ? config : [config]

  const sections = configs.map(cfg => {
    const {
      userAgent = '*',
      allow = [],
      disallow = [],
      crawlDelay,
      sitemap,
      host
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

  // Add global sitemap and host at the end
  const globalConfig = configs.find(c => c.sitemap || c.host)
  if (globalConfig?.sitemap) {
    sections.push(`Sitemap: ${globalConfig.sitemap}`)
  }
  if (globalConfig?.host) {
    sections.push(`Host: ${globalConfig.host}`)
  }

  return sections.join('\n\n')
}

/**
 * Create JSON-LD structured data script tag content.
 *
 * @param {Object} schema - JSON-LD schema object
 * @param {string} [schema['@context']='https://schema.org'] - Schema context
 * @returns {string} JSON-LD script content (without script tags)
 *
 * @example
 * const schema = jsonLd({
 *   '@type': 'Organization',
 *   name: 'My Company',
 *   url: 'https://myapp.com',
 *   logo: 'https://myapp.com/logo.png'
 * })
 *
 * // In template:
 * // <script type="application/ld+json">${schema}</script>
 */
export function jsonLd(schema) {
  const fullSchema = {
    '@context': 'https://schema.org',
    ...schema
  }
  return JSON.stringify(fullSchema, null, 2)
}

/**
 * Create canonical URL.
 *
 * @param {string} baseUrl - Base site URL
 * @param {string} path - Path (can include query string)
 * @param {Object} options - Options
 * @param {boolean} [options.removeQueryParams=false] - Remove query parameters
 * @param {string[]} [options.allowedParams=[]] - Query parameters to keep
 * @returns {string} Canonical URL
 *
 * @example
 * const canonical = createCanonicalUrl('https://myapp.com', '/products?id=123&sort=price')
 * // 'https://myapp.com/products?id=123&sort=price'
 *
 * const cleanCanonical = createCanonicalUrl(
 *   'https://myapp.com',
 *   '/products?id=123&utm_source=email',
 *   { allowedParams: ['id'] }
 * )
 * // 'https://myapp.com/products?id=123'
 */
export function createCanonicalUrl(baseUrl, path, options = {}) {
  const { removeQueryParams = false, allowedParams = [] } = options

  // Normalize base URL
  const normalizedBase = baseUrl.replace(/\/$/, '')

  // Parse path and query
  const [pathname, queryString] = path.split('?')
  const normalizedPath = pathname.startsWith('/') ? pathname : '/' + pathname

  if (!queryString || removeQueryParams) {
    return `${normalizedBase}${normalizedPath}`
  }

  // Filter query parameters
  if (allowedParams.length > 0) {
    const params = new URLSearchParams(queryString)
    const filtered = new URLSearchParams()

    for (const key of allowedParams) {
      if (params.has(key)) {
        filtered.set(key, params.get(key))
      }
    }

    const filteredQuery = filtered.toString()
    return filteredQuery
      ? `${normalizedBase}${normalizedPath}?${filteredQuery}`
      : `${normalizedBase}${normalizedPath}`
  }

  return `${normalizedBase}${normalizedPath}?${queryString}`
}

/**
 * Generate Open Graph meta tags object.
 *
 * @param {Object} data - Open Graph data
 * @param {string} data.title - Title
 * @param {string} data.description - Description
 * @param {string} [data.type='website'] - Type
 * @param {string} [data.url] - URL
 * @param {string} [data.image] - Image URL
 * @param {string} [data.siteName] - Site name
 * @returns {Object} Open Graph meta tags
 *
 * @example
 * const og = generateOpenGraph({
 *   title: 'My Page',
 *   description: 'Page description',
 *   url: 'https://myapp.com/page',
 *   image: 'https://myapp.com/image.png',
 *   siteName: 'My App'
 * })
 *
 * // Returns:
 * // {
 * //   'og:title': 'My Page',
 * //   'og:description': 'Page description',
 * //   'og:type': 'website',
 * //   'og:url': 'https://myapp.com/page',
 * //   'og:image': 'https://myapp.com/image.png',
 * //   'og:site_name': 'My App'
 * // }
 */
export function generateOpenGraph(data) {
  const {
    title,
    description,
    type = 'website',
    url,
    image,
    siteName
  } = data

  const tags = {
    'og:title': title,
    'og:type': type
  }

  if (description) tags['og:description'] = description
  if (url) tags['og:url'] = url
  if (image) tags['og:image'] = image
  if (siteName) tags['og:site_name'] = siteName

  return tags
}

/**
 * Generate Twitter Card meta tags object.
 *
 * @param {Object} data - Twitter Card data
 * @param {string} data.title - Title
 * @param {string} data.description - Description
 * @param {string} [data.card='summary_large_image'] - Card type
 * @param {string} [data.image] - Image URL
 * @param {string} [data.site] - Twitter handle
 * @returns {Object} Twitter Card meta tags
 *
 * @example
 * const twitter = generateTwitterCard({
 *   title: 'My Page',
 *   description: 'Page description',
 *   image: 'https://myapp.com/image.png',
 *   site: '@myapp'
 * })
 */
export function generateTwitterCard(data) {
  const {
    title,
    description,
    card = 'summary_large_image',
    image,
    site
  } = data

  const tags = {
    'twitter:card': card,
    'twitter:title': title
  }

  if (description) tags['twitter:description'] = description
  if (image) tags['twitter:image'] = image
  if (site) tags['twitter:site'] = site

  return tags
}

/**
 * Validate sitemap entries.
 *
 * @param {SitemapEntry[]} entries - Sitemap entries
 * @returns {Object} Validation result
 * @returns {boolean} result.valid - Whether all entries are valid
 * @returns {string[]} result.errors - List of error messages
 */
export function validateSitemap(entries) {
  const errors = []

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]

    if (!entry.url) {
      errors.push(`Entry ${i}: Missing required 'url'`)
    }

    if (entry.priority !== undefined) {
      if (entry.priority < 0 || entry.priority > 1) {
        errors.push(`Entry ${i}: Priority must be between 0 and 1`)
      }
    }

    if (entry.changefreq) {
      const validFreqs = ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never']
      if (!validFreqs.includes(entry.changefreq)) {
        errors.push(`Entry ${i}: Invalid changefreq '${entry.changefreq}'`)
      }
    }

    if (entry.lastmod) {
      // Validate ISO 8601 date format
      const date = new Date(entry.lastmod)
      if (isNaN(date.getTime())) {
        errors.push(`Entry ${i}: Invalid lastmod date '${entry.lastmod}'`)
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Calculate sitemap priority based on URL depth.
 *
 * @param {string} url - URL path
 * @param {Object} options - Options
 * @param {number} [options.maxDepth=3] - Maximum depth for priority calculation
 * @returns {number} Priority (0.1 to 1.0)
 *
 * @example
 * getPriorityByDepth('/') // 1.0
 * getPriorityByDepth('/products') // 0.8
 * getPriorityByDepth('/products/electronics/phones') // 0.5
 */
export function getPriorityByDepth(url, options = {}) {
  const { maxDepth = 3 } = options

  const depth = url.split('/').filter(Boolean).length
  const priority = Math.max(0.1, 1 - (depth / maxDepth) * 0.3)

  return Math.round(priority * 10) / 10
}

/**
 * Generate sitemap index file.
 *
 * @param {Object[]} sitemaps - Sitemap references
 * @param {string} sitemaps[].loc - Sitemap URL
 * @param {string} [sitemaps[].lastmod] - Last modification date
 * @returns {string} Sitemap index XML
 *
 * @example
 * const index = generateSitemapIndex([
 *   { loc: 'https://myapp.com/sitemap-products.xml', lastmod: '2024-01-01' },
 *   { loc: 'https://myapp.com/sitemap-blog.xml' }
 * ])
 */
export function generateSitemapIndex(sitemaps) {
  const entries = sitemaps.map(sitemap => {
    let entry = `  <sitemap>\n    <loc>${escapeXml(sitemap.loc)}</loc>\n`
    if (sitemap.lastmod) {
      entry += `    <lastmod>${sitemap.lastmod}</lastmod>\n`
    }
    entry += '  </sitemap>'
    return entry
  })

  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</sitemapindex>`
}

/**
 * Escape special XML characters.
 *
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeXml(str) {
  return str
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#x27;')
}

/**
 * SEO namespace for convenient access.
 */
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
