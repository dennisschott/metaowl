#!/usr/bin/env node
/**
 * metaowl create — scaffold a new metaowl project.
 *
 * Usage:
 *   metaowl-create [project-name]
 *
 * If no name is given, it will be prompted interactively.
 */
import { createInterface } from 'node:readline/promises'
import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, join, dirname } from 'node:path'
import { banner, step, success, failure, version } from './utils.js'

banner('create')

// --- Project name ---
let name = process.argv[2]?.trim()

if (!name) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  name = (await rl.question('  Project name: ')).trim()
  rl.close()
  console.log()
}

if (!name || !/^[a-zA-Z0-9_-]+$/.test(name)) {
  failure('Invalid project name. Use only letters, numbers, hyphens, or underscores.')
  process.exit(1)
}

const dest = resolve(process.cwd(), name)

if (existsSync(dest)) {
  failure(`Directory "${name}" already exists.`)
  process.exit(1)
}

step(`Scaffolding project "${name}"...`)
console.log()

// --- File writer helper ---
function write(filePath, content) {
  const abs = join(dest, filePath)
  mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, content, 'utf-8')
  console.log(`    ${filePath}`)
}

// --- package.json ---
write('package.json', JSON.stringify({
  name,
  version: '0.1.0',
  type: 'module',
  scripts: {
    dev: 'metaowl-dev',
    build: 'metaowl-build',
    generate: 'metaowl-generate',
    lint: 'metaowl-lint'
  },
  dependencies: {
    metaowl: `^${version}`
  }
}, null, 2) + '\n')

// --- vite.config.js ---
write('vite.config.js',
`import { metaowlConfig } from 'metaowl/vite'

export default metaowlConfig({
  componentsDir: 'src/components',
  pagesDir: 'src/pages'
})
`)

// --- eslint.config.js ---
write('eslint.config.js',
`import { eslintConfig } from 'metaowl/eslint'

export default eslintConfig
`)

// --- postcss.config.cjs ---
write('postcss.config.cjs',
`const { createPostcssConfig } = require('metaowl/postcss')

module.exports = createPostcssConfig()
`)

// --- jsconfig.json ---
write('jsconfig.json', JSON.stringify({
  extends: './node_modules/metaowl/config/jsconfig.base.json',
  compilerOptions: {
    baseUrl: '.',
    paths: {
      '@pages/*': ['src/pages/*'],
      '@components/*': ['src/components/*']
    }
  },
  include: ['src']
}, null, 2) + '\n')

// --- .gitignore ---
write('.gitignore',
`node_modules/
dist/
.env
`)

// --- src/index.html ---
write('src/index.html',
`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${name}</title>
  </head>
  <body>
    <div id="metaowl"></div>
    <script type="module" src="/metaowl.js"></script>
  </body>
</html>
`)

// --- src/metaowl.js ---
write('src/metaowl.js',
`import { boot, Fetch } from 'metaowl'

Fetch.configure({
  baseUrl: import.meta.env.VITE_API_URL ?? ''
})

boot()
`)

// --- src/css.js ---
write('src/css.js',
`// Global styles — import shared CSS here.
// Component and page CSS files are auto-imported by the metaowl Vite plugin.
`)

// --- src/pages/index/Index.js ---
write('src/pages/index/Index.js',
`import { Component } from '@odoo/owl'
import { Meta } from 'metaowl'
import AppHeader from '@components/AppHeader/AppHeader'
import AppFooter from '@components/AppFooter/AppFooter'

export default class Index extends Component {
  static template = 'Index'
  static components = { AppHeader, AppFooter }

  setup() {
    Meta.title('Home — ${name}')
  }
}
`)

// --- src/pages/index/Index.xml ---
write('src/pages/index/Index.xml',
`<templates>
  <t t-name="Index">
    <div class="layout">
      <AppHeader />
      <main class="page page-index">
        <h1>Welcome to ${name}</h1>
      </main>
      <AppFooter />
    </div>
  </t>
</templates>
`)

// --- src/pages/index/index.css ---
write('src/pages/index/index.css',
`.layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.page-index {
  flex: 1;
  padding: 2rem;
}
`)

// --- src/components/AppHeader/AppHeader.js ---
write('src/components/AppHeader/AppHeader.js',
`import { Component } from '@odoo/owl'

export default class AppHeader extends Component {
  static template = 'AppHeader'
}
`)

// --- src/components/AppHeader/AppHeader.xml ---
write('src/components/AppHeader/AppHeader.xml',
`<templates>
  <t t-name="AppHeader">
    <header class="app-header">
      <span class="app-header__logo">${name}</span>
    </header>
  </t>
</templates>
`)

// --- src/components/AppHeader/AppHeader.css ---
write('src/components/AppHeader/AppHeader.css',
`.app-header {
  display: flex;
  align-items: center;
  padding: 0 1.5rem;
  height: 56px;
  border-bottom: 1px solid #e5e7eb;
}

.app-header__logo {
  font-weight: 600;
  font-size: 1.1rem;
}
`)

// --- src/components/AppFooter/AppFooter.js ---
write('src/components/AppFooter/AppFooter.js',
`import { Component } from '@odoo/owl'

export default class AppFooter extends Component {
  static template = 'AppFooter'
}
`)

// --- src/components/AppFooter/AppFooter.xml ---
write('src/components/AppFooter/AppFooter.xml',
`<templates>
  <t t-name="AppFooter">
    <footer class="app-footer">
      <span>Built with metaowl</span>
    </footer>
  </t>
</templates>
`)

// --- src/components/AppFooter/AppFooter.css ---
write('src/components/AppFooter/AppFooter.css',
`.app-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  font-size: 0.85rem;
  color: #6b7280;
  border-top: 1px solid #e5e7eb;
}
`)

// --- Done ---
console.log()
success(`Project "${name}" ready`)
console.log()
console.log('  Next steps:')
console.log()
console.log(`    cd ${name}`)
console.log(`    npm install`)
console.log(`    npm run dev`)
console.log()
