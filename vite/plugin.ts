import { createHash } from 'node:crypto'
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { config as dotenvConfig } from 'dotenv'
import { globSync } from 'glob'
import tsconfigPaths from 'vite-tsconfig-paths'

const require = createRequire(import.meta.url)

type Plugin = Record<string, any>
type UserConfig = Record<string, any>

interface HotUpdateContext {
  file: string
}

interface ConfigEnv {
  mode: string
}

interface ResolvedBuildConfig {
  outDir: string
}

interface ResolvedConfigLike {
  root: string
  build: ResolvedBuildConfig
}

interface AutoImportOptions {
  enabled?: boolean
  pattern?: string
}

interface MetaowlPluginOptions {
  root?: string
  outDir?: string
  publicDir?: string
  componentsDir?: string
  pagesDir?: string
  layoutsDir?: string
  frameworkEntry?: string
  vendorPackages?: string[]
  envPrefix?: string
  autoImport?: AutoImportOptions
}

function resolveOwlPath(): string {
  return require.resolve('@odoo/owl/dist/owl.es.js', {
    paths: [process.cwd(), dirname(fileURLToPath(import.meta.url))]
  })
}

function collectXml(globPattern: string): string[] {
  return globSync(globPattern).map((filePath) => filePath.replace(/^src[\\/]/, '/'))
}

function mergeXmlFiles(xmlPaths: string[]): string {
  const templates = xmlPaths.map((filePath) => {
    try {
      let content = readFileSync(filePath, 'utf-8')
      content = content.replace(/<templates>/g, '').replace(/<\/templates>/g, '')
      return content
    } catch (error) {
      console.error(`[metaowl] Failed to read XML file: ${filePath}`, error)
      return ''
    }
  }).join('')

  return '<templates>' + templates + '</templates>'
}

