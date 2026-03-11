import { fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'
import { mkdirSync, copyFileSync, cpSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { globSync } from 'glob'
import { config as dotenvConfig } from 'dotenv'
import ViteRestart from 'vite-plugin-restart'
import tsconfigPaths from 'vite-tsconfig-paths'
import type { Plugin, UserConfig } from 'vite'

const require = createRequire(import.meta.url)

function resolveOwlPath(): string {
  return require.resolve('@odoo/owl/dist/owl.es.js', {
    paths: [process.cwd(), dirname(fileURLToPath(import.meta.url))]
  })
}

function collectXml(globPattern: string): string[] {
  return globSync(globPattern).map(p => p.replace(/^src[\\/]/, '/'))
}

export interface MetaowlPluginOptions {
  root?: string
  outDir?: string
  publicDir?: string
  componentsDir?: string
  pagesDir?: string
  restartGlobs?: string[]
  frameworkEntry?: string
  vendorPackages?: string[]
  envPrefix?: string
}

export function metaowlPlugin(options: MetaowlPluginOptions = {}): Plugin[] {
  const {
    root = 'src',
    outDir = '../dist',
    publicDir = '../public',
    componentsDir = 'src/components',
    pagesDir = 'src/pages',
    restartGlobs = [],
    frameworkEntry = './node_modules/metaowl/dist/index.js',
    vendorPackages = ['@odoo/owl']
  } = options

  const componentXml = collectXml(`${componentsDir}/**/*.xml`)
  const pageXml = collectXml(`${pagesDir}/**/*.xml`)
  const allComponents = [...pageXml, ...componentXml]

  const defaultRestartGlobs = [
    `${root}/**/*.[jt]s`,
    `${root}/**/*.xml`,
    `${root}/**/*.html`,
    `${root}/**/*.css`,
    `${root}/**/*.scss`
  ]

  let _outDirResolved: string | null = null

  return [
    tsconfigPaths({ root: process.cwd() }) as Plugin,
    ViteRestart({
      restart: [...defaultRestartGlobs, ...restartGlobs]
    }) as Plugin,
    {
      name: 'metaowl:define',
      config(cfg, { mode }) {
        dotenvConfig()

        const isDev = mode === 'development'

        const { envPrefix } = options
        const safeEnv = Object.fromEntries(
          Object.entries(process.env).filter(([k]) =>
            k === 'NODE_ENV' || (envPrefix && k.startsWith(envPrefix))
          )
        )

        cfg.define = {
          ...(cfg.define ?? {}),
          DEV_MODE: isDev,
          COMPONENTS: JSON.stringify(allComponents),
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
            input: resolve(process.cwd(), root, 'index.html'),
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
          entries: [
            `${componentsDir}/**/*.[jt]s`,
            `${pagesDir}/**/*.[jt]s`
          ],
          ...(cfg.optimizeDeps ?? {})
        }
      },
      configResolved(resolvedConfig) {
        _outDirResolved = resolve(resolvedConfig.root, resolvedConfig.build.outDir)
      }
    },
    {
      name: 'metaowl:app',
      transform(code, id) {
        if (!id.endsWith('/metaowl.js')) return
        const pagesRel = pagesDir.replace(new RegExp(`^${root}[\\\\/]`), '')
        return {
          code: code.replace(
            /boot\(\s*\)/,
            `boot(import.meta.glob('./${pagesRel}/**/*.js', { eager: true }))`
          ),
          map: null
        }
      }
    },
    {
      name: 'metaowl:styles',
      transform(code, id) {
        if (!id.endsWith('/css.js')) return
        const compRel = componentsDir.replace(new RegExp(`^${root}[\\\\/]`), '')
        const pagesRel = pagesDir.replace(new RegExp(`^${root}[\\\\/]`), '')
        return {
          code: code + '\n' +
            `import.meta.glob('/${compRel}/**/*.{css,scss}', { eager: true })\n` +
            `import.meta.glob('/${pagesRel}/**/*.{css,scss}', { eager: true })\n`,
          map: null
        }
      }
    },
    {
      name: 'metaowl:copy-assets',
      apply: 'build',
      closeBundle() {
        if (!_outDirResolved) return
        const projectRoot = process.cwd()

        const xmlFiles = globSync([`${componentsDir}/**/*.xml`, `${pagesDir}/**/*.xml`])
        for (const xmlFile of xmlFiles) {
          const relPath = xmlFile.replace(new RegExp(`^${root}[\\\\/]`), '')
          const dest = resolve(_outDirResolved, relPath)
          mkdirSync(dirname(dest), { recursive: true })
          copyFileSync(resolve(projectRoot, xmlFile), dest)
        }

        const srcImages = resolve(projectRoot, root, 'assets', 'images')
        if (existsSync(srcImages)) {
          cpSync(srcImages, resolve(_outDirResolved, 'assets', 'images'), { recursive: true })
        }
      }
    }
  ]
}

export interface MetaowlConfigOptions extends MetaowlPluginOptions {
  server?: UserConfig['server']
  preview?: UserConfig['preview']
  build?: UserConfig['build']
}

export function metaowlConfig(options: MetaowlConfigOptions = {}): UserConfig {
  const { server, preview, build, ...metaowlOptions } = options
  return {
    server: { port: 3000, strictPort: true, host: true, ...server },
    preview: { port: 4173, strictPort: true, ...preview },
    ...(build ? { build } : {}),
    plugins: [...metaowlPlugin(metaowlOptions)]
  }
}
