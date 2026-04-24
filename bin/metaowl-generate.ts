#!/usr/bin/env node
/**
 * metaowl generate — SSG production build.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { globSync } from 'glob'
import { banner, cwd, resolveBin, resolveOwnRuntimeBin, run, step, success } from './utils.js'

type MetaMap = Record<string, string>
type TemplateOptions = {
  templateCache?: Map<string, string>
}
type MetaowlConfig = {
  pagesDir?: string
  outDir?: string
  layoutsDir?: string
  componentsDir?: string
}

banner('generate')

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
}

function extractMetaFromJs(src: string): MetaMap {
  const meta: MetaMap = {}
  const fns = [
    'title', 'description', 'keywords', 'author', 'canonical',
    'ogTitle', 'ogDescription', 'ogImage', 'ogUrl', 'ogType', 'ogSiteName'
  ]
  for (const fn of fns) {
    const match = src.match(new RegExp(`Meta\\.${fn}\\s*\\(\\s*(['"\`])([^'"\`]+)\\1\\s*\\)`))
    if (match?.[2]) meta[fn] = match[2]
  }
  return meta
}

function injectMeta(html: string, meta: MetaMap): string {
  let nextHtml = html

  if (meta.title) {
    nextHtml = nextHtml.replace(/<title>[^<]*<\/title>/, `<title>${escapeAttr(meta.title)}</title>`)
  }

  const injectTag = (selector: string, tag: string): void => {
    nextHtml = nextHtml.replace(new RegExp(`\\s*${selector}[^>]*>\\s*`, 'gi'), '')
    nextHtml = nextHtml.replace('</head>', `  ${tag}\n  </head>`)
  }

  if (meta.description) injectTag('<meta\\s+name="description"', `<meta name="description" content="${escapeAttr(meta.description)}">`)
  if (meta.keywords) injectTag('<meta\\s+name="keywords"', `<meta name="keywords" content="${escapeAttr(meta.keywords)}">`)
  if (meta.author) injectTag('<meta\\s+name="author"', `<meta name="author" content="${escapeAttr(meta.author)}">`)
  if (meta.canonical) injectTag('<link\\s+rel="canonical"', `<link rel="canonical" href="${escapeAttr(meta.canonical)}">`)
  if (meta.ogTitle) injectTag('<meta\\s+property="og:title"', `<meta property="og:title" content="${escapeAttr(meta.ogTitle)}">`)
  if (meta.ogDescription) injectTag('<meta\\s+property="og:description"', `<meta property="og:description" content="${escapeAttr(meta.ogDescription)}">`)
  if (meta.ogImage) injectTag('<meta\\s+property="og:image"', `<meta property="og:image" content="${escapeAttr(meta.ogImage)}">`)
  if (meta.ogUrl) injectTag('<meta\\s+property="og:url"', `<meta property="og:url" content="${escapeAttr(meta.ogUrl)}">`)
  if (meta.ogType) injectTag('<meta\\s+property="og:type"', `<meta property="og:type" content="${escapeAttr(meta.ogType)}">`)
  if (meta.ogSiteName) injectTag('<meta\\s+property="og:site_name"', `<meta property="og:site_name" content="${escapeAttr(meta.ogSiteName)}">`)

  return nextHtml
}

const pkg = JSON.parse(readFileSync(resolve(cwd, 'package.json'), 'utf-8')) as { metaowl?: MetaowlConfig }
const metaowlConfig = pkg.metaowl ?? {}
const pagesDir = metaowlConfig.pagesDir ?? 'src/pages'
const outDir = metaowlConfig.outDir ?? 'dist'

function deriveRoute(pageFile: string): string {
  const rel = pageFile.replace(new RegExp(`^${pagesDir}[\\/]`), '')
  const parts = rel.split('/').slice(0, -1)
  if (parts.length === 1 && parts[0] === 'index') return '/'
  return '/' + parts.join('/')
}

function extractLayoutName(pageFile: string): string {
  const jsSource = readFileSync(pageFile, 'utf-8')

  let match = jsSource.match(/static\s+layout\s*=\s*['"]([^'"]+)['"]/) 
  if (match?.[1]) return match[1]

  match = jsSource.match(/@layout\s*\(\s*['"]([^'"]+)['"]\s*\)/)
  if (match?.[1]) return match[1]

  match = jsSource.match(/@defineLayout\s*\(\s*['"]([^'"]+)['"]/) 
  if (match?.[1]) return match[1]

  return 'default'
}

function xmlToStaticHtml(xml: string, pageContent = '', options: TemplateOptions = {}): string {
  const { templateCache } = options
  let html = xml

  html = html.replace(/<templates>/g, '').replace(/<\/templates>/g, '')
  html = html.replace(/^\s*<t[^>]*>/, '').replace(/<\/t>\s*$/, '')
  html = html.replace(/\s+t-name="[^"]*"/g, '')
  html = html.replace(/\s+t-[\w-]+(="[^"]*")?/g, '')
  html = html.replace(/<t\s*\/>/g, '')
  html = html.replace(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g, (_match, inner: string) => inner)

  if (pageContent) {
    html = html.replace(/<t\s+t-slot="default"\s*\/?>/g, pageContent)
    html = html.replace(/<t\s+t-slot="default"[^>]*>([\s\S]*?)<\/t>/g, pageContent)
  }

  if (templateCache) {
    let previousHtml: string
    do {
      previousHtml = html
      html = html.replace(/<([A-Z][A-Za-z0-9]*)\s*\/>/g, (match, componentName: string) => {
        const templateNames = [
          componentName,
          componentName.charAt(0).toLowerCase() + componentName.slice(1),
          componentName + 'Component'
        ]
        for (const name of templateNames) {
          if (templateCache.has(name)) {
            return templateCache.get(name) as string
          }
        }
        return match
      })

      html = html.replace(/<([A-Z][A-Za-z0-9]*)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/g, (match, componentName: string) => {
        const templateNames = [
          componentName,
          componentName.charAt(0).toLowerCase() + componentName.slice(1),
          componentName + 'Component'
        ]
        for (const name of templateNames) {
          if (templateCache.has(name)) {
            return templateCache.get(name) as string
          }
        }
        return match
      })
    } while (html !== previousHtml)
  } else {
    html = html.replace(/<([A-Z][A-Za-z0-9]*)\s*\/>/g, '<!-- $1 -->')
    html = html.replace(/<([A-Z][A-Za-z0-9]*)(?:\s[^>]*)?>[\s\S]*?<\/\1>/g, '<!-- $1 -->')
  }

  return html.trim()
}

function buildShell(baseHtml: string, pageFile: string): string {
  let html = baseHtml

  const jsSource = readFileSync(resolve(cwd, pageFile), 'utf-8')
  const meta = extractMetaFromJs(jsSource)
  html = injectMeta(html, meta)

  const layoutName = extractLayoutName(resolve(cwd, pageFile))
  const layoutsDir = metaowlConfig.layoutsDir ?? 'src/layouts'
  const componentsDir = metaowlConfig.componentsDir ?? 'src/components'
  const templateCache = new Map<string, string>()

  const componentXmlFiles = globSync(`${componentsDir}/**/*.xml`, { cwd })
  for (const componentXmlFile of componentXmlFiles) {
    const content = readFileSync(resolve(cwd, componentXmlFile), 'utf-8')
    const tNameMatches = content.matchAll(/<t\s+t-name="([^"]+)"[^>]*>([\s\S]*?)<\/t>/g)
    for (const match of tNameMatches) {
      if (match[1] && match[2]) {
        templateCache.set(match[1], match[2])
      }
    }
    const rootMatch = content.match(/<templates>\s*<t[^>]*>([\s\S]*?)<\/t>\s*<\/templates>/)
    if (rootMatch?.[1]) {
      const fileName = componentXmlFile.replace(/\.xml$/, '').split('/').pop()
      if (fileName) {
        templateCache.set(fileName, rootMatch[1])
      }
    }
  }

  const layoutXmlFiles = globSync(`${layoutsDir}/**/*.xml`, { cwd })
  for (const layoutXmlFile of layoutXmlFiles) {
    const content = readFileSync(resolve(cwd, layoutXmlFile), 'utf-8')
    const tNameMatches = content.matchAll(/<t\s+t-name="([^"]+)"[^>]*>([\s\S]*?)<\/t>/g)
    for (const match of tNameMatches) {
      if (match[1] && match[2]) {
        templateCache.set(match[1], match[2])
      }
    }
  }

  const pageXmlFiles = globSync(`${pagesDir}/**/*.xml`, { cwd })
  for (const pageXmlFile of pageXmlFiles) {
    const content = readFileSync(resolve(cwd, pageXmlFile), 'utf-8')
    const tNameMatches = content.matchAll(/<t\s+t-name="([^"]+)"[^>]*>([\s\S]*?)<\/t>/g)
    for (const match of tNameMatches) {
      if (match[1] && match[2]) {
        templateCache.set(match[1], match[2])
      }
    }
    const rootMatch = content.match(/<templates>\s*<t[^>]*>([\s\S]*?)<\/t>\s*<\/templates>/)
    if (rootMatch?.[1]) {
      const fileName = pageXmlFile.replace(/\.xml$/, '').split('/').pop()
      if (fileName) {
        templateCache.set(fileName, rootMatch[1])
      }
    }
  }

  let finalContent = ''
  const layoutXmlFile = resolve(cwd, layoutsDir, layoutName, `${layoutName.charAt(0).toUpperCase() + layoutName.slice(1)}Layout.xml`)
  const layoutXmlExists = existsSync(layoutXmlFile)
  const pageXmlFile = resolve(cwd, pageFile.replace(/\.js$/, '.xml'))
  const pageXmlExists = existsSync(pageXmlFile)

  if (layoutXmlExists && pageXmlExists) {
    const layoutXmlContent = readFileSync(layoutXmlFile, 'utf-8')
    const pageXmlContent = readFileSync(pageXmlFile, 'utf-8')
    const pageStaticHtml = xmlToStaticHtml(pageXmlContent, '', { templateCache })
    finalContent = xmlToStaticHtml(layoutXmlContent, pageStaticHtml, { templateCache })
  } else if (pageXmlExists) {
    const pageXmlContent = readFileSync(pageXmlFile, 'utf-8')
    finalContent = xmlToStaticHtml(pageXmlContent, '', { templateCache })
  }

  if (finalContent) {
    html = html.replace(/(<div\s+id="metaowl"[^>]*>)(<\/div>)/, `$1${finalContent}$2`)
  }

  return html
}

run('Linting', `node "${resolveOwnRuntimeBin('metaowl-lint')}"`)
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
    console.log('    /index.html')
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