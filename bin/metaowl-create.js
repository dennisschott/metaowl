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

// --- .cursorrules ---
write('.cursorrules',
`# MetaOwl Project Rules

## Framework Overview
This is a MetaOwl application - a lightweight meta-framework for Odoo OWL built on top of Vite.

## Key Concepts

### File-Based Routing
- Pages in src/pages/ automatically become routes
- Directory structure mirrors URL structure
- Dynamic routes use [param] syntax
- Index directories map to /

### Components
- Use OWL (Odoo Web Library) component model
- Templates defined in .xml files with same name
- CSS scoped to component in .css files
- Import components from @components/* alias

### State Management
- Store: Use Store.define() for Pinia-like stores
- Cache: localStorage wrapper via Cache class
- Meta: Document head management via Meta.* helpers

### Routing & Navigation
- File-based routing via pages/ directory
- Navigation guards via router.beforeEach()
- Dynamic routes with [id], [slug?], [...path]

## Code Conventions
- Use static template property: static template = 'TemplateName'
- Use static components property for child components
- Use setup() lifecycle hook for initialization
- Import from 'metaowl' for framework utilities

## File Structure
- pages/ - Route components
- components/ - Reusable components  
- layouts/ - Page layouts (optional)
- metaowl.js - App entry point

## Common Patterns
- API calls: Fetch.url('/api/endpoint')
- State: store.commit('mutation', payload)
- Meta tags: Meta.title('Page Title')
- Routing: router.push('/path')

## Documentation
- See README.md for full API reference
- See metaowl module docs for detailed API
`)

// --- CLAUDE.md ---
write('CLAUDE.md',
`# ${name} - MetaOwl Project

## Quick Start for Claude Code

This project uses MetaOwl, a meta-framework for Odoo OWL on Vite.

### Architecture
- **Frontend**: OWL (Odoo Web Library) - reactive components
- **Build Tool**: Vite with MetaOwl plugin
- **Routing**: File-based (pages/ directory)
- **State**: Store pattern with mutations/actions

### Key Files
\`\`\`
src/
├── metaowl.js          # App bootstrap
├── pages/              # Route components (file-based routing)
│   └── index/
│       ├── Index.js    # Page component
│       ├── Index.xml   # OWL template
│       └── index.css   # Scoped styles
├── components/         # Reusable components
│   ├── AppHeader/
│   └── AppFooter/
└── css.js              # Global styles
\`\`\`

### Development Commands
- \`npm run dev\` - Start dev server
- \`npm run build\` - Production build
- \`npm run generate\` - Static site generation
- \`npm run lint\` - Lint with Prettier + ESLint

### OWL Component Pattern
\`\`\`javascript
import { Component } from '@odoo/owl'
import { Meta, Store } from 'metaowl'

export default class MyPage extends Component {
  static template = 'MyPage'
  static components = { ChildComponent }
  
  setup() {
    // Lifecycle hook
    Meta.title('Page Title')
  }
}
\`\`\`

### Store Pattern
\`\`\`javascript
const useCounterStore = Store.define('counter', {
  state: () => ({ count: 0 }),
  mutations: {
    increment: (state) => state.count++
  },
  actions: {
    async fetchData({ commit }) { }
  }
})

// In component:
const store = useCounterStore()
store.commit('increment')
\`\`\`

### Navigation Guard Pattern
\`\`\`javascript
import { router } from 'metaowl'

router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth && !isLoggedIn) {
    next('/login')
  } else {
    next()
  }
})
\`\`\`

### Dynamic Routes
- File: pages/user/[id]/User.js → URL: /user/:id
- File: pages/blog/[slug]/Blog.js → URL: /blog/:slug
- File: pages/[...path]/NotFound.js → URL: /:path(.*)

### API Requests
\`\`\`javascript
import { Fetch } from 'metaowl'

const data = await Fetch.url('/api/users', 'GET')
const result = await Fetch.url('/api/users', 'POST', { name: 'John' })
\`\`\`

### Meta Tags
\`\`\`javascript
import { Meta } from 'metaowl'

Meta.title('Page Title')
Meta.description('Page description')
Meta.ogTitle('Social Title')
Meta.canonical('https://example.com/page')
\`\`\`

### Best Practices
1. Keep components small and focused
2. Use stores for shared state
3. Use Meta helpers for SEO
4. Leverage file-based routing
5. Scope CSS to components
6. Use navigation guards for auth

### Common Gotchas
- Templates must match t-name attribute exactly
- File-based routing uses directory name, not file name
- OWL uses xml templates, not JSX
- Static properties are required (template, components)
`)

