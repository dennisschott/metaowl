import { describe, it, expect, beforeEach } from 'vitest'
import { JSDOM } from 'jsdom'
import * as Meta from '../modules/meta.js'

let dom

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
    expect(el.content).toBe('A test page')
  })

  it('updates description content on second call', () => {
    Meta.description('First')
    Meta.description('Second')
    const els = document.querySelectorAll('meta[name="description"]')
    expect(els).toHaveLength(1)
    expect(els[0].content).toBe('Second')
  })

  it('creates meta[name="keywords"]', () => {
    Meta.keywords('owl, odoo')
    expect(document.querySelector('meta[name="keywords"]').content).toBe('owl, odoo')
  })

  it('creates meta[name="author"]', () => {
    Meta.author('Dennis')
    expect(document.querySelector('meta[name="author"]').content).toBe('Dennis')
  })

  it('does nothing for falsy value', () => {
    Meta.description(null)
    expect(document.querySelector('meta[name="description"]')).toBeNull()
  })
})

describe('Meta.canonical', () => {
  it('creates a link[rel="canonical"]', () => {
    Meta.canonical('https://example.com/page')
    const el = document.querySelector('link[rel="canonical"]')
    expect(el).not.toBeNull()
    expect(el.href).toBe('https://example.com/page')
  })

  it('updates href on second call without duplicating', () => {
    Meta.canonical('https://example.com/a')
    Meta.canonical('https://example.com/b')
    const els = document.querySelectorAll('link[rel="canonical"]')
    expect(els).toHaveLength(1)
    expect(els[0].href).toBe('https://example.com/b')
  })
})

describe('Meta Open Graph tags', () => {
  it('creates og:title', () => {
    Meta.ogTitle('OG Title')
    expect(document.querySelector('meta[property="og:title"]').content).toBe('OG Title')
  })

  it('updates og:title on second call without duplicating', () => {
    Meta.ogTitle('First')
    Meta.ogTitle('Second')
    expect(document.querySelectorAll('meta[property="og:title"]')).toHaveLength(1)
    expect(document.querySelector('meta[property="og:title"]').content).toBe('Second')
  })

  it('creates og:description', () => {
    Meta.ogDescription('Desc')
    expect(document.querySelector('meta[property="og:description"]').content).toBe('Desc')
  })

  it('creates og:image', () => {
    Meta.ogImage('https://example.com/img.png')
    expect(document.querySelector('meta[property="og:image"]').content).toBe('https://example.com/img.png')
  })

  it('creates og:url', () => {
    Meta.ogUrl('https://example.com')
    expect(document.querySelector('meta[property="og:url"]').content).toBe('https://example.com')
  })

  it('creates og:type', () => {
    Meta.ogType('website')
    expect(document.querySelector('meta[property="og:type"]').content).toBe('website')
  })

  it('creates og:site_name', () => {
    Meta.ogSiteName('My Site')
    expect(document.querySelector('meta[property="og:site_name"]').content).toBe('My Site')
  })
})

describe('Meta Twitter Card tags', () => {
  it('creates twitter:card', () => {
    Meta.twitterCard('summary_large_image')
    expect(document.querySelector('meta[name="twitter:card"]').content).toBe('summary_large_image')
  })

  it('creates twitter:title', () => {
    Meta.twitterTitle('TW Title')
    expect(document.querySelector('meta[name="twitter:title"]').content).toBe('TW Title')
  })

  it('creates twitter:description', () => {
    Meta.twitterDescription('TW Desc')
    expect(document.querySelector('meta[name="twitter:description"]').content).toBe('TW Desc')
  })

  it('creates twitter:image', () => {
    Meta.twitterImage('https://example.com/tw.png')
    expect(document.querySelector('meta[name="twitter:image"]').content).toBe('https://example.com/tw.png')
  })

  it('updates twitter:card on second call without duplicating', () => {
    Meta.twitterCard('summary')
    Meta.twitterCard('summary_large_image')
    expect(document.querySelectorAll('meta[name="twitter:card"]')).toHaveLength(1)
    expect(document.querySelector('meta[name="twitter:card"]').content).toBe('summary_large_image')
  })
})
