import { describe, it, expect } from 'vitest'
import {
  generateSitemap,
  generateRobotsTxt,
  jsonLd,
  createCanonicalUrl,
  generateOpenGraph,
  generateTwitterCard,
  validateSitemap,
  getPriorityByDepth,
  generateSitemapIndex,
  SEO
} from '../modules/seo.js'

describe('SEO', () => {
  describe('Exports', () => {
    it('should export all functions', () => {
      expect(typeof generateSitemap).toBe('function')
      expect(typeof generateRobotsTxt).toBe('function')
      expect(typeof jsonLd).toBe('function')
      expect(typeof createCanonicalUrl).toBe('function')
      expect(typeof generateOpenGraph).toBe('function')
      expect(typeof generateTwitterCard).toBe('function')
      expect(typeof validateSitemap).toBe('function')
      expect(typeof getPriorityByDepth).toBe('function')
      expect(typeof generateSitemapIndex).toBe('function')
    })

    it('should export SEO namespace', () => {
      expect(SEO.generateSitemap).toBe(generateSitemap)
      expect(SEO.generateRobotsTxt).toBe(generateRobotsTxt)
      expect(SEO.jsonLd).toBe(jsonLd)
    })
  })

  describe('generateSitemap', () => {
    it('should generate basic sitemap', () => {
      const sitemap = generateSitemap([
        { url: '/', priority: 1.0 },
        { url: '/about', priority: 0.8 }
      ], { baseUrl: 'https://example.com' })

      expect(sitemap).toContain('<?xml version="1.0" encoding="UTF-8"?>')
      expect(sitemap).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"')
      expect(sitemap).toContain('<loc>https://example.com/</loc>')
      expect(sitemap).toContain('<loc>https://example.com/about</loc>')
      expect(sitemap).toContain('<priority>1.0</priority>')
    })

    it('should include changefreq when provided', () => {
      const sitemap = generateSitemap([
        { url: '/', changefreq: 'daily' }
      ], { baseUrl: 'https://example.com' })

      expect(sitemap).toContain('<changefreq>daily</changefreq>')
    })

    it('should include lastmod when provided', () => {
      const sitemap = generateSitemap([
        { url: '/', lastmod: '2024-01-15' }
      ], { baseUrl: 'https://example.com' })

      expect(sitemap).toContain('<lastmod>2024-01-15</lastmod>')
    })

    it('should handle absolute URLs', () => {
      const sitemap = generateSitemap([
        { url: 'https://other.com/page' }
      ], { baseUrl: 'https://example.com' })

      expect(sitemap).toContain('<loc>https://other.com/page</loc>')
    })

    it('should normalize baseUrl trailing slash', () => {
      const sitemap = generateSitemap(
        [{ url: '/page' }],
        { baseUrl: 'https://example.com/' }
      )

      expect(sitemap).toContain('<loc>https://example.com/page</loc>')
    })

    it('should throw without baseUrl', () => {
      expect(() => generateSitemap([{ url: '/' }])).toThrow('baseUrl is required')
    })

    it('should clamp priority between 0 and 1', () => {
      const sitemap = generateSitemap([
        { url: '/high', priority: 2.0 },
        { url: '/low', priority: -0.5 }
      ], { baseUrl: 'https://example.com' })

      expect(sitemap).toContain('<priority>1.0</priority>')
      expect(sitemap).toContain('<priority>0.0</priority>')
    })
  })

  describe('generateRobotsTxt', () => {
    it('should generate basic robots.txt', () => {
      const robots = generateRobotsTxt({
        userAgent: '*',
        allow: ['/'],
        disallow: ['/admin/', '/private/']
      })

      expect(robots).toContain('User-agent: *')
      expect(robots).toContain('Allow: /')
      expect(robots).toContain('Disallow: /admin/')
      expect(robots).toContain('Disallow: /private/')
    })

    it('should include sitemap when provided', () => {
      const robots = generateRobotsTxt({
        userAgent: '*',
        sitemap: 'https://example.com/sitemap.xml'
      })

      expect(robots).toContain('Sitemap: https://example.com/sitemap.xml')
    })

    it('should include host when provided', () => {
      const robots = generateRobotsTxt({
        userAgent: '*',
        host: 'https://example.com'
      })

      expect(robots).toContain('Host: https://example.com')
    })

    it('should handle crawl delay', () => {
      const robots = generateRobotsTxt({
        userAgent: '*',
        crawlDelay: 10
      })

      expect(robots).toContain('Crawl-delay: 10')
    })

    it('should generate multiple user-agent sections', () => {
      const robots = generateRobotsTxt([
        { userAgent: 'Googlebot', allow: ['/'] },
        { userAgent: 'Bingbot', allow: ['/'], disallow: ['/admin/'] }
      ])

      expect(robots).toContain('User-agent: Googlebot')
      expect(robots).toContain('User-agent: Bingbot')
    })
  })

  describe('jsonLd', () => {
    it('should generate JSON-LD with default context', () => {
      const schema = jsonLd({
        '@type': 'Organization',
        name: 'My Company'
      })

      const parsed = JSON.parse(schema)
      expect(parsed['@context']).toBe('https://schema.org')
      expect(parsed['@type']).toBe('Organization')
      expect(parsed.name).toBe('My Company')
    })

    it('should allow custom context', () => {
      const schema = jsonLd({
        '@context': 'https://custom.org',
        '@type': 'Product'
      })

      const parsed = JSON.parse(schema)
      expect(parsed['@context']).toBe('https://custom.org')
    })

    it('should format JSON with indentation', () => {
      const schema = jsonLd({ '@type': 'Thing' })
      expect(schema).toContain('\n')
      expect(schema).toContain('  ')
    })
  })

  describe('createCanonicalUrl', () => {
    it('should create canonical URL', () => {
      const url = createCanonicalUrl('https://example.com', '/page')
      expect(url).toBe('https://example.com/page')
    })

    it('should preserve query parameters', () => {
      const url = createCanonicalUrl('https://example.com', '/page?id=123')
      expect(url).toBe('https://example.com/page?id=123')
    })

    it('should remove query parameters when specified', () => {
      const url = createCanonicalUrl(
        'https://example.com',
        '/page?id=123',
        { removeQueryParams: true }
      )
      expect(url).toBe('https://example.com/page')
    })

    it('should filter allowed query parameters', () => {
      const url = createCanonicalUrl(
        'https://example.com',
        '/page?id=123&utm_source=email',
        { allowedParams: ['id'] }
      )
      expect(url).toBe('https://example.com/page?id=123')
    })

    it('should normalize base URL slash', () => {
      const url = createCanonicalUrl('https://example.com/', '/page')
      expect(url).toBe('https://example.com/page')
    })
  })

  describe('generateOpenGraph', () => {
    it('should generate Open Graph tags', () => {
      const tags = generateOpenGraph({
        title: 'My Page',
        description: 'Description',
        url: 'https://example.com/page',
        image: 'https://example.com/image.png'
      })

      expect(tags['og:title']).toBe('My Page')
      expect(tags['og:description']).toBe('Description')
      expect(tags['og:type']).toBe('website')
      expect(tags['og:url']).toBe('https://example.com/page')
      expect(tags['og:image']).toBe('https://example.com/image.png')
    })

    it('should use custom type', () => {
      const tags = generateOpenGraph({
        title: 'Article',
        type: 'article'
      })

      expect(tags['og:type']).toBe('article')
    })

    it('should include site_name when provided', () => {
      const tags = generateOpenGraph({
        title: 'Page',
        siteName: 'My Site'
      })

      expect(tags['og:site_name']).toBe('My Site')
    })
  })

  describe('generateTwitterCard', () => {
    it('should generate Twitter Card tags', () => {
      const tags = generateTwitterCard({
        title: 'My Page',
        description: 'Description',
        image: 'https://example.com/image.png'
      })

      expect(tags['twitter:card']).toBe('summary_large_image')
      expect(tags['twitter:title']).toBe('My Page')
      expect(tags['twitter:description']).toBe('Description')
      expect(tags['twitter:image']).toBe('https://example.com/image.png')
    })

    it('should use custom card type', () => {
      const tags = generateTwitterCard({
        title: 'Page',
        card: 'summary'
      })

      expect(tags['twitter:card']).toBe('summary')
    })

    it('should include site handle when provided', () => {
      const tags = generateTwitterCard({
        title: 'Page',
        site: '@myhandle'
      })

      expect(tags['twitter:site']).toBe('@myhandle')
    })
  })

  describe('validateSitemap', () => {
    it('should validate correct entries', () => {
      const result = validateSitemap([
        { url: '/', priority: 0.5, changefreq: 'daily' }
      ])

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect missing url', () => {
      const result = validateSitemap([{ priority: 0.5 }])

      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('Missing required')
    })

    it('should detect invalid priority', () => {
      const result = validateSitemap([{ url: '/', priority: 2.0 }])

      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('Priority must be between')
    })

    it('should detect invalid changefreq', () => {
      const result = validateSitemap([{ url: '/', changefreq: 'invalid' }])

      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('Invalid changefreq')
    })

    it('should detect invalid lastmod', () => {
      const result = validateSitemap([{ url: '/', lastmod: 'not-a-date' }])

      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('Invalid lastmod')
    })
  })

  describe('getPriorityByDepth', () => {
    it('should return 1.0 for root', () => {
      expect(getPriorityByDepth('/')).toBe(1.0)
    })

    it('should decrease priority by depth', () => {
      expect(getPriorityByDepth('/products')).toBeGreaterThan(
        getPriorityByDepth('/products/electronics/phones')
      )
    })

    it('should respect maxDepth option', () => {
      const priority = getPriorityByDepth('/a/b/c/d', { maxDepth: 5 })
      expect(priority).toBeGreaterThanOrEqual(0.1)
    })
  })

  describe('generateSitemapIndex', () => {
    it('should generate sitemap index', () => {
      const index = generateSitemapIndex([
        { loc: 'https://example.com/sitemap1.xml', lastmod: '2024-01-01' },
        { loc: 'https://example.com/sitemap2.xml' }
      ])

      expect(index).toContain('<?xml version="1.0" encoding="UTF-8"?>')
      expect(index).toContain('<sitemapindex')
      expect(index).toContain('<loc>https://example.com/sitemap1.xml</loc>')
      expect(index).toContain('<lastmod>2024-01-01</lastmod>')
      expect(index).toContain('<loc>https://example.com/sitemap2.xml</loc>')
    })
  })
})
