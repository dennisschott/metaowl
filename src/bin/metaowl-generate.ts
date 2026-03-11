#!/usr/bin/env node
/**
 * metaowl generate — SSG production build.
 *
 * Runs lint + vite build, then generates a static HTML file for every page:
 * - <title> and meta tags extracted statically from Meta.*() calls in the page JS
 * - Static HTML content auto-extracted from the page's OWL XML template,
 *   with OWL-specific syntax stripped (best-effort, no JS evaluated)
 *
 * pagesDir / outDir can be overridden in package.json under "metaowl":
 *   { "metaowl": { "pagesDir": "src/pages", "outDir": "dist" } }
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { globSync } from 'glob'
import { banner, cwd, metaowlRoot, resolveBin, run, step, success } from './utils.js'

banner('generate')

function escapeAttr(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
}

interface MetaConfig {
  title?: string
  description?: string
  keywords?: string
  author?: string
  canonical?: string
  ogTitle?: string
  ogDescription?: string
  ogImage?: string
  ogUrl?: string
  ogType?: string
  ogSiteName?: string
}

function extractMetaFromJs(src: string): MetaConfig {
  const meta: MetaConfig = {}
  const fns: (keyof MetaConfig)[] = [
    'title', 'description', 'keywords', 'author', 'canonical',
    'ogTitle', 'ogDescription', 'ogImage', 'ogUrl', 'ogType', 'ogSiteName',
  ]
  for (const fn of fns) {
    const m = src.match(new RegExp(`Meta\\.${fn}\\s*\\(\\s*(['"\`])([^'"\`]+)\\1\\s*\\)`))
    if (m) meta[fn] = m[2]
  }
  return meta
}

function injectTag(html: string, selector: string, tag: string): string {
  html = html.replace(new RegExp(`\\s*${selector}[^>]*>\\s*`, 'gi'), '')
  return html.replace('</head>', `  ${tag}\n  </head>`)
}

function injectMeta(html: string, meta: MetaConfig): string {
  if (meta.title) {
    html = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeAttr(meta.title)}</title>`)
  }
  if (meta.description)
    html = injectTag(html, '<meta\\s+name="description"', `<meta name="description" content="${escapeAttr(meta.description)}">`)
  if (meta.keywords)
    html = injectTag(html, '<meta\\s+name="keywords"', `<meta name="keywords" content="${escapeAttr(meta.keywords)}">`)
  if (meta.author)
    html = injectTag(html, '<meta\\s+name="author"', `<meta name="author" content="${escapeAttr(meta.author)}">`)
  if (meta.canonical)
    html = injectTag(html, '<link\\s+rel="canonical"', `<link rel="canonical" href="${escapeAttr(meta.canonical)}">`)
  if (meta.ogTitle)
    html = injectTag(html, '<meta\\s+property="og:title"', `<meta property="og:title" content="${escapeAttr(meta.ogTitle)}">`)
  if (meta.ogDescription)
    html = injectTag(html, '<meta\\s+property="og:description"', `<meta property="og:description" content="${escapeAttr(meta.ogDescription)}">`)
  if (meta.ogImage)
    html = injectTag(html, '<meta\\s+property="og:image"', `<meta property="og:image" content="${escapeAttr(meta.ogImage)}">`)
  if (meta.ogUrl)
    html = injectTag(html, '<meta\\s+property="og:url"', `<meta property="og:url" content="${escapeAttr(meta.ogUrl)}">`)
  if (meta.ogType)
    html = injectTag(html, '<meta\\s+property="og:type"', `<meta property="og:type" content="${escapeAttr(meta.ogType)}">`)
  if (meta.ogSiteName)
    html = injectTag(html, '<meta\\s+property="og:site_name"', `<meta property="og:site_name" content="${escapeAttr(meta.ogSiteName)}">`)
  return html
}

interface PackageJson {
  metaowl?: {
    pagesDir?: string
    outDir?: string
  }
}

const pkg = JSON.parse(readFileSync(resolve(cwd, 'package.json'), 'utf-8')) as PackageJson
const metaowlConfig = pkg.metaowl ?? {}
const pagesDir = metaowlConfig.pagesDir ?? 'src/pages'
const outDir = metaowlConfig.outDir ?? 'dist'

function deriveRoute(pageFile: string): string {
  const rel = pageFile.replace(new RegExp(`^${pagesDir}[\\\\/]`), '')
  const parts = rel.split('/').slice(0, -1)
  if (parts.length === 1 && parts[0] === 'index') return '/'
  return '/' + parts.join('/')
}

function xmlToStaticHtml(xml: string): string {
  let html = xml
  html = html.replace(/\s+t-name="[^"]*"/g, '')
  html = html.replace(/\s+t-[\w-]+(="[^"]*")?/g, '')
  html = html.replace(/<t\s*\/>/g, '')
  html = html.replace(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g, (_, inner) => inner)
  html = html.replace(/<([A-Z][A-Za-z0-9]*)\s*\/>/g, '<!-- $1 -->')
  html = html.replace(/<([A-Z][A-Za-z0-9]*)(?:\s[^>]*)?>[\s\S]*?<\/\1>/g, '<!-- $1 -->')
  return html.trim()
}

function buildShell(baseHtml: string, pageFile: string): string {
  let html = baseHtml
  const jsSource = readFileSync(resolve(cwd, pageFile), 'utf-8')
  const meta = extractMetaFromJs(jsSource)
  html = injectMeta(html, meta)
  const xmlFile = resolve(cwd, pageFile.replace(/\.js$/, '.xml'))
  if (existsSync(xmlFile)) {
    const xmlContent = readFileSync(xmlFile, 'utf-8')
    const staticHtml = xmlToStaticHtml(xmlContent)
    if (staticHtml) {
      html = html.replace(/(<div\s+id="metaowl"[^>]*>)(<\/div>)/, `$1${staticHtml}$2`)
    }
  }
  return html
}

run('Linting', `node "${metaowlRoot}/dist/bin/metaowl-lint.js"`)
run('Building', `"${resolveBin('vite')}" build`)
step('Generating static pages...')
console.log()
const baseHtml = readFileSync(resolve(cwd, outDir, 'index.html'), 'utf-8')
const pageFiles = globSync(`${pagesDir}/**/*.js`, { cwd })
const seen = new Set<string>()

for (const pageFile of pageFiles) {
  const route = deriveRoute(pageFile)
  if (seen.has(route)) continue
  seen.add(route)
  const shell = buildShell(baseHtml, pageFile)
  if (route === '/') {
    writeFileSync(resolve(cwd, outDir, 'index.html'), shell)
    console.log(`    /index.html`)
  } else {
    const destDir = resolve(cwd, outDir, route.slice(1))
    mkdirSync(destDir, { recursive: true })
    writeFileSync(resolve(destDir, 'index.html'), shell)
    console.log(`    ${route}/index.html`)
  }
}

console.log()
success(`${seen.size} route(s) generated`)
console.log()
