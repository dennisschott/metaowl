# metaowl

> A lightweight meta-framework for [Odoo OWL](https://github.com/odoo/owl), built on top of [Vite](https://vitejs.dev).

[![npm version](https://img.shields.io/npm/v/metaowl.svg)](https://www.npmjs.com/package/metaowl)
[![License: LGPL v3](https://img.shields.io/badge/License-LGPL_v3-blue.svg)](LICENSE)
[![Node.js >=18](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org)
[![GitHub Issues](https://img.shields.io/github/issues/dennisschott/metaowl.svg)](https://github.com/dennisschott/metaowl/issues)

metaowl gives you everything you need to ship production-ready OWL applications — file-based routing, app mounting, a fetch helper, `localStorage` cache, meta tag management, an SSG generator, and a batteries-included Vite plugin — so you can focus on building components instead of wiring infrastructure.

---

## Table of Contents

- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Create a New Project](#create-a-new-project)
- [Manual Setup](#manual-setup)
- [File-based Routing](#file-based-routing)
  - [Dynamic Routes](#dynamic-routes)
- [Layouts](#layouts)
- [Navigation Guards](#navigation-guards)
- [State Management](#state-management-store)
- [CLI Reference](#cli-reference)
- [API Reference](#api-reference)
  - [boot](#bootroutes)
  - [Fetch](#fetch)
  - [Cache](#cache)
  - [Meta](#meta)
  - [configureOwl](#configureowlconfig)
  - [buildRoutes](#buildroutesmodules)
  - [Store](#store)
  - [Layouts API](#layouts-api)
  - [Router Guards](#router-guards-api)
- [Vite Plugin](#vite-plugin)
  - [metaowlPlugin](#metaowlpluginoptions)
  - [metaowlConfig](#metaowlconfigoptions)
- [ESLint Config](#eslint-config)
- [PostCSS Config](#postcss-config)
- [TypeScript / jsconfig](#typescript--jsconfig)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- **File-based routing** — mirrors Nuxt/Next.js conventions out of the box
- **Dynamic routes** — support for parameters `[id]`, optional params `[id]?`, and catch-all `[...path]`
- **Layouts** — share page structures across routes with automatic layout resolution
- **Navigation guards** — route middleware for authentication, authorization, and redirects
- **State management** — Pinia-like store system with mutations, actions, and getters
- **App mounting** — zero-config OWL component mounting with template merging
- **Fetch helper** — thin wrapper around the Fetch API with a configurable base URL and error handler
- **Cache** — async-style `localStorage` wrapper (`get`, `set`, `remove`, `clear`, `keys`)
- **Meta tags** — programmatic control over `<title>`, Open Graph, Twitter Card, canonical, and more
- **SSG generator** — statically pre-renders HTML pages with correct meta tags at build time
- **Vite plugin** — handles `COMPONENTS` injection, XML template copying, CSS auto-import, chunk splitting, and env filtering
- **ESLint & PostCSS** — shareable configs included; no extra dev-dependencies needed in your project

---

## Requirements

| Dependency | Version |
|---|---|
| Node.js | `>=18` |
| `@odoo/owl` | bundled |

---

## Installation

```bash
npm install metaowl
```

`@odoo/owl` is bundled with metaowl and resolved automatically — no separate installation required.

---

## Create a New Project

Install metaowl globally and run it interactively:

```bash
npm install -g metaowl
metaowl-create my-app
```

This generates a ready-to-run project:

```
my-app/
├── package.json
├── vite.config.js
├── eslint.config.js
├── postcss.config.cjs
├── jsconfig.json
├── .gitignore
└── src/
    ├── index.html
    ├── metaowl.js
    ├── css.js
    ├── components/
    │   ├── AppHeader/
    │   │   ├── AppHeader.js
    │   │   ├── AppHeader.xml
    │   │   └── AppHeader.css
    │   └── AppFooter/
    │       ├── AppFooter.js
    │       ├── AppFooter.xml
    │       └── AppFooter.css
    └── pages/
        └── index/
            ├── Index.js
            ├── Index.xml
            └── index.css
```

Then:

```bash
cd my-app
npm install
npm run dev
```

---

## Manual Setup

### 1. `vite.config.js`

Use the convenience wrapper for a sensible default configuration:

```js
import { metaowlConfig } from 'metaowl/vite'

export default metaowlConfig({
  componentsDir: 'src/owl/components',
  pagesDir: 'src/owl/pages',
  server:  { port: 3000 },
  preview: { port: 4173 }
})
```

Or compose the plugin into your own config:

```js
import { defineConfig } from 'vite'
import { metaowlPlugin } from 'metaowl/vite'

export default defineConfig({
  plugins: [
    metaowlPlugin({
      componentsDir: 'src/owl/components',
      pagesDir: 'src/owl/pages'
    })
  ]
})
```

### 2. `src/metaowl.js`

```js
import { boot, Fetch } from 'metaowl'

Fetch.configure({
  baseUrl: import.meta.env.VITE_API_URL ?? ''
})

// File-based routing — boot() with no args is the recommended convention.
// The metaowl Vite plugin expands it to import.meta.glob at build time.
boot()

// — or — manual route table
// import routes from './routes.js'
// boot(routes)
```

### 3. `src/index.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>My App</title>
  </head>
  <body>
    <div id="metaowl"></div>
    <script type="module" src="/metaowl.js"></script>
  </body>
</html>
```

---

## File-based Routing

Pages placed in `pagesDir` are automatically mapped to URL paths using the same conventions as Nuxt and Next.js:

| File | URL |
|---|---|
| `pages/index/Index.js` | `/` |
| `pages/about/About.js` | `/about` |
| `pages/blog/post/Post.js` | `/blog/post` |

**Rules:**
- The *directory* path relative to `pages/` becomes the URL segment.
- A top-level directory named `index` maps to `/`.
- The component must be the `default` export, or the first function export in the module.

Enable file-based routing by passing `import.meta.glob` to `boot()`:

```js
boot(import.meta.glob('./pages/**/*.js', { eager: true }))
```

SSG path variants (`.html`, trailing slash, `index.html`) are added automatically so your builds work with any static host.

---

### Dynamic Routes

File-based routing supports dynamic segments using bracket notation. The router supports required parameters, optional parameters, and catch-all routes.

| File | URL Pattern | Example URL | Params |
|---|---|---|---|
| `pages/user/[id]/User.js` | `/user/:id` | `/user/123` | `{ id: '123' }` |
| `pages/product/[category]/[slug]/Product.js` | `/product/:category/:slug` | `/product/tech/hello` | `{ category: 'tech', slug: 'hello' }` |
| `pages/blog/[id]/[slug?]/Blog.js` | `/blog/:id/:slug?` | `/blog/123` or `/blog/123/my-post` | `{ id: '123' }` or `{ id: '123', slug: 'my-post' }` |
| `pages/docs/[...path]/Docs.js` | `/docs/:path(.*)` | `/docs/api/routing` | `{ path: 'api/routing' }` |
| `pages/[...404]/NotFound.js` | `/:path(.*)` | `/any/unknown/path` | `{ path: 'any/unknown/path' }` |

**Param Types:**

- `[param]` — Required parameter, must be present in URL
- `[param?]` — Optional parameter, may be omitted
- `[...param]` — Catch-all parameter, matches any number of segments

Access parameters in your component:

```js
import { Component, xml } from '@odoo/owl'

export class UserPage extends Component {
  static template = xml`
    <div>
      <h1>User Profile</h1>
      <p>ID: <t t-esc="props.params.id"/></p>
    </div>
  `
  
  static props = ['params']
}
```

---

## Layouts

Layouts provide shared page structures. Create a `layouts/` directory alongside your `pages/`:

```
src/
  layouts/
    default/
      DefaultLayout.js
      DefaultLayout.xml
    admin/
      AdminLayout.js
      AdminLayout.xml
  pages/
    index/
      Index.js  → uses 'default' layout
    admin/
      dashboard/
        Dashboard.js  → can use 'admin' layout
```

Use a layout by setting the static `layout` property:

```js
export class DashboardPage extends Component {
  static template = 'DashboardPage'
  static layout = 'admin'
}
```

If no layout is specified, the `default` layout is used automatically.

**Layout Template Convention:**

```xml
<templates>
  <t t-name="DefaultLayout">
    <div class="layout-default">
      <header>The Header</header>
      <main>
        <t t-slot="default"/>
      </main>
      <footer>The Footer</footer>
    </div>
  </t>
</templates>
```

---

## Navigation Guards

Navigation guards intercept route navigation and can:
- Block access to routes
- Redirect to other routes
- Perform async checks (authentication, permissions)

### Global Guards

```js
import { beforeEach, afterEach } from 'metaowl'

// Run before navigation
beforeEach((to, from, next) => {
  const auth = useAuthStore()
  
  if (to.meta.requiresAuth && !auth.state.loggedIn) {
    next('/login')  // redirect
  } else {
    next()  // proceed
  }
})

// Run after navigation
afterEach((to, from) => {
  console.log(`Navigated to ${to.path}`)
})
```

### Per-Route Guards

```js
export class AdminPage extends Component {
  static route = {
    path: '/admin',
    meta: { requiresAuth: true, role: 'admin' },
    beforeEnter: (to, from, next) => {
      // Check specific permissions
      if (!hasAdminRole()) {
        next('/unauthorized')
      } else {
        next()
      }
    }
  }
}
```

**Guard Behavior:**

- `next()` — proceed to next guard
- `next(false)` — abort navigation
- `next('/path')` — redirect to path
- `next(error)` — abort with error

---

## State Management (Store)

A Pinia-inspired store system with mutations, actions, and getters.

```js
import { Store } from 'metaowl'

const useUserStore = Store.define('user', {
  state: () => ({
    name: '',
    loggedIn: false
  }),
  
  getters: {
    displayName: (state) => state.name || 'Guest'
  },
  
  mutations: {
    setName: (state, name) => { state.name = name },
    setLoggedIn: (state, value) => { state.loggedIn = value }
  },
  
  actions: {
    async login({ commit }, credentials) {
      const result = await Fetch.url('/api/login', 'POST', credentials)
      commit('setName', result.name)
      commit('setLoggedIn', true)
      return result
    },
    
    logout({ commit }) {
      commit('setName', '')
      commit('setLoggedIn', false)
    }
  }
})
```

**In a component:**

```js
const store = useUserStore()

store.commit('setName', 'John')  // synchronous mutation
await store.dispatch('login', { email, password })  // async action
console.log(store.getters.displayName.value)  // computed getter
```

**Persistence:**

```js
import { Store, createPersistencePlugin } from 'metaowl'

// Automatically persist state to localStorage
Store.use(createPersistencePlugin({
  storage: localStorage,
  paths: ['user', 'preferences']  // only persist specific paths
}))
```

---

## CLI Reference

metaowl ships four CLI commands that use its own bundled Vite, Prettier, and ESLint binaries — no need to install them separately in your project.

| Command | Description |
|---|---|
| `metaowl-create` | Scaffold a new project interactively |
| `metaowl-dev` | Start the Vite development server |
| `metaowl-build` | Lint then production build (Rollup via Vite) |
| `metaowl-generate` | Lint, build, then SSG — pre-renders every page to static HTML |
| `metaowl-lint` | Run Prettier + ESLint across project source files |

Add them to your `package.json` scripts:

```json
{
  "scripts": {
    "dev":      "metaowl-dev",
    "build":    "metaowl-build",
    "generate": "metaowl-generate",
    "lint":     "metaowl-lint"
  }
}
```

### Configuring lint targets

By default, `metaowl-lint` targets `src/metaowl.js`, `src/css.js`, `src/owl/pages/**`, and `src/owl/components/**`. Override in `package.json`:

```json
{
  "metaowl": {
    "lint": ["src/metaowl.js", "src/pages/**", "src/components/**"]
  }
}
```

### Configuring SSG output

`metaowl-generate` reads `pagesDir` and `outDir` from `package.json`:

```json
{
  "metaowl": {
    "pagesDir": "src/pages",
    "outDir": "dist"
  }
}
```

---

## API Reference

### `boot(routes)`

Resolves the current URL against a route table and mounts the matching OWL component into `#app`.

```ts
boot(routesOrModules: Record<string, object> | RouteDefinition[]): Promise<void>
```

Accepts either:
- An `import.meta.glob` result (file-based routing, recommended)
- A manual array of route objects: `{ name, path: string[], component }`

---

### `Fetch`

A static class wrapping the Fetch API with a shared base URL and error handler.

#### `Fetch.configure(options)`

Call once before `boot()`.

```ts
Fetch.configure({
  baseUrl?: string,   // Prepended to every internal request
  onError?: Function  // Invoked on network errors
})
```

#### `Fetch.url(url, method?, data?, internal?, triggerErrorHandler?)`

```ts
Fetch.url(
  url: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
  data: object | null = null,
  internal: boolean = true,
  triggerErrorHandler: boolean = true
): Promise<any | null>
```

When `internal` is `true` (default), `baseUrl` is prepended to `url`. Returns the parsed JSON response, or `null` on error.

---

### `Cache`

A static async-style `localStorage` wrapper. Values are automatically JSON-serialised.

```ts
Cache.get(key: string): Promise<any>
Cache.set(key: string, value: any): Promise<void>
Cache.remove(key: string): Promise<void>
Cache.clear(): Promise<void>
Cache.keys(): Promise<string[]>
```

---

### `Meta`

Programmatically set document meta tags. Each function is idempotent — the tag is created if it does not already exist.

```ts
import { Meta } from 'metaowl'

Meta.title('My Page')
Meta.description('Page description')
Meta.keywords('owl, odoo, framework')
Meta.author('Jane Doe')
Meta.canonical('https://example.com/page')

// Open Graph
Meta.ogTitle('My Page')
Meta.ogDescription('Page description')
Meta.ogImage('https://example.com/og.png')
Meta.ogUrl('https://example.com/page')

// Twitter Card
Meta.twitterCard('summary_large_image')
Meta.twitterTitle('My Page')
Meta.twitterDescription('Page description')
Meta.twitterImage('https://example.com/og.png')
```

The full list of helpers: `title`, `description`, `keywords`, `author`, `canonical`, `ogTitle`, `ogDescription`, `ogImage`, `ogUrl`, `ogLocale`, `ogImageWidth`, `ogImageHeight`, `twitterCard`, `twitterSite`, `twitterCreator`, `twitterTitle`, `twitterDescription`, `twitterImage`, `twitterImageAlt`, `twitterUrl`, `twitterSiteId`, `twitterCreatorId`.

---

### `configureOwl(config)`

Override the default OWL `mount()` options before calling `boot()`.

```ts
configureOwl(config: Partial<OwlMountConfig>): void
```

**Defaults:**

```js
{
  warnIfNoStaticProps: true,
  willStartTimeout: 10000,
  translatableAttributes: ['title', 'placeholder', 'label', 'alt']
}
```

---

### `buildRoutes(modules)`

Converts an `import.meta.glob` result into a metaowl route table. Called automatically by `boot()` when a glob result is passed.

```ts
buildRoutes(modules: Record<string, object>): RouteDefinition[]
```

---

### `Store`

Pinia-inspired state management system with mutations, actions, and getters.

#### `Store.define(id, config)`

Creates a store factory function.

```ts
const useStore = Store.define('storeId', {
  state: () => ({ count: 0 }),
  getters: { double: (state) => state.count * 2 },
  mutations: { increment: (state) => state.count++ },
  actions: { async fetchData({ commit }) { ... } }
})
```

#### Store Instance Methods

| Method | Description |
|---|---|
| `commit(mutation, payload)` | Execute synchronous mutation |
| `dispatch(action, payload)` | Execute async action |
| `subscribe(callback)` | Listen to mutations `(mutation, state, prevState) => void` |
| `subscribeAction(callback)` | Listen to actions `(action, status, result) => void` |
| `reset()` | Reset state to initial values |

#### `Store.use(plugin)`

Register a global plugin applied to all stores.

```ts
import { Store, createPersistencePlugin } from 'metaowl'

Store.use(createPersistencePlugin({ storage: localStorage }))
```

---

### `Layouts API`

Functions for layout management.

| Function | Description |
|---|---|
| `registerLayout(name, Component)` | Register a layout |
| `getLayout(name)` | Get layout component by name |
| `setDefaultLayout(name)` | Set default layout |
| `resolveLayout(Component, path?)` | Resolve layout for component |
| `subscribeToLayouts(callback)` | Listen to layout events |

**Component Layout Property:**

```js
export class MyPage extends Component {
  static layout = 'admin'  // Use 'admin' layout
}
```

---

### `Router Guards API`

Functions for navigation control.

| Function | Description |
|---|---|
| `beforeEach(guard)` | Register global guard (returns unsubscribe) |
| `afterEach(hook)` | Register global after hook (returns unsubscribe) |
| `getCurrentRoute()` | Get current route object |
| `getPreviousRoute()` | Get previous route object |
| `push(path)` | Navigate to path |
| `replace(path)` | Replace current history entry |
| `back()` / `forward()` / `go(n)` | History navigation |

**Router Singleton:**

```js
import { router } from 'metaowl'

router.beforeEach((to, from, next) => { ... })
router.push('/new-path')
```

---

## Vite Plugin

### `metaowlPlugin(options)`

Returns an array of Vite plugins that configure the full metaowl build pipeline.

| Option | Default | Description |
|---|---|---|
| `root` | `'src'` | Vite root directory |
| `outDir` | `'../dist'` | Build output directory |
| `publicDir` | `'../public'` | Public assets directory |
| `componentsDir` | `'src/components'` | OWL components directory (glob base) |
| `pagesDir` | `'src/pages'` | OWL pages directory (glob base) |
| `vendorPackages` | `['@odoo/owl']` | npm packages bundled into the `vendor` chunk |
| `frameworkEntry` | `'./node_modules/metaowl/index.js'` | Entry for the `framework` chunk |
| `restartGlobs` | `[]` | Additional globs that trigger dev-server restart |
| `envPrefix` | `undefined` | Only expose `process.env` vars with this prefix (plus `NODE_ENV`) |

**What the plugin does:**

- Injects `COMPONENTS` (array of XML template paths) and `DEV_MODE` as global defines
- Filters `process.env` to prevent accidental secret leakage
- Copies OWL XML templates and `assets/images` to the output directory after build
- Auto-imports CSS/SCSS files from `componentsDir` and `pagesDir`
- Configures Rollup chunk splitting (`vendor` + `framework`)
- Resolves `@odoo/owl` to the bundled ES module
- Enables TypeScript path aliases via `vite-tsconfig-paths`

---

### `metaowlConfig(options)`

A convenience wrapper that returns a complete `vite.UserConfig` with sensible defaults.

```js
import { metaowlConfig } from 'metaowl/vite'

export default metaowlConfig({
  componentsDir: 'src/owl/components',
  pagesDir: 'src/owl/pages',
  vendorPackages: ['@odoo/owl', 'apexcharts'],
  envPrefix: 'APP_',
  server:  { port: 3333 },
  preview: { port: 8080 }
})
```

`server`, `preview`, and `build` are applied directly to the Vite config; all other options are forwarded to `metaowlPlugin`.

---

## ESLint Config

metaowl ships a ready-to-use flat ESLint config. No additional ESLint packages are needed in your project.

```js
// eslint.config.js
import { eslintConfig } from 'metaowl/eslint'
export default eslintConfig
```

Extend or override rules:

```js
import { eslintConfig } from 'metaowl/eslint'

export default [
  ...eslintConfig,
  {
    rules: {
      'no-console': 'warn'
    }
  }
]
```

---

## PostCSS Config

metaowl ships a PostCSS config factory that enables [PurgeCSS](https://purgecss.com) in production builds to eliminate unused styles.

```js
// postcss.config.cjs
const { createPostcssConfig } = require('metaowl/postcss')
module.exports = createPostcssConfig()
```

Extend with a custom safelist or additional content globs:

```js
module.exports = createPostcssConfig({
  safelist: [/^my-custom-/, 'another-class'],
  content:  ['./templates/**/*.html']
})
```

PurgeCSS scans `.xml`, `.html`, and `src/**/*.js` files by default.

---

## TypeScript / jsconfig

Extend from the included base configs to get sensible defaults:

**`jsconfig.json`** (JavaScript projects):

```json
{
  "extends": "./node_modules/metaowl/config/jsconfig.base.json",
  "compilerOptions": {
    "baseUrl": "src",
    "paths": {
      "@pages/*": ["owl/pages/*"],
      "@components/*": ["owl/components/*"]
    }
  },
  "include": ["src"]
}
```

**`tsconfig.json`** (TypeScript projects):

```json
{
  "extends": "./node_modules/metaowl/config/tsconfig.base.json",
  "compilerOptions": {
    "baseUrl": "src"
  },
  "include": ["src"]
}
```

---

## Contributing

Contributions are welcome! Please open an issue before submitting a pull request so we can discuss the change.

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Commit your changes following [Conventional Commits](https://www.conventionalcommits.org)
4. Open a pull request

---

## License

[LGPL v3](LICENSE) © [Dennis Schott](https://github.com/dennisschott)
