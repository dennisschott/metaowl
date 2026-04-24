import { beforeEach, describe, expect, it } from 'vitest'
import { JSDOM } from 'jsdom'
import * as Meta from '../modules/meta.js'

let dom: JSDOM

function queryMetaContent(selector: string): string | undefined {
  return document.querySelector<HTMLMetaElement>(selector)?.content
}

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
    const element = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    expect(element).not.toBeNull()
    expect(element?.content).toBe('A test page')
  })

  it('updates description content on second call', () => {
    Meta.description('First')
    Meta.description('Second')
    const elements = document.querySelectorAll<HTMLMetaElement>('meta[name="description"]')
    expect(elements).toHaveLength(1)
    expect(elements[0]?.content).toBe('Second')
  })

  it('creates meta[name="keywords"]', () => {
    Meta.keywords('owl, odoo')
    expect(queryMetaContent('meta[name="keywords"]')).toBe('owl, odoo')
  })

  it('creates meta[name="author"]', () => {
    Meta.author('Dennis')
    expect(queryMetaContent('meta[name="author"]')).toBe('Dennis')
  })

  it('does nothing for falsy value', () => {
    Meta.description(null)
    expect(document.querySelector('meta[name="description"]')).toBeNull()
  })
})

describe('Meta.canonical', () => {
  it('creates a link[rel="canonical"]', () => {
    Meta.canonical('https://example.com/page')
    const element = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    expect(element).not.toBeNull()
    expect(element?.href).toBe('https://example.com/page')
  })

  it('updates href on second call without duplicating', () => {
    Meta.canonical('https://example.com/a')
    Meta.canonical('https://example.com/b')
    const elements = document.querySelectorAll<HTMLLinkElement>('link[rel="canonical"]')
    expect(elements).toHaveLength(1)
    expect(elements[0]?.href).toBe('https://example.com/b')
  })
})

describe('Meta Open Graph tags', () => {
  it('creates og:title', () => {
    Meta.ogTitle('OG Title')
    expect(queryMetaContent('meta[property="og:title"]')).toBe('OG Title')
  })

  it('updates og:title on second call without duplicating', () => {
    Meta.ogTitle('First')
    Meta.ogTitle('Second')
    expect(document.querySelectorAll('meta[property="og:title"]')).toHaveLength(1)
    expect(queryMetaContent('meta[property="og:title"]')).toBe('Second')
  })

  it('creates og:description', () => {
    Meta.ogDescription('Desc')
    expect(queryMetaContent('meta[property="og:description"]')).toBe('Desc')
  })

  it('creates og:image', () => {
    Meta.ogImage('https://example.com/img.png')
    expect(queryMetaContent('meta[property="og:image"]')).toBe('https://example.com/img.png')
  })

  it('creates og:url', () => {
    Meta.ogUrl('https://example.com')
    expect(queryMetaContent('meta[property="og:url"]')).toBe('https://example.com')
  })

  it('creates og:type', () => {
    Meta.ogType('website')
    expect(queryMetaContent('meta[property="og:type"]')).toBe('website')
  })

  it('creates og:site_name', () => {
    Meta.ogSiteName('My Site')
    expect(queryMetaContent('meta[property="og:site_name"]')).toBe('My Site')
  })
})

describe('Meta Twitter Card tags', () => {
  it('creates twitter:card', () => {
    Meta.twitterCard('summary_large_image')
    expect(queryMetaContent('meta[name="twitter:card"]')).toBe('summary_large_image')
  })

  it('creates twitter:title', () => {
    Meta.twitterTitle('TW Title')
    expect(queryMetaContent('meta[name="twitter:title"]')).toBe('TW Title')
  })

  it('creates twitter:description', () => {
    Meta.twitterDescription('TW Desc')
    expect(queryMetaContent('meta[name="twitter:description"]')).toBe('TW Desc')
  })

  it('creates twitter:image', () => {
    Meta.twitterImage('https://example.com/tw.png')
    expect(queryMetaContent('meta[name="twitter:image"]')).toBe('https://example.com/tw.png')
  })

  it('updates twitter:card on second call without duplicating', () => {
    Meta.twitterCard('summary')
    Meta.twitterCard('summary_large_image')
    expect(document.querySelectorAll('meta[name="twitter:card"]')).toHaveLength(1)
    expect(queryMetaContent('meta[name="twitter:card"]')).toBe('summary_large_image')
  })
})