export async function metaowlPlugin(options: MetaowlPluginOptions = {}): Promise<Plugin[]> {
  const {
    root = 'src',
    outDir = '../dist',
    publicDir = '../public',
    componentsDir = 'src/components',
    pagesDir = 'src/pages',
    layoutsDir = 'src/layouts',
    frameworkEntry = './node_modules/metaowl/index.js',
    vendorPackages = ['@odoo/owl'],
    autoImport = {},
    envPrefix
  } = options

  const componentXml = collectXml(`${componentsDir}/**/*.xml`)
  const pageXml = collectXml(`${pagesDir}/**/*.xml`)
  const layoutXml = collectXml(`${layoutsDir}/**/*.xml`)
  const allComponents = [...layoutXml, ...pageXml, ...componentXml]

  let outDirResolved: string | null = null

  const autoImportDtsPath = resolve(process.cwd(), '.metaowl', 'components.d.ts')
  let autoImportPlugin: Plugin | null = null

  if (autoImport.enabled) {
    const { generateComponentDts, scanComponents } = await import('../modules/auto-import.js')
    const components = await scanComponents(componentsDir, { pattern: autoImport.pattern || '*.js' })

    const metaowlDir = dirname(autoImportDtsPath)
    if (!existsSync(metaowlDir)) {
      mkdirSync(metaowlDir, { recursive: true })
    }

    await generateComponentDts(components, autoImportDtsPath)

    autoImportPlugin = {
      name: 'metaowl:auto-import',
      enforce: 'pre',
      configResolved() {
        // Components are scanned at startup.
      },
      handleHotUpdate({ file }: HotUpdateContext) {
        if (file.startsWith(resolve(componentsDir)) && file.endsWith('.js')) {
          void scanComponents(componentsDir, { pattern: autoImport.pattern || '*.js' }).then((nextComponents) => {
            return generateComponentDts(nextComponents, autoImportDtsPath)
          })
        }
      }
    }
  }

  const plugins: Plugin[] = [
    ...(autoImportPlugin ? [autoImportPlugin] : []),
    tsconfigPaths({ root: process.cwd() }) as unknown as Plugin,
    {
      name: 'metaowl:define',
      config(cfg: UserConfig, { mode }: ConfigEnv) {
        dotenvConfig()

        const isDev = mode === 'development'
        const safeEnv = Object.fromEntries(
          Object.entries(process.env).filter(([key]) =>
            key === 'NODE_ENV' || (envPrefix && key.startsWith(envPrefix))
          )
        )

        cfg.define = {
          ...(cfg.define ?? {}),
          DEV_MODE: isDev,
          COMPONENTS: JSON.stringify(isDev ? allComponents : ['/templates.xml']),
          'process.env': safeEnv
        }

        cfg.root = cfg.root ?? root
        cfg.publicDir = cfg.publicDir ?? publicDir
        cfg.appType = cfg.appType ?? 'spa'

        const owlPath = resolveOwlPath()
        cfg.resolve = {
          ...(cfg.resolve ?? {}),
          alias: {
            ...(cfg.resolve?.alias ?? {}),
            '@odoo/owl': owlPath
          }
        }

        cfg.build = {
          outDir,
          emptyOutDir: true,
          sourcemap: isDev,
          chunkSizeWarningLimit: 1024,
          target: 'esnext',
          rollupOptions: {
            input: resolve(root, 'index.html'),
            output: {
              manualChunks: {
                vendor: vendorPackages,
                framework: [frameworkEntry]
              }
            }
          },
          ...(cfg.build ?? {})
        }

        cfg.optimizeDeps = {
          include: ['@odoo/owl'],
          ...(cfg.optimizeDeps ?? {})
        }
      },
      configResolved(resolvedConfig: ResolvedConfigLike) {
        outDirResolved = resolve(resolvedConfig.root, resolvedConfig.build.outDir)
      }
    },
    {
      name: 'metaowl:app',
      transform(code: string, id: string) {
        if (!id.endsWith('/metaowl.js')) return null
        const pagesRel = pagesDir.replace(new RegExp(`^${root}[\\/]`), '')
        const layoutsRel = layoutsDir.replace(new RegExp(`^${root}[\\/]`), '')
        return {
          code: code.replace(
            /boot\(\s*\)/,
            `boot(import.meta.glob('./${pagesRel}/**/*.js', { eager: true }), import.meta.glob('./${layoutsRel}/**/*.js', { eager: true }))`
          ),
          map: null
        }
      }
    },
    {
      name: 'metaowl:styles',
      transform(code: string, id: string) {
        if (!id.endsWith('/css.js')) return null
        const compRel = componentsDir.replace(new RegExp(`^${root}[\\/]`), '')
        const pagesRel = pagesDir.replace(new RegExp(`^${root}[\\/]`), '')
        const layoutsRel = layoutsDir.replace(new RegExp(`^${root}[\\/]`), '')
        return {
          code: code + '\n' +
            `import.meta.glob('/${compRel}/**/*.{css,scss}', { eager: true })\n` +
            `import.meta.glob('/${pagesRel}/**/*.{css,scss}', { eager: true })\n` +
            `import.meta.glob('/${layoutsRel}/**/*.{css,scss}', { eager: true })\n`,
          map: null
        }
      }
    },
    {
      name: 'metaowl:copy-assets',
      apply: 'build',
      closeBundle() {
        if (!outDirResolved) return

        const projectRoot = process.cwd()
        const xmlFiles = globSync([`${componentsDir}/**/*.xml`, `${pagesDir}/**/*.xml`, `${layoutsDir}/**/*.xml`])
        const mergedXml = mergeXmlFiles(xmlFiles)

        const hash = createHash('sha256').update(mergedXml).digest('hex').slice(0, 8)
        const hashedFilename = `templates.${hash}.xml`
        writeFileSync(resolve(outDirResolved, hashedFilename), mergedXml, 'utf-8')

        const outputFiles = globSync(['**/*.html', '**/*.js'], { cwd: outDirResolved, absolute: true })
        for (const file of outputFiles) {
          const content = readFileSync(file, 'utf-8')
          if (content.includes('/templates.xml')) {
            writeFileSync(file, content.replace(/\/templates\.xml/g, `/${hashedFilename}`), 'utf-8')
          }
        }

        const srcImages = resolve(projectRoot, root, 'assets', 'images')
        if (existsSync(srcImages)) {
          cpSync(srcImages, resolve(outDirResolved, 'assets', 'images'), { recursive: true })
        }
      }
    }
  ]

  return plugins
}

export async function metaowlConfig(
  options: MetaowlPluginOptions & {
    server?: Record<string, unknown>
    preview?: Record<string, unknown>
    build?: Record<string, unknown>
  } = {}
): Promise<UserConfig> {
  const { server, preview, build, ...metaowlOptions } = options
  const plugins = await metaowlPlugin(metaowlOptions)
  return {
    server: { port: 3000, strictPort: true, host: true, ...server },
    preview: { port: 4173, strictPort: true, ...preview },
    ...(build ? { build } : {}),
    plugins
  }
}