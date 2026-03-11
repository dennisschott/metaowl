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
function write(filePath: string, content: string): void {
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
    <script type="module" src="./metaowl.js"></script>
  </body>
</html>
`)

// --- src/metaowl.js ---
write('src/metaowl.js',
`import { boot } from 'metaowl'
import './css.js'

boot()
`)

// --- src/css.js ---
write('src/css.js',
`// Base styles
import './css/main.css'
`)

// --- src/css/main.css ---
write('src/css/main.css',
`/* Base styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: system-ui, -apple-system, sans-serif;
}
`)

// --- src/pages/index/Index.js ---
write('src/pages/index/Index.js',
`import { Component, xml } from '@odoo/owl'
import { Meta } from 'metaowl'

Meta.title('Home')

export class IndexPage extends Component {
  static template = xml\`
    <div class="p-8">
      <h1 class="text-2xl font-bold">Welcome to ${name}</h1>
      <p class="mt-4 text-gray-600">Your metaowl app is ready!</p>
    </div>
  \`
}
`)

console.log()
success(`Project "${name}" created`)
console.log()
console.log(`  To get started:`)
console.log(`    cd ${name}`)
console.log(`    npm install`)
console.log(`    npm run dev`)
console.log()