// --- llms.txt ---
write('llms.txt',
`# MetaOwl LLM Context

## Framework Identity
MetaOwl is a lightweight meta-framework for Odoo OWL (Odoo Web Library) applications, built on Vite. It provides file-based routing, state management, and app mounting.

## Core Concepts

### OWL (Odoo Web Library)
- Reactive component framework
- XML-based templates (not JSX)
- Class-based components with static properties
- Lifecycle: setup(), willStart(), mounted(), etc.

### File-Based Routing
Convention: 
- pages/index/Index.js → /
- pages/about/About.js → /about  
- pages/user/[id]/User.js → /user/:id
- pages/[...404]/NotFound.js → catch-all

### Project Structure
${name}/
├── src/
│   ├── metaowl.js          # App entry
│   ├── index.html          # HTML shell
│   ├── css.js              # Global styles
│   ├── pages/              # Route components
│   │   └── index/
│   │       ├── Index.js
│   │       ├── Index.xml
│   │       └── index.css
│   ├── components/         # Shared components
│   │   ├── AppHeader/
│   │   └── AppFooter/
│   └── layouts/            # Page layouts (optional)
├── vite.config.js
└── package.json

## API Reference

### boot(routes)
Mounts app to #metaowl element.
\`\`\`javascript
import { boot } from 'metaowl'
boot() // auto file-based routing
\`\`\`

### Fetch
HTTP client with base URL.
\`\`\`javascript
Fetch.configure({ baseUrl: '/api' })
await Fetch.url('/users', 'GET')
await Fetch.url('/users', 'POST', data)
\`\`\`

### Cache
localStorage wrapper.
\`\`\`javascript
await Cache.set('key', value)
const value = await Cache.get('key')
\`\`\`

### Store
State management.
\`\`\`javascript
const useStore = Store.define('store', {
  state: () => ({ count: 0 }),
  getters: { double: (s) => s.count * 2 },
  mutations: { inc: (s) => s.count++ },
  actions: { async fetch({ commit }) {} }
})
\`\`\`

### Meta
Document head management.
\`\`\`javascript
Meta.title('Title')
Meta.description('Desc')
Meta.ogTitle('Social Title')
\`\`\`

### router
Navigation guards and helpers.
\`\`\`javascript
router.beforeEach((to, from, next) => next())
router.push('/path')
router.back()
\`\`\`

## Component Template
\`\`\`javascript
import { Component } from '@odoo/owl'
import { Meta } from 'metaowl'

export default class ComponentName extends Component {
  static template = 'ComponentName'
  static components = { /* child components */ }
  
  setup() {
    // Initialize
    Meta.title('Page')
  }
}
\`\`\`

## Template Format (XML)
\`\`\`xml
<templates>
  <t t-name="ComponentName">
    <div class="component">
      <ChildComponent />
      <span t-esc="someValue" />
    </div>
  </t>
</templates>
\`\`\`

## CLI Commands
- metaowl-create - Scaffold project
- metaowl-dev - Dev server
- metaowl-build - Production build  
- metaowl-generate - SSG
- metaowl-lint - Linting

## See Also
- README.md - Full documentation
- https://github.com/odoo/owl - OWL framework
- https://vitejs.dev - Vite documentation
`)

// --- .github/copilot-instructions.md ---
write('.github/copilot-instructions.md',
`# GitHub Copilot Instructions for MetaOwl

## About This Project
This is a MetaOwl application - a lightweight meta-framework for Odoo OWL (Odoo Web Library) built on Vite.

## Framework Overview

### OWL Components
- Class-based components extending Component from '@odoo/owl'
- Templates defined in separate .xml files
- CSS scoped to component in .css files
- Static properties: template, components
- Lifecycle: setup(), willStart(), mounted(), willUnmount()

### File-Based Routing
- src/pages/ directory structure maps to URLs
- pages/index/Index.js → /
- pages/about/About.js → /about
- pages/user/[id]/User.js → /user/:id (dynamic)
- pages/[...path]/NotFound.js → catch-all

### State Management
Use Store for application state:
\`\`\`javascript
const useStore = Store.define('storeName', {
  state: () => ({ count: 0 }),
  getters: { double: (state) => state.count * 2 },
  mutations: { increment: (state) => state.count++ },
  actions: { async fetch({ commit }) {} }
})
\`\`\`

### Common Tasks

When generating components:
1. Create .js file with Component class
2. Create matching .xml file with template
3. Create .css file for scoped styles
4. Update parent component's static components

When adding pages:
1. Create directory in src/pages/
2. Add Page.js, Page.xml, page.css
3. Route is auto-generated from directory name

When using stores:
1. Define store with Store.define()
2. Use in component: const store = useStore()
3. Read state: store.state.property
4. Call mutations: store.commit('mutationName', payload)
5. Call actions: await store.dispatch('actionName', payload)

When setting meta tags:
1. Import { Meta } from 'metaowl'
2. Call in setup(): Meta.title('Title')

### Code Patterns

**New Page Component:**
\`\`\`javascript
// pages/Feature/Feature.js
import { Component } from '@odoo/owl'
import { Meta } from 'metaowl'

export default class Feature extends Component {
  static template = 'Feature'
  
  setup() {
    Meta.title('Feature Page')
  }
}
\`\`\`

**New Child Component:**
\`\`\`javascript
// components/MyComponent/MyComponent.js
import { Component } from '@odoo/owl'

export default class MyComponent extends Component {
  static template = 'MyComponent'
}
\`\`\`

**Navigation Guard:**
\`\`\`javascript
// In metaowl.js
import { router } from 'metaowl'

router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth && !isLoggedIn) {
    next('/login')
  } else {
    next()
  }
})
\`\`\`

## File Conventions
- Component class names: PascalCase
- Template names: match class name
- CSS classes: kebab-case
- Store names: camelCase
- Page components: default export

## Do Not
- Use JSX (OWL uses XML templates)
- Import React or Vue
- Modify prototype-based inheritance
- Use JSX-style event handlers (onclick -> t-on-click)

## Do
- Use OWL's reactive system
- Follow file-based routing conventions
- Scope CSS to components
- Use Meta helpers for SEO
- Leverage Store for shared state
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
