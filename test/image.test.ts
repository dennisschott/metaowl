import { describe, expect, it } from 'vitest'
import {
  calculateAspectRatio,
  createResponsiveImage,
  generateSizesAttribute,
  generateSrcSet,
  isImageLoaded,
  swapImageSource
} from '../modules/image.js'

describe('Image', () => {
  describe('generateSrcSet', () => {
    it('generates srcset string with default widths', () => {
      const srcset = generateSrcSet('https://example.com/image.jpg')

      expect(srcset).toContain('320w')
      expect(srcset).toContain('640w')
      expect(srcset).toContain('960w')
      expect(srcset).toContain('1280w')
    })

    it('uses custom widths', () => {
      const srcset = generateSrcSet('https://example.com/image.jpg', [400, 800, 1200])

      expect(srcset).toContain('400w')
      expect(srcset).toContain('800w')
      expect(srcset).toContain('1200w')
    })

    it('includes width parameter in URLs', () => {
      const srcset = generateSrcSet('https://example.com/image.jpg', [320])

      expect(srcset).toContain('width=320')
    })

    it('handles URLs without query string', () => {
      const srcset = generateSrcSet('https://example.com/image.jpg', [320])

      expect(srcset).toContain('width=320')
    })

    it('handles URLs with existing query string', () => {
      const srcset = generateSrcSet('https://example.com/image.jpg?foo=bar', [320])

      expect(srcset).toContain('width=320')
      expect(srcset).toContain('foo=bar')
    })

    it('includes quality parameter', () => {
      const srcset = generateSrcSet('https://example.com/image.jpg', [320], { quality: 60 })

      expect(srcset).toContain('quality=60')
    })

    it('generates multiple entries with correct format', () => {
      const srcset = generateSrcSet('https://example.com/image.jpg', [320, 640])

      const parts = srcset.split(', ')
      expect(parts).toHaveLength(2)
      expect(parts[0]).toContain('320w')
      expect(parts[1]).toContain('640w')
    })
  })

  describe('calculateAspectRatio', () => {
    it('calculates aspect ratio for standard dimensions', () => {
      expect(calculateAspectRatio(1920, 1080)).toBe('16/9')
    })

    it('calculates aspect ratio for square', () => {
      expect(calculateAspectRatio(100, 100)).toBe('1/1')
    })

    it('simplifies aspect ratio', () => {
      expect(calculateAspectRatio(200, 100)).toBe('2/1')
    })

    it('handles portrait orientation', () => {
      expect(calculateAspectRatio(1080, 1920)).toBe('9/16')
    })

    it('handles 4:3 ratio', () => {
      expect(calculateAspectRatio(1024, 768)).toBe('4/3')
    })

    it('handles very small numbers', () => {
      expect(calculateAspectRatio(4, 2)).toBe('2/1')
    })
  })

  describe('generateSizesAttribute', () => {
    it('generates sizes with default breakpoints', () => {
      const sizes = generateSizesAttribute('https://example.com/image.jpg')

      expect(sizes).toContain('(min-width: 1280px) 1200px')
      expect(sizes).toContain('(min-width: 1024px) 1000px')
    })

    it('merges custom breakpoints', () => {
      const sizes = generateSizesAttribute('https://example.com/image.jpg', {
        '(min-width: 768px)': 600
      })

      expect(sizes).toContain('(min-width: 768px) 600px')
      expect(sizes).toContain('(min-width: 480px) 480px')
    })

    it('includes fallback size', () => {
      const sizes = generateSizesAttribute('https://example.com/image.jpg')

      expect(sizes).toMatch(/\d+px$/)
    })

    it('uses custom breakpoints with multiple conditions', () => {
      const sizes = generateSizesAttribute('https://example.com/image.jpg', {
        '(min-width: 1400px)': 1400,
        '(min-width: 1200px)': 1000
      })

      expect(sizes).toContain('(min-width: 1400px) 1400px')
      expect(sizes).toContain('(min-width: 1200px) 1000px')
    })
  })

  describe('createResponsiveImage', () => {
    it('creates responsive image with lazy loading', () => {
      const image = createResponsiveImage({
        src: 'https://example.com/image.jpg',
        alt: 'Test image'
      })

      expect(image.src).toContain('width=')
      expect(image.alt).toBe('Test image')
      expect(image.loading).toBe('lazy')
      expect(image.decoding).toBe('async')
    })

    it('creates eager loading image', () => {
      const image = createResponsiveImage({
        src: 'https://example.com/image.jpg',
        alt: 'Test',
        lazy: false
      })

      expect(image.loading).toBe('eager')
    })

    it('generates srcset', () => {
      const image = createResponsiveImage({
        src: 'https://example.com/image.jpg',
        alt: 'Test'
      })

      expect(image.srcset).toContain('320w')
    })

    it('sets default width', () => {
      const image = createResponsiveImage({
        src: 'https://example.com/image.jpg',
        alt: 'Test'
      })

      expect(image.width).toBe(320)
    })

    it('sets loading to async by default', () => {
      const image = createResponsiveImage({
        src: 'https://example.com/image.jpg',
        alt: 'Test'
      })

      expect(image.decoding).toBe('async')
    })
  })

  describe('isImageLoaded', () => {
    it('returns false for unloaded image', () => {
      const img = new Image()

      expect(isImageLoaded(img)).toBe(false)
    })

    it('returns false for image with no natural height', () => {
      const img = document.createElement('img')
      Object.defineProperty(img, 'complete', { value: true, writable: false })
      Object.defineProperty(img, 'naturalHeight', { value: 0, writable: false })

      expect(isImageLoaded(img)).toBe(false)
    })

    it('returns true for complete image with natural height', () => {
      const img = document.createElement('img')
      Object.defineProperty(img, 'complete', { value: true, writable: false })
      Object.defineProperty(img, 'naturalHeight', { value: 100, writable: false })

      expect(isImageLoaded(img)).toBe(true)
    })
  })

  describe('swapImageSource', () => {
    it('swaps image src', () => {
      const img = document.createElement('img')
      img.src = 'https://example.com/old.jpg'

      swapImageSource(img, 'https://example.com/new.jpg')

      expect(img.src).toBe('https://example.com/new.jpg')
    })

    it('swaps srcset along with src', () => {
      const img = document.createElement('img')
      img.src = 'https://example.com/old.jpg'
      img.srcset = 'https://example.com/old-320w.jpg 320w'

      swapImageSource(img, 'https://example.com/new.jpg', 'https://example.com/new-320w.jpg 320w')

      expect(img.src).toBe('https://example.com/new.jpg')
      expect(img.srcset).toBe('https://example.com/new-320w.jpg 320w')
    })

    it('only swaps src when no srcset provided', () => {
      const img = document.createElement('img')
      img.src = 'https://example.com/old.jpg'
      img.srcset = 'https://example.com/old-320w.jpg 320w'

      swapImageSource(img, 'https://example.com/new.jpg')

      expect(img.src).toBe('https://example.com/new.jpg')
      expect(img.srcset).toBe('https://example.com/old-320w.jpg 320w')
    })
  })
})
