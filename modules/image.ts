/**
 * @module Image
 *
 * Image optimization utilities for metaowl applications.
 * Provides lazy loading, responsive srcset generation, and placeholder support.
 */

export interface ImageSrcSet {
  src: string
  srcset: string
  width: number
  height: number
}

export interface ImageOptions {
  src: string
  alt?: string
  widths?: number[]
  format?: 'webp' | 'avif' | 'original'
  quality?: number
  lazy?: boolean
  placeholder?: boolean
  placeholderType?: 'blur' | 'dominant'
  sizes?: string
}

export interface ResponsiveImage {
  src: string
  srcset: string
  width: number
  height: number
  alt: string
  loading: 'lazy' | 'eager'
  decoding: 'async' | 'sync' | 'auto'
  placeholder?: string
  blurDataURL?: string
}

const DEFAULT_WIDTHS = [320, 640, 960, 1280, 1600, 1920]
const DEFAULT_QUALITY = 80

export function generateSrcSet(
  baseSrc: string,
  widths: number[] = DEFAULT_WIDTHS,
  options: { format?: string; quality?: number } = {}
): string {
  const { format = 'original', quality = DEFAULT_QUALITY } = options

  const srcsetParts: string[] = []

  for (const width of widths) {
    const url = buildOptimizedUrl(baseSrc, width, format, quality)
    srcsetParts.push(`${url} ${width}w`)
  }

  return srcsetParts.join(', ')
}

function buildOptimizedUrl(
  baseSrc: string,
  width: number,
  format: string,
  quality: number
): string {
  try {
    const url = new URL(baseSrc)
    if (format !== 'original') {
      url.searchParams.set('format', format)
    }
    url.searchParams.set('width', String(width))
    url.searchParams.set('quality', String(quality))
    return url.toString()
  } catch {
    const separator = baseSrc.includes('?') ? '&' : '?'
    return `${baseSrc}${separator}width=${width}&quality=${quality}`
  }
}

export function calculateAspectRatio(width: number, height: number): string {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))
  const divisor = gcd(width, height)
  return `${width / divisor}/${height / divisor}`
}

export function generateSizesAttribute(
  src: string,
  breakpoints: Record<string, number> = {}
): string {
  const defaultBreakpoints = {
    '(min-width: 1280px)': 1200,
    '(min-width: 1024px)': 1000,
    '(min-width: 768px)': 720,
    '(min-width: 480px)': 480
  }

  const merged = { ...defaultBreakpoints, ...breakpoints }
  const parts: string[] = []

  for (const [condition, size] of Object.entries(merged)) {
    parts.push(`${condition} ${size}px`)
  }

  parts.push(`${Math.min(...Object.values(merged))}px`)

  return parts.join(', ')
}

export function createResponsiveImage(options: ImageOptions): ResponsiveImage {
  const {
    src,
    alt = '',
    widths = DEFAULT_WIDTHS,
    format = 'original',
    quality = DEFAULT_QUALITY,
    lazy = true,
    placeholder = false,
    placeholderType = 'blur'
  } = options

  const srcset = generateSrcSet(src, widths, { format, quality })

  const filteredWidths = widths.filter((w) => w <= 1920)
  const defaultWidth = filteredWidths.length > 0 ? filteredWidths[0] : widths[0]

  const result: ResponsiveImage = {
    src: buildOptimizedUrl(src, defaultWidth, format, quality),
    srcset,
    width: defaultWidth,
    height: 0,
    alt,
    loading: lazy ? 'lazy' : 'eager',
    decoding: 'async'
  }

  if (placeholder) {
    result.placeholder = placeholderType === 'blur' ? buildPlaceholderBlur(src) : undefined
    result.blurDataURL = result.placeholder
  }

  return result
}

function buildPlaceholderBlur(src: string): string {
  try {
    const url = new URL(src)
    url.searchParams.set('w', '10')
    url.searchParams.set('q', '10')
    url.searchParams.set('blur', '10')
    return url.toString()
  } catch {
    return src
  }
}

export function prefetchImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = reject
    img.src = src
  })
}

export async function prefetchImages(sources: string[]): Promise<void> {
  await Promise.all(sources.map(prefetchImage))
}

export function isImageLoaded(img: HTMLImageElement): boolean {
  return img.complete && img.naturalHeight > 0
}

export function getImageDimensions(
  src: string
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = reject
    img.src = src
  })
}

export function observeImageVisibility(
  img: HTMLImageElement,
  callback: (isVisible: boolean) => void,
  options: IntersectionObserverInit = {}
): IntersectionObserver {
  const defaultOptions: IntersectionObserverInit = {
    root: null,
    rootMargin: '50px',
    threshold: 0.01,
    ...options
  }

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      callback(entry.isIntersecting)
    }
  }, defaultOptions)

  observer.observe(img)

  return observer
}

export function swapImageSource(
  img: HTMLImageElement,
  newSrc: string,
  newSrcset?: string
): void {
  if (newSrcset) {
    img.srcset = newSrcset
  }
  if (newSrc) {
    img.src = newSrc
  }
}

export interface ImagePlaceholder {
  type: 'blur' | 'dominant' | 'solid'
  value: string
}

export function generateDominantColorPlaceholder(src: string): Promise<ImagePlaceholder> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve({ type: 'solid', value: '#cccccc' })
        return
      }

      canvas.width = 1
      canvas.height = 1
      ctx.drawImage(img, 0, 0, 1, 1)

      try {
        const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
        resolve({
          type: 'dominant',
          value: `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
        })
      } catch {
        resolve({ type: 'solid', value: '#cccccc' })
      }
    }
    img.onerror = () => {
      resolve({ type: 'solid', value: '#cccccc' })
    }
    img.src = src
  })
}

export const ImageOptimizer = {
  generateSrcSet,
  calculateAspectRatio,
  generateSizesAttribute,
  createResponsiveImage,
  prefetchImage,
  prefetchImages,
  isImageLoaded,
  getImageDimensions,
  observeImageVisibility,
  swapImageSource,
  generateDominantColorPlaceholder
}
