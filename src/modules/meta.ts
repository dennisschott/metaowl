/**
 * @module Meta
 *
 * Programmatic helpers for managing document meta tags at runtime.
 *
 * Each function is idempotent: the relevant `<meta>` or `<link>` element is
 * created on first call if it does not already exist, then its content is
 * updated on every subsequent call as well.
 *
 * Import the entire namespace via:
 *   import { Meta } from 'metaowl'
 *   Meta.title('My Page')
 */

function _nameMeta(name: string, value: string | undefined | null): void {
  if (!value) return
  let el = document.querySelector(`meta[name="${name}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute('name', name)
    document.head.appendChild(el)
  }
  el.setAttribute('content', value)
}

function _propMeta(property: string, value: string | undefined | null): void {
  if (!value) return
  let el = document.querySelector(`meta[property="${property}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute('property', property)
    document.head.appendChild(el)
  }
  el.setAttribute('content', value)
}

/** Set the document `<title>`. */
export function title(titleText: string | undefined | null): void {
  if (!titleText) return
  document.title = titleText
}

/** Set the document description meta tag. */
export function description(descriptionText: string | undefined | null): void { 
  _nameMeta('description', descriptionText) 
}

/** Set the document keywords meta tag. */
export function keywords(keywordsText: string | undefined | null): void { 
  _nameMeta('keywords', keywordsText) 
}

/** Set the document author meta tag. */
export function author(authorText: string | undefined | null): void { 
  _nameMeta('author', authorText) 
}

/** Set the canonical link tag. */
export function canonical(url: string | undefined | null): void {
  if (!url) return
  let el = document.querySelector('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  ;(el as HTMLLinkElement).href = url
}

/** Set the Open Graph title. */
export function ogTitle(title: string | undefined | null): void { 
  _propMeta('og:title', title) 
}

/** Set the Open Graph description. */
export function ogDescription(description: string | undefined | null): void { 
  _propMeta('og:description', description) 
}

/** Set the Open Graph image. */
export function ogImage(image: string | undefined | null): void { 
  _propMeta('og:image', image) 
}

/** Set the Open Graph URL. */
export function ogUrl(url: string | undefined | null): void { 
  _propMeta('og:url', url) 
}

/** Set the Open Graph type. */
export function ogType(type: string | undefined | null): void { 
  _propMeta('og:type', type) 
}

/** Set the Open Graph site name. */
export function ogSiteName(siteName: string | undefined | null): void { 
  _propMeta('og:site_name', siteName) 
}

/** Set the Open Graph image width. */
export function ogImageWidth(width: string | number | undefined | null): void { 
  _propMeta('og:image:width', String(width)) 
}

/** Set the Open Graph image height. */
export function ogImageHeight(height: string | number | undefined | null): void { 
  _propMeta('og:image:height', String(height)) 
}

/** Set the Twitter Card type. */
export function twitterCard(card: string | undefined | null): void { 
  _nameMeta('twitter:card', card) 
}

/** Set the Twitter site. */
export function twitterSite(site: string | undefined | null): void { 
  _nameMeta('twitter:site', site) 
}

/** Set the Twitter creator. */
export function twitterCreator(creator: string | undefined | null): void { 
  _nameMeta('twitter:creator', creator) 
}

/** Set the Twitter title. */
export function twitterTitle(title: string | undefined | null): void { 
  _nameMeta('twitter:title', title) 
}

/** Set the Twitter description. */
export function twitterDescription(description: string | undefined | null): void { 
  _nameMeta('twitter:description', description) 
}

/** Set the Twitter image. */
export function twitterImage(image: string | undefined | null): void { 
  _nameMeta('twitter:image', image) 
}

/** Set the Twitter image alt text. */
export function twitterImageAlt(alt: string | undefined | null): void { 
  _nameMeta('twitter:image:alt', alt) 
}
