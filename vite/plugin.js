import { fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'
import { mkdirSync, copyFileSync, cpSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { globSync } from 'glob'
import { config as dotenvConfig } from 'dotenv'
import ViteRestart from 'vite-plugin-restart'
import tsconfigPaths from 'vite-tsconfig-paths'

const require = createRequire(import.meta.url)

function resolveOwlPath() {
  return require.resolve('@odoo/owl/dist/owl.es.js', {
    paths: [process.cwd(), dirname(fileURLToPath(import.meta.url))]
  })
}

/**
 * Collect all .xml files from a directory glob and return them as
 * URL-style paths (e.g. /components/Header/Header.xml).
 *
 * @param {string} globPattern - e.g. 'src/components/**\/*.xml'
 * @returns {string[]}
 */
function collectXml(globPattern) {
  return globSync(globPattern).map(p => p.replace(/^src[\\/]/, '/'))
}

/**
 * metaowl Vite plugin.
 *
 * @param {object} [options]
 * @param {string} [options.root='src'] - Vite root directory.
 * @param {string} [options.outDir='../dist'] - Build output directory.
 * @param {string} [options.publicDir='../public'] - Public assets directory.
 * @param {string} [options.componentsDir='src/components'] - OWL components directory.
 * @param {string} [options.pagesDir='src/pages'] - OWL pages directory.
 * @param {string} [options.layoutsDir='src/layouts'] - OWL layouts directory.
 * @param {string[]} [options.restartGlobs] - Additional globs that trigger dev-server restart.
 * @param {string} [options.frameworkEntry] - Framework entry for manual chunk.
 * @param {string[]} [options.vendorPackages] - npm packages bundled into the vendor chunk.
 * @param {string} [options.envPrefix] - Only expose env vars with this prefix (plus NODE_ENV) via process.env.
 * @param {object} [options.autoImport] - Enable component auto-import
 * @param {boolean} [options.autoImport.enabled=false] - Enable auto-import
 * @param {string} [options.autoImport.pattern='*.js'] - Glob pattern for components
 * @returns {import('vite').Plugin[]}
 */
export async function metaowlPlugin(options = {}) {
  const {
    root = 'src',
    outDir = '../dist',
    publicDir = '../public',
    componentsDir = 'src/components',
    pagesDir = 'src/pages',
    layoutsDir = 'src/layouts',
    restartGlobs = [],
    frameworkEntry = './node_modules/metaowl/index.js',
    vendorPackages = ['@odoo/owl'],
    autoImport = {},
    envPrefix
  } = options

  const componentXml = collectXml(`${componentsDir}/**/*.xml`)
  const pageXml = collectXml(`${pagesDir}/**/*.xml`)
  const layoutXml = collectXml(`${layoutsDir}/**/*.xml`)
  const allComponents = [...pageXml, ...componentXml, ...layoutXml]

  const defaultRestartGlobs = [
    `${root}/**/*.[jt]s`,
    `${root}/**/*.xml`,
    `${root}/**/*.html`,
    `${root}/**/*.css`,
    `${root}/**/*.scss`
  ]

  let _outDirResolved = null

  // Generate auto-import d.ts for components
  const autoImportDtsPath = resolve(process.cwd(), '.metaowl', 'components.d.ts')
  let autoImportPlugin = null

  if (autoImport.enabled) {
    const { generateComponentDts, scanComponents } = await import('../modules/auto-import.js')
    const components = await scanComponents(componentsDir, { pattern: autoImport.pattern || '*.js' })

    // Ensure .metaowl directory exists
    const metaowlDir = dirname(autoImportDtsPath)
    if (!existsSync(metaowlDir)) {
      mkdirSync(metaowlDir, { recursive: true })
    }

    await generateComponentDts(components, autoImportDtsPath)

    autoImportPlugin = {
      name: 'metaowl:auto-import',
      enforce: 'pre',
      configResolved() {
        // Components are scanned at startup
      },
      handleHotUpdate({ file }) {
        // Rescan when component files change
        if (file.startsWith(resolve(componentsDir)) && file.endsWith('.js')) {
          scanComponents(componentsDir, { pattern: autoImport.pattern || '*.js' }).then(comps => {
            generateComponentDts(comps, autoImportDtsPath)
          })
        }
      }
    }
  }

  const plugins = [
    ...(autoImportPlugin ? [autoImportPlugin] : []),
    tsconfigPaths({ root: process.cwd() }),
    ViteRestart({
      restart: [...defaultRestartGlobs, ...restartGlobs]
    }),
    {
      name: 'metaowl:define',
      config(cfg, { mode }) {
        // Load .env file from project root
        dotenvConfig()

        const isDev = mode === 'development'

        // Expose only NODE_ENV + vars matching the configured prefix.
        // Never expose the full system env to avoid leaking secrets.
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
          entries: [
            `${componentsDir}/**/*.[jt]s`,
            `${pagesDir}/**/*.[jt]s`,
            `${layoutsDir}/**/*.[jt]s`
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
        const pagesRel = pagesDir.replace(new RegExp(`^${root}[\\/]`), '')
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
        const projectRoot = process.cwd()

        // Copy OWL XML templates (loaded at runtime via fetch — not processed by Vite)
        const xmlFiles = globSync([`${componentsDir}/**/*.xml`, `${pagesDir}/**/*.xml`, `${layoutsDir}/**/*.xml`])
        for (const xmlFile of xmlFiles) {
          const relPath = xmlFile.replace(new RegExp(`^${root}[\\/]`), '')
          const dest = resolve(_outDirResolved, relPath)
          mkdirSync(dirname(dest), { recursive: true })
          copyFileSync(resolve(projectRoot, xmlFile), dest)
        }

        // Copy assets/images (referenced via absolute URLs in XML — not processed by Vite)
        const srcImages = resolve(projectRoot, root, 'assets', 'images')
        if (existsSync(srcImages)) {
          cpSync(srcImages, resolve(_outDirResolved, 'assets', 'images'), { recursive: true })
        }
      }
    }
  ]

  return plugins
}

/**
 * Convenience wrapper that returns a complete Vite config with metaowl defaults.
 * All options except `server`, `preview` and `build` are forwarded to metaowlPlugin().
 *
 * Usage in vite.config.js:
 *
 *   import { metaowlConfig } from 'metaowl/vite'
 *   export default async () => {
 *     return metaowlConfig({
 *       server: { port: 3333 },
 *       preview: { port: 8095 },
 *       envPrefix: 'MY_',
 *       vendorPackages: ['@odoo/owl', 'apexcharts']
 *     })
 *   }
 *
 * @param {object} [options]
 * @param {object} [options.server]  - Vite server config overrides (merged with defaults).
 * @param {object} [options.preview] - Vite preview config overrides (merged with defaults).
 * @param {object} [options.build]   - Vite build config overrides.
 * @param {*}      [options.*]       - All other options forwarded to metaowlPlugin().
 * @returns {import('vite').UserConfig}
 */
export async function metaowlConfig(options = {}) {
  const { server, preview, build, ...metaowlOptions } = options
  const plugins = await metaowlPlugin(metaowlOptions)
  return {
    server: { port: 3000, strictPort: true, host: true, ...server },
    preview: { port: 4173, strictPort: true, ...preview },
    ...(build ? { build } : {}),
    plugins
  }
}
