/**
 * @module Meta
 *
 * Programmatic helpers for managing document meta tags at runtime.
 *
 * Each function is idempotent: the relevant <meta> or <link> element is
 * created on first call if it does not already exist, then its content is
 * updated on every subsequent call as well.
 *
 * Import the entire namespace via:
 *   import { Meta } from 'metaowl'
 *   Meta.title('My Page')
 */

function nameMeta(name: string, value: string | number | null | undefined): void {
  if (!value) return

  let element = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.name = name
    document.head.appendChild(element)
  }

  element.content = String(value)
}

function propertyMeta(property: string, value: string | number | null | undefined): void {
  if (!value) return

  let element = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute('property', property)
    document.head.appendChild(element)
  }

  element.content = String(value)
}

export function title(value: string | null | undefined): void {
  if (!value) return
  document.title = value
}

export function description(value: string | null | undefined): void {
  nameMeta('description', value)
}

export function keywords(value: string | null | undefined): void {
  nameMeta('keywords', value)
}

export function author(value: string | null | undefined): void {
  nameMeta('author', value)
}

export function canonical(value: string | null | undefined): void {
  if (!value) return

  let element = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!element) {
    element = document.createElement('link')
    element.rel = 'canonical'
    document.head.appendChild(element)
  }

  element.href = value
}

export function ogTitle(value: string | null | undefined): void {
  propertyMeta('og:title', value)
}

export function ogDescription(value: string | null | undefined): void {
  propertyMeta('og:description', value)
}

export function ogImage(value: string | null | undefined): void {
  propertyMeta('og:image', value)
}

export function ogUrl(value: string | null | undefined): void {
  propertyMeta('og:url', value)
}

export function ogType(value: string | null | undefined): void {
  propertyMeta('og:type', value)
}

export function ogSiteName(value: string | null | undefined): void {
  propertyMeta('og:site_name', value)
}

export function ogLocale(value: string | null | undefined): void {
  propertyMeta('og:locale', value)
}

export function ogImageWidth(value: string | number | null | undefined): void {
  propertyMeta('og:image:width', value)
}

export function ogImageHeight(value: string | number | null | undefined): void {
  propertyMeta('og:image:height', value)
}

export function twitterCard(value: string | null | undefined): void {
  nameMeta('twitter:card', value)
}

export function twitterSite(value: string | null | undefined): void {
  nameMeta('twitter:site', value)
}

export function twitterCreator(value: string | null | undefined): void {
  nameMeta('twitter:creator', value)
}

export function twitterTitle(value: string | null | undefined): void {
  nameMeta('twitter:title', value)
}

export function twitterDescription(value: string | null | undefined): void {
  nameMeta('twitter:description', value)
}

export function twitterImage(value: string | null | undefined): void {
  nameMeta('twitter:image', value)
}

export function twitterImageAlt(value: string | null | undefined): void {
  nameMeta('twitter:image:alt', value)
}

export function twitterUrl(value: string | null | undefined): void {
  nameMeta('twitter:url', value)
}

export function twitterSiteId(value: string | null | undefined): void {
  nameMeta('twitter:site:id', value)
}

export function twitterCreatorId(value: string | null | undefined): void {
  nameMeta('twitter:creator:id', value)
}