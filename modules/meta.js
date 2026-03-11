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

function _nameMeta(name, value) {
  if (!value) return
  let el = document.querySelector(`meta[name="${name}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.name = name
    document.head.appendChild(el)
  }
  el.content = value
}

function _propMeta(property, value) {
  if (!value) return
  let el = document.querySelector(`meta[property="${property}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute('property', property)
    document.head.appendChild(el)
  }
  el.content = value
}

/** Set the document `<title>`. @param {string} title */
export function title(title) {
  if (!title) return
  document.title = title
}

/** @param {string} description */
export function description(description) { _nameMeta('description', description) }

/** @param {string} keywords */
export function keywords(keywords) { _nameMeta('keywords', keywords) }

/** @param {string} author */
export function author(author) { _nameMeta('author', author) }

/** @param {string} url */
export function canonical(url) {
  if (!url) return
  let el = document.querySelector('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.rel = 'canonical'
    document.head.appendChild(el)
  }
  el.href = url
}

/** @param {string} title */
export function ogTitle(title) { _propMeta('og:title', title) }

/** @param {string} description */
export function ogDescription(description) { _propMeta('og:description', description) }

/** @param {string} image */
export function ogImage(image) { _propMeta('og:image', image) }

/** @param {string} url */
export function ogUrl(url) { _propMeta('og:url', url) }

/** @param {string} type */
export function ogType(type) { _propMeta('og:type', type) }

/** @param {string} siteName */
export function ogSiteName(siteName) { _propMeta('og:site_name', siteName) }

/** @param {string} locale */
export function ogLocale(locale) { _propMeta('og:locale', locale) }

/** @param {string|number} width */
export function ogImageWidth(width) { _propMeta('og:image:width', width) }

/** @param {string|number} height */
export function ogImageHeight(height) { _propMeta('og:image:height', height) }

/** @param {string} card */
export function twitterCard(card) { _nameMeta('twitter:card', card) }

/** @param {string} site */
export function twitterSite(site) { _nameMeta('twitter:site', site) }

/** @param {string} creator */
export function twitterCreator(creator) { _nameMeta('twitter:creator', creator) }

/** @param {string} title */
export function twitterTitle(title) { _nameMeta('twitter:title', title) }

/** @param {string} description */
export function twitterDescription(description) { _nameMeta('twitter:description', description) }

/** @param {string} image */
export function twitterImage(image) { _nameMeta('twitter:image', image) }

/** @param {string} alt */
export function twitterImageAlt(alt) { _nameMeta('twitter:image:alt', alt) }

/** @param {string} url */
export function twitterUrl(url) { _nameMeta('twitter:url', url) }

/** @param {string} siteId */
export function twitterSiteId(siteId) { _nameMeta('twitter:site:id', siteId) }

/** @param {string} creatorId */
export function twitterCreatorId(creatorId) { _nameMeta('twitter:creator:id', creatorId) }