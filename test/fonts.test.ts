import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearLoadedFonts,
  createFontFaceRule,
  generateFontDisplayStyle,
  getFontLoadStatus,
  injectFontFaceRules,
  isFontLoaded,
  preloadFont,
  removeFontPreload
} from '../modules/fonts.js'

describe('Fonts', () => {
  beforeEach(() => {
    clearLoadedFonts()
    const styleEl = document.getElementById('metaowl-font-faces')
    if (styleEl) styleEl.remove()
  })

  describe('generateFontDisplayStyle', () => {
    it('generates CSS string for swap', () => {
      const css = generateFontDisplayStyle('swap')

      expect(css).toBe('font-display: swap;')
    })

    it('generates CSS string for optional', () => {
      const css = generateFontDisplayStyle('optional')

      expect(css).toBe('font-display: optional;')
    })

    it('generates CSS string for block', () => {
      const css = generateFontDisplayStyle('block')

      expect(css).toBe('font-display: block;')
    })

    it('generates CSS string for fallback', () => {
      const css = generateFontDisplayStyle('fallback')

      expect(css).toBe('font-display: fallback;')
    })

    it('generates CSS string for auto', () => {
      const css = generateFontDisplayStyle('auto')

      expect(css).toBe('font-display: auto;')
    })
  })

  describe('createFontFaceRule', () => {
    it('creates valid CSS rule', () => {
      const rule = createFontFaceRule({
        family: 'TestFont',
        src: 'https://example.com/font.woff2'
      })

      expect(rule).toContain('@font-face')
      expect(rule).toContain('font-family: \'TestFont\'')
      expect(rule).toContain('url("https://example.com/font.woff2")')
      expect(rule).toContain('font-display: swap')
    })

    it('includes weight in rule', () => {
      const rule = createFontFaceRule({
        family: 'TestFont',
        src: 'https://example.com/font.woff2',
        weight: 'bold'
      })

      expect(rule).toContain('font-weight: bold')
    })

    it('includes unicode range when provided', () => {
      const rule = createFontFaceRule({
        family: 'TestFont',
        src: 'https://example.com/font.woff2',
        unicodeRange: 'U+0000-00FF'
      })

      expect(rule).toContain('unicode-range: U+0000-00FF')
    })

    it('creates rule with italic style', () => {
      const rule = createFontFaceRule({
        family: 'TestFont',
        src: 'https://example.com/font.woff2',
        style: 'italic'
      })

      expect(rule).toContain('font-style: italic')
    })
  })

  describe('injectFontFaceRules', () => {
    it('injects CSS rule into document', () => {
      injectFontFaceRules({
        family: 'TestFont',
        src: 'https://example.com/font.woff2'
      })

      const styleEl = document.getElementById('metaowl-font-faces')

      expect(styleEl).toBeTruthy()
      expect(styleEl?.textContent).toContain('@font-face')
    })

    it('appends to existing rules', () => {
      injectFontFaceRules({
        family: 'Font1',
        src: 'https://example.com/font1.woff2'
      })

      injectFontFaceRules({
        family: 'Font2',
        src: 'https://example.com/font2.woff2'
      })

      const styleEl = document.getElementById('metaowl-font-faces')

      expect(styleEl?.textContent).toContain('Font1')
      expect(styleEl?.textContent).toContain('Font2')
    })

    it('handles array of font options', () => {
      injectFontFaceRules([
        { family: 'FontA', src: 'https://example.com/fontA.woff2' },
        { family: 'FontB', src: 'https://example.com/fontB.woff2' }
      ])

      const styleEl = document.getElementById('metaowl-font-faces')

      expect(styleEl?.textContent).toContain('FontA')
      expect(styleEl?.textContent).toContain('FontB')
    })
  })

  describe('preloadFont', () => {
    it('creates preload link element', () => {
      preloadFont('TestFont', 'https://example.com/font.woff2')

      const link = document.getElementById('metaowl-font-preload-TestFont-normal')

      expect(link).toBeTruthy()
      expect(link?.getAttribute('rel')).toBe('preload')
      expect(link?.getAttribute('href')).toBe('https://example.com/font.woff2')
    })

    it('does not duplicate preload links', () => {
      preloadFont('TestFont', 'https://example.com/font.woff2')
      preloadFont('TestFont', 'https://example.com/font.woff2')

      const links = document.querySelectorAll('#metaowl-font-preload-TestFont-normal')

      expect(links).toHaveLength(1)
    })

    it('creates preload link with custom weight', () => {
      preloadFont('TestFont', 'https://example.com/font-bold.woff2', { weight: 'bold' })

      const link = document.getElementById('metaowl-font-preload-TestFont-bold')

      expect(link).toBeTruthy()
      expect(link?.getAttribute('href')).toBe('https://example.com/font-bold.woff2')
    })
  })

  describe('removeFontPreload', () => {
    it('removes preload link', () => {
      preloadFont('TestFont', 'https://example.com/font.woff2')

      removeFontPreload('TestFont')

      const link = document.getElementById('metaowl-font-preload-TestFont-normal')

      expect(link).toBeFalsy()
    })

    it('removes preload link with weight', () => {
      preloadFont('TestFont', 'https://example.com/font-bold.woff2', { weight: 'bold' })

      removeFontPreload('TestFont', 'bold')

      const link = document.getElementById('metaowl-font-preload-TestFont-bold')

      expect(link).toBeFalsy()
    })
  })

  describe('isFontLoaded', () => {
    it('returns false for unloaded font', () => {
      expect(isFontLoaded('NonExistentFont')).toBe(false)
    })

    it('returns false for unloaded font family', () => {
      expect(isFontLoaded('AnotherFont')).toBe(false)
    })
  })

  describe('getFontLoadStatus', () => {
    it('returns empty object when no fonts loaded', () => {
      const status = getFontLoadStatus()

      expect(Object.keys(status).length).toBe(0)
    })
  })

  describe('clearLoadedFonts', () => {
    it('clears all loaded fonts', () => {
      clearLoadedFonts()

      expect(isFontLoaded('TestFont')).toBe(false)
    })
  })
})
