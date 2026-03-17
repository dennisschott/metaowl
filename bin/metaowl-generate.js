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
import { banner, cwd, metaowlRoot, resolveBin, run, step, success, failure } from './utils.js'

banner('generate')

function escapeAttr(str) {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
}

/**
 * Statically extract Meta.*() call arguments from JS source.
 * Only works for string literals — dynamic values are skipped.
 *
 * Returns an object with the keys:
 *   title, description, keywords, author, canonical,
 *   ogTitle, ogDescription, ogImage, ogUrl, ogType, ogSiteName
 */
function extractMetaFromJs(src) {
  const meta = {}
  const fns = [
    'title', 'description', 'keywords', 'author', 'canonical',
    'ogTitle', 'ogDescription', 'ogImage', 'ogUrl', 'ogType', 'ogSiteName',
  ]
  for (const fn of fns) {
    const m = src.match(new RegExp(`Meta\\.${fn}\\s*\\(\\s*(['"\`])([^'"\`]+)\\1\\s*\\)`))
    if (m) meta[fn] = m[2]
  }
  return meta
}

/**
 * Inject extracted meta values into the HTML head.
 * Returns the modified HTML string.
 */
function injectMeta(html, meta) {
  if (meta.title) {
    html = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeAttr(meta.title)}</title>`)
  }
  /** @param {string} selector @param {string} tag */
  const injectTag = (selector, tag) => {
    html = html.replace(new RegExp(`\\s*${selector}[^>]*>\\s*`, 'gi'), '')
    html = html.replace('</head>', `  ${tag}\n  </head>`)
  }
  if (meta.description)
    injectTag('<meta\\s+name="description"', `<meta name="description" content="${escapeAttr(meta.description)}">`)
  if (meta.keywords)
    injectTag('<meta\\s+name="keywords"', `<meta name="keywords" content="${escapeAttr(meta.keywords)}">`)
  if (meta.author)
    injectTag('<meta\\s+name="author"', `<meta name="author" content="${escapeAttr(meta.author)}">`)
  if (meta.canonical)
    injectTag('<link\\s+rel="canonical"', `<link rel="canonical" href="${escapeAttr(meta.canonical)}">`)
  if (meta.ogTitle)
    injectTag('<meta\\s+property="og:title"', `<meta property="og:title" content="${escapeAttr(meta.ogTitle)}">`)
  if (meta.ogDescription)
    injectTag('<meta\\s+property="og:description"', `<meta property="og:description" content="${escapeAttr(meta.ogDescription)}">`)
  if (meta.ogImage)
    injectTag('<meta\\s+property="og:image"', `<meta property="og:image" content="${escapeAttr(meta.ogImage)}">`)
  if (meta.ogUrl)
    injectTag('<meta\\s+property="og:url"', `<meta property="og:url" content="${escapeAttr(meta.ogUrl)}">`)
  if (meta.ogType)
    injectTag('<meta\\s+property="og:type"', `<meta property="og:type" content="${escapeAttr(meta.ogType)}">`)
  if (meta.ogSiteName)
    injectTag('<meta\\s+property="og:site_name"', `<meta property="og:site_name" content="${escapeAttr(meta.ogSiteName)}">`)
  return html
}

// Read project config
const pkg = JSON.parse(readFileSync(resolve(cwd, 'package.json'), 'utf-8'))
const metaowlConfig = pkg.metaowl ?? {}
const pagesDir = metaowlConfig.pagesDir ?? 'src/pages'
const outDir = metaowlConfig.outDir ?? 'dist'

// Derive URL route from a page file path
function deriveRoute(pageFile) {
  const rel = pageFile.replace(new RegExp(`^${pagesDir}[\\/]`), '')
  const parts = rel.split('/').slice(0, -1)
  if (parts.length === 1 && parts[0] === 'index') return '/'
  return '/' + parts.join('/')
}

/**
 * Extracts the layout name from a page component JS file.
 * Looks for `static layout = 'layoutName'` or `@layout('layoutName')`.
 *
 * @param {string} pageFile - Absolute path to the page JS file
 * @returns {string|null} Layout name or null if not found
 */
function extractLayoutName(pageFile) {
  const jsSource = readFileSync(pageFile, 'utf-8')

  // Match: static layout = 'layoutName' or static layout = "layoutName"
  let match = jsSource.match(/static\s+layout\s*=\s*['"]([^'"]+)['"]/)
  if (match) return match[1]

  // Match: @layout('layoutName') or @layout("layoutName")
  match = jsSource.match(/@layout\s*\(\s*['"]([^'"]+)['"]\s*\)/)
  if (match) return match[1]

  // Match: @defineLayout('layoutName', ...)
  match = jsSource.match(/@defineLayout\s*\(\s*['"]([^'"]+)['"]/)
  if (match) return match[1]

  return 'default'
}

/**
 * Converts an OWL XML template to best-effort static HTML.
 * - Strips t-name on the root element
 * - Strips all t-* attributes
 * - Unwraps bare <t> elements (replaces with their inner content)
 * - Replaces PascalCase component tags with an HTML comment placeholder
 * - Replaces t-slot="default" with provided page content
 *
 * @param {string} xml - OWL XML template
 * @param {string} [pageContent] - Optional page content to inject into t-slot="default"
 */
function xmlToStaticHtml(xml, pageContent = '') {
  let html = xml
  // Remove t-name attribute from root
  html = html.replace(/\s+t-name="[^"]*"/g, '')
  // Remove all t-* attributes (handles both t-if="..." and bare t-else/t-else)
  html = html.replace(/\s+t-[\w-]+(="[^"]*")?/g, '')
  // Unwrap bare <t> wrapper elements (self-closing)
  html = html.replace(/<t\s*\/>/g, '')
  // Unwrap <t ...> ... </t> blocks — replace opening/closing tags with content
  html = html.replace(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g, (_, inner) => inner)
  // Replace t-slot="default" with page content (if provided)
  if (pageContent) {
    html = html.replace(/<t\s+t-slot="default"\s*\/?>/g, pageContent)
    html = html.replace(/<t\s+t-slot="default"[^>]*>([\s\S]*?)<\/t>/g, pageContent)
  }
  // Replace PascalCase component tags with a comment stub
  // Matches <ComponentName ... /> and <ComponentName ...></ComponentName>
  html = html.replace(/<([A-Z][A-Za-z0-9]*)\s*\/>/g, '<!-- $1 -->')
  html = html.replace(/<([A-Z][A-Za-z0-9]*)(?:\s[^>]*)?>[\s\S]*?<\/\1>/g, '<!-- $1 -->')
  return html.trim()
}

// Build final HTML shell for a page
function buildShell(baseHtml, pageFile) {
  let html = baseHtml

  // Extract meta tags from JS source (Meta.title(...), Meta.description(...) etc.)
  const jsSource = readFileSync(resolve(cwd, pageFile), 'utf-8')
  const meta = extractMetaFromJs(jsSource)
  html = injectMeta(html, meta)

  // Get the page's layout name
  const layoutName = extractLayoutName(resolve(cwd, pageFile))
  const layoutsDir = metaowlConfig.layoutsDir ?? 'src/layouts'

  // Try to find and read the layout XML template
  let finalContent = ''

  // First, try to read the layout XML
  const layoutXmlFile = resolve(cwd, layoutsDir, layoutName, `${layoutName.charAt(0).toUpperCase() + layoutName.slice(1)}Layout.xml`)
  const layoutXmlExists = existsSync(layoutXmlFile)

  // Read the page XML template
  const pageXmlFile = resolve(cwd, pageFile.replace(/\.js$/, '.xml'))
  const pageXmlExists = existsSync(pageXmlFile)

  if (layoutXmlExists && pageXmlExists) {
    // Read both layout and page templates
    const layoutXmlContent = readFileSync(layoutXmlFile, 'utf-8')
    const pageXmlContent = readFileSync(pageXmlFile, 'utf-8')

    // Convert page XML to static HTML first
    const pageStaticHtml = xmlToStaticHtml(pageXmlContent)

    // Then inject into layout's t-slot="default"
    finalContent = xmlToStaticHtml(layoutXmlContent, pageStaticHtml)
  } else if (pageXmlExists) {
    // No layout found, just use page content
    const pageXmlContent = readFileSync(pageXmlFile, 'utf-8')
    finalContent = xmlToStaticHtml(pageXmlContent)
  }

  // Inject the combined layout + page HTML
  if (finalContent) {
    html = html.replace(/(<div\s+id="metaowl"[^>]*>)(<\/div>)/, `$1${finalContent}$2`)
  }

  return html
}

// 1. Lint
run('Linting', `node "${metaowlRoot}/bin/metaowl-lint.js"`)

// 2. Vite build
run('Building', `"${resolveBin('vite')}" build`)

// 3. SSG post-processing
step('Generating static pages...')
console.log()
const baseHtml = readFileSync(resolve(cwd, outDir, 'index.html'), 'utf-8')

const pageFiles = globSync(`${pagesDir}/**/*.js`, { cwd })

const seen = new Set()

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
