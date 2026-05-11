/**
 * @module Fonts
 *
 * Font optimization utilities for metaowl applications.
 * Provides font loading strategies, font face declarations, and font display optimization.
 */

export type FontDisplay = 'auto' | 'block' | 'swap' | 'fallback' | 'optional'
export type FontWeight = 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900'

export interface FontFaceOptions {
  family: string
  src: string | string[]
  weight?: FontWeight | FontWeight[]
  style?: 'normal' | 'italic' | 'oblique'
  display?: FontDisplay
  unicodeRange?: string
  preload?: boolean
  subset?: string
  variant?: string
}

export interface FontMetrics {
  family: string
  ascent: number
  descent: number
  lineGap: number
  unitsPerEm: number
}

const loadedFonts = new Map<string, Set<string>>()
const fontPreloadLinks = new Map<string, HTMLLinkElement>()

export function defineFontFace(options: FontFaceOptions): FontFace {
  const {
    family,
    src,
    weight = 'normal',
    style = 'normal',
    display = 'swap',
    unicodeRange
  } = options

  const srcString = Array.isArray(src) ? src.map((s) => `url("${s}")`).join(', ') : `url("${src}")`
  const weightStr = Array.isArray(weight) ? weight.join(' ') : weight

  const descriptors: FontFaceDescriptors = {
    weight: weightStr as FontFaceDescriptors['weight'],
    style,
    display,
    unicodeRange: unicodeRange || 'U+0-FFFF'
  }

  const fontFace = new FontFace(`${family}-${weightStr}`, srcString, descriptors)

  return fontFace
}

export async function loadFont(options: FontFaceOptions): Promise<FontFace> {
  const { family, weight = 'normal' } = options
  const key = `${family}-${weight}`

  if (!loadedFonts.has(family)) {
    loadedFonts.set(family, new Set())
  }

  const fontFace = defineFontFace(options)

  try {
    await fontFace.load()
    document.fonts.add(fontFace)

    const familySet = loadedFonts.get(family)!
    familySet.add(key as string)

    return fontFace
  } catch (error) {
    console.warn(`[metaowl] Failed to load font ${family}:`, error)
    throw error
  }
}

export async function loadFontFamily(
  family: string,
  variants: FontFaceOptions[]
): Promise<FontFace[]> {
  return Promise.all(
    variants.map((variant) => loadFont({ ...variant, family }))
  )
}

export function isFontLoaded(family: string, weight?: string): boolean {
  if (!loadedFonts.has(family)) {
    return false
  }

  if (weight) {
    return loadedFonts.get(family)!.has(`${family}-${weight}`)
  }

  return loadedFonts.get(family)!.size > 0
}

export function preloadFont(
  family: string,
  src: string,
  options: { weight?: string; as?: string; type?: string } = {}
): void {
  const { weight, as = 'font', type = 'font/woff2' } = options

  const linkId = `metaowl-font-preload-${family}-${weight || 'normal'}`
  if (document.getElementById(linkId)) {
    return
  }

  const link = document.createElement('link')
  link.id = linkId
  link.rel = 'preload'
  link.as = as
  link.href = src
  link.crossOrigin = 'anonymous'

  if (type) {
    link.type = type
  }

  document.head.appendChild(link)
  fontPreloadLinks.set(linkId, link)
}

export function removeFontPreload(family: string, weight?: string): void {
  const linkId = `metaowl-font-preload-${family}-${weight || 'normal'}`
  const link = fontPreloadLinks.get(linkId)

  if (link) {
    link.remove()
    fontPreloadLinks.delete(linkId)
  }
}

export function generateFontDisplayStyle(display: FontDisplay): string {
  return `font-display: ${display};`
}

export function createFontFaceRule(options: FontFaceOptions): string {
  const {
    family,
    src,
    weight = 'normal',
    style = 'normal',
    display = 'swap',
    unicodeRange
  } = options

  const srcString = Array.isArray(src) ? src.map((s) => `url("${s}")`).join(', ') : `url("${src}")`
  const weightStr = Array.isArray(weight) ? weight.join(' ') : weight

  let rule = '@font-face {\n'
  rule += `  font-family: '${family}';\n`
  rule += `  src: ${srcString};\n`
  rule += `  font-weight: ${weightStr};\n`
  rule += `  font-style: ${style};\n`
  rule += `  font-display: ${display};\n`

  if (unicodeRange) {
    rule += `  unicode-range: ${unicodeRange};\n`
  }

  rule += '}'

  return rule
}

export function injectFontFaceRules(options: FontFaceOptions | FontFaceOptions[]): void {
  const rules = Array.isArray(options) ? options : [options]
  const styleId = 'metaowl-font-faces'

  let styleEl = document.getElementById(styleId) as HTMLStyleElement | null
  if (!styleEl) {
    styleEl = document.createElement('style')
    styleEl.id = styleId
    document.head.appendChild(styleEl)
  }

  const cssText = rules.map(createFontFaceRule).join('\n\n')
  styleEl.textContent += cssText
}

export function measureTextWidth(
  text: string,
  font: string,
  size: number | string = 16
): number {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    const numericSize = typeof size === 'string' ? parseInt(size, 10) : size
    return text.length * numericSize * 0.5
  }

  const fontString = typeof size === 'number' ? `${size}px ${font}` : `${size} ${font}`
  ctx.font = fontString
  return ctx.measureText(text).width
}

export function estimateFontMetrics(el: HTMLElement): FontMetrics | null {
  const style = window.getComputedStyle(el)
  const family = style.fontFamily

  const fontMetricsMap: Record<string, FontMetrics> = {
    'Arial': { family: 'Arial', ascent: 0.8, descent: 0.2, lineGap: 0, unitsPerEm: 2048 },
    'Helvetica': { family: 'Helvetica', ascent: 0.8, descent: 0.2, lineGap: 0, unitsPerEm: 2048 },
    'Times New Roman': { family: 'Times New Roman', ascent: 0.8, descent: 0.2, lineGap: 0, unitsPerEm: 2048 },
    'Georgia': { family: 'Georgia', ascent: 0.8, descent: 0.2, lineGap: 0, unitsPerEm: 2048 },
    'system-ui': { family: 'system-ui', ascent: 0.8, descent: 0.2, lineGap: 0, unitsPerEm: 2048 }
  }

  return fontMetricsMap[family] || null
}

export function adjustFontForFout(
  el: HTMLElement,
  _fallbackFont: string = 'sans-serif',
  timeout: number = 3000
): Promise<void> {
  return new Promise((resolve) => {
    el.style.setProperty('font-display', 'block')

    const timer = setTimeout(() => {
      el.classList.add('metaowl-font-fout')
      resolve()
    }, timeout)

    document.fonts.ready.then(() => {
      clearTimeout(timer)
      el.classList.add('metaowl-font-loaded')
      resolve()
    })
  })
}

export function getFontLoadStatus(): Record<string, boolean> {
  const status: Record<string, boolean> = {}

  for (const [family, weights] of loadedFonts.entries()) {
    status[family] = weights.size > 0
  }

  return status
}

export function clearLoadedFonts(): void {
  loadedFonts.clear()
}

export const Fonts = {
  defineFontFace,
  loadFont,
  loadFontFamily,
  isFontLoaded,
  preloadFont,
  removeFontPreload,
  generateFontDisplayStyle,
  createFontFaceRule,
  injectFontFaceRules,
  measureTextWidth,
  estimateFontMetrics,
  adjustFontForFout,
  getFontLoadStatus,
  clearLoadedFonts
}
