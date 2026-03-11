import { describe, it, expect, beforeEach } from 'vitest'
import { JSDOM } from 'jsdom'
import * as Meta from '../src/modules/meta.js'

let dom: JSDOM

beforeEach(() => {
  dom = new JSDOM('<!doctype html><html><head></head><body></body></html>')
  globalThis.document = dom.window.document
})

describe('Meta.title', () => {
  it('sets document.title', () => {
    Meta.title('My Page')
    expect(document.title).toBe('My Page')
  })

  it('updates title on second call', () => {
    Meta.title('First')
    Meta.title('Second')
    expect(document.title).toBe('Second')
  })

  it('does nothing when called with empty string', () => {
    document.title = 'Original'
    Meta.title('')
    expect(document.title).toBe('Original')
  })
})

describe('Meta name-based tags (description, keywords, author)', () => {
  it('creates a meta[name="description"] tag', () => {
    Meta.description('A test page')
    const el = document.querySelector('meta[name="description"]')
    expect(el).not.toBeNull()
    expect(el?.getAttribute('content')).toBe('A test page')
  })

  it('updates description content on second call', () => {
    Meta.description('First')
    Meta.description('Second')
    const els = document.querySelectorAll('meta[name="description"]')
    expect(els).toHaveLength(1)
    expect(els[0].getAttribute('content')).toBe('Second')
  })

  it('creates meta[name="keywords"]', () => {
    Meta.keywords('owl, odoo')
    expect(document.querySelector('meta[name="keywords"]')?.getAttribute('content')).toBe('owl, odoo')
  })

  it('creates meta[name="author"]', () => {
    Meta.author('Dennis')
    expect(document.querySelector('meta[name="author"]')?.getAttribute('content')).toBe('Dennis')
  })

  it('does nothing for falsy value', () => {
    Meta.description(null as unknown as string)
    expect(document.querySelector('meta[name="description"]')).toBeNull()
  })
})

describe('Meta.canonical', () => {
  it('creates a link[rel="canonical"]', () => {
    Meta.canonical('https://example.com/page')
    const el = document.querySelector('link[rel="canonical"]')
    expect(el).not.toBeNull()
    expect((el as HTMLLinkElement)?.href).toBe('https://example.com/page')
  })

  it('updates href on second call without duplicating', () => {
    Meta.canonical('https://example.com/a')
    Meta.canonical('https://example.com/b')
    const els = document.querySelectorAll('link[rel="canonical"]')
    expect(els).toHaveLength(1)
    expect((els[0] as HTMLLinkElement).href).toBe('https://example.com/b')
  })
})

describe('Meta Open Graph tags', () => {
  it('creates og:title', () => {
    Meta.ogTitle('OG Title')
    expect(document.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe('OG Title')
  })

  it('updates og:title on second call without duplicating', () => {
    Meta.ogTitle('First')
    Meta.ogTitle('Second')
    expect(document.querySelectorAll('meta[property="og:title"]')).toHaveLength(1)
    expect(document.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe('Second')
  })

  it('creates og:description', () => {
    Meta.ogDescription('Desc')
    expect(document.querySelector('meta[property="og:description"]')?.getAttribute('content')).toBe('Desc')
  })

  it('creates og:image', () => {
    Meta.ogImage('https://example.com/img.png')
    expect(document.querySelector('meta[property="og:image"]')?.getAttribute('content')).toBe('https://example.com/img.png')
  })

  it('creates og:url', () => {
    Meta.ogUrl('https://example.com')
    expect(document.querySelector('meta[property="og:url"]')?.getAttribute('content')).toBe('https://example.com')
  })

  it('creates og:type', () => {
    Meta.ogType('website')
    expect(document.querySelector('meta[property="og:type"]')?.getAttribute('content')).toBe('website')
  })

  it('creates og:site_name', () => {
    Meta.ogSiteName('My Site')
    expect(document.querySelector('meta[property="og:site_name"]')?.getAttribute('content')).toBe('My Site')
  })
})

describe('Meta Twitter Card tags', () => {
  it('creates twitter:card', () => {
    Meta.twitterCard('summary_large_image')
    expect(document.querySelector('meta[name="twitter:card"]')?.getAttribute('content')).toBe('summary_large_image')
  })

  it('creates twitter:title', () => {
    Meta.twitterTitle('TW Title')
    expect(document.querySelector('meta[name="twitter:title"]')?.getAttribute('content')).toBe('TW Title')
  })

  it('creates twitter:description', () => {
    Meta.twitterDescription('TW Desc')
    expect(document.querySelector('meta[name="twitter:description"]')?.getAttribute('content')).toBe('TW Desc')
  })

  it('creates twitter:image', () => {
    Meta.twitterImage('https://example.com/tw.png')
    expect(document.querySelector('meta[name="twitter:image"]')?.getAttribute('content')).toBe('https://example.com/tw.png')
  })

  it('creates twitter:image:alt', () => {
    Meta.twitterImageAlt('Alt text')
    expect(document.querySelector('meta[name="twitter:image:alt"]')?.getAttribute('content')).toBe('Alt text')
  })
})
