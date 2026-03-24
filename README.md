# metaowl

> A comprehensive meta-framework for [Odoo OWL](https://github.com/odoo/owl), built on top of [Vite](https://vitejs.dev).

[![npm version](https://img.shields.io/npm/v/metaowl.svg)](https://www.npmjs.com/package/metaowl)
[![License: LGPL v3](https://img.shields.io/badge/License-LGPL_v3-blue.svg)](LICENSE)
[![Node.js >=20](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org)
[![GitHub Issues](https://img.shields.io/github/issues/dennisschott/metaowl.svg)](https://github.com/dennisschott/metaowl/issues)

> ⚠️ **Work in progress:** metaowl is not production-ready yet. APIs may change without notice, and features may still break between releases.

metaowl is a complete solution for building OWL applications with everything you need out of the box:

**Core Infrastructure:** File-based routing with dynamic routes, layout system, navigation guards, Pinia-inspired state management, and zero-config app mounting.

**Odoo Integration:** Full JSON-RPC client with authentication, session management, and CRUD operations.

**Developer Experience:** Composables for common patterns (auth, localStorage, fetching), form handling with validation, error boundaries, and internationalization.

**SEO & PWA:** Sitemap/robots.txt generation, structured data support, service worker integration, web app manifest, and push notifications.

**Testing & Quality:** Mock stores, router mocking, component testing utilities, plus bundled ESLint and PostCSS configs.

All powered by a batteries-included Vite plugin that handles the build pipeline, so you can focus on building components instead of wiring infrastructure.

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
- [Link Component](#link-component)
- [State Management](#state-management-store)
- [Error Boundaries](#error-boundaries)
- [i18n / Internationalization](#i18n--internationalization)
- [Form Handling](#form-handling)
- [Auto-Import](#auto-import)
- [Odoo JSON-RPC Service](#odoo-json-rpc-service)
- [Composables / Hooks](#composables--hooks)
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
  - [Link Component API](#link-component-api)
  - [Error Boundary](#error-boundary-api)
  - [i18n](#i18n-api)
  - [Forms](#forms-api)
  - [OdooService](#odooservice-api)
  - [Composables](#composables-api)
- [Vite Plugin](#vite-plugin)
  - [metaowlPlugin](#metaowlpluginoptions)
  - [metaowlConfig](#metaowlconfigoptions)
- [ESLint Config](#eslint-config)
- [PostCSS Config](#postcss-config)
- [TypeScript / jsconfig](#typescript--jsconfig)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- **File-based routing** — mirrors Nuxt/Next.js conventions out of the box
- **Dynamic routes** — support for parameters `[id]`, optional params `[id]?`, and catch-all `[...path]`
- **Layouts** — share page structures across routes with automatic layout resolution
- **Navigation guards** — route middleware for authentication, authorization, and redirects
- **SPA Link component** — `<Link>` for SPA navigation without page reloads and automatic external link detection
- **State management** — Pinia-like store system with mutations, actions, and getters
- **App mounting** — zero-config OWL component mounting with template merging
- **Fetch helper** — thin wrapper around the Fetch API with a configurable base URL and error handler
- **Cache** — async-style `localStorage` wrapper (`get`, `set`, `remove`, `clear`, `keys`)
- **Meta tags** — programmatic control over `<title>`, Open Graph, Twitter Card, canonical, and more
- **Error boundaries** — global error handling with context tracking and error pages
- **i18n** — internationalization with pluralization and interpolation support
- **Form handling** — schema validation with async support via `useForm()`
- **Auto-import** — automatic component registration with TypeScript declarations
- **Odoo RPC Service** — full JSON-RPC client with authentication and CRUD operations
- **Composables** — reusable hooks for auth, localStorage, fetching, and more
- **Testing Utilities** — mock store, router mocking, component mount helpers
- **SEO Utils** — sitemap, robots.txt, JSON-LD, Open Graph, Twitter Cards
- **PWA Support** — service worker, manifest generation, push notifications
- **SSG generator** — statically pre-renders HTML pages with correct meta tags at build time
- **Vite plugin** — handles `COMPONENTS` injection, XML template copying, CSS auto-import, chunk splitting, and env filtering
- **ESLint & PostCSS** — shareable configs included; no extra dev-dependencies needed in your project

---

## Requirements

| Dependency | Version |
|---|---|
| Node.js | `>=20` |
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
| `pages/[...path]/NotFound.js` | `/:path(.*)` | `/any/unknown/path` | `{ path: 'any/unknown/path' }` |

**Param Types:**

- `[param]` — Required parameter, must be present in URL
- `[param?]` — Optional parameter, may be omitted
- `[...param]` — Catch-all parameter, matches any number of segments

Access parameters in your component via `getCurrentRoute()`:

```js
import { Component } from '@odoo/owl'
import { getCurrentRoute } from 'metaowl'

export default class UserPage extends Component {
  static template = 'UserPage'

  setup() {
    const route = getCurrentRoute()
    this.id = route?.params?.id
  }
}
```

---

### 404 / Not Found Pages

Create a catch-all route at `pages/[...path]/` to handle unknown URLs:

```
src/pages/
  [...path]/
    NotFound.js   ← rendered for any unmatched URL
    NotFound.xml
```

```js
// pages/[...path]/NotFound.js
import { Component } from '@odoo/owl'
import { Meta } from 'metaowl'

export default class NotFound extends Component {
  static template = 'NotFound'

  setup() {
    Meta.title('404 – Page Not Found')
  }
}
```

The catch-all directory can be named `[...path]`, `[...404]`, or any `[...name]` — the bracket-dot-dot-dot prefix is what makes it a catch-all regardless of name.

If no catch-all route exists and a URL cannot be matched, metaowl renders a minimal built-in 404 message so the page doesn't silently break.

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

## Link Component

The `Link` component provides SPA-style navigation without page reloads. It renders a standard `<a>` element and automatically handles internal navigation via `history.pushState`, while allowing normal browser behavior for external links.

### Setup

Import `Link` from `metaowl` and register it in your component's `static components`:

```js
import { Component } from '@odoo/owl'
import { Link } from 'metaowl'

export class MyNav extends Component {
  static template = 'MyNav'
  static components = { Link }

  setup() {
    this.linkClass = (href) => {
      const base = 'block px-3 py-2 rounded-md text-sm'
      const active = 'bg-gray-100 text-gray-900'
      const inactive = 'text-gray-600 hover:bg-gray-100'
      const isActive = window.location.pathname === href
      return `${base} ${isActive ? active : inactive}`
    }
  }
}
```

### Basic Usage

Prop values are OWL expressions — wrap static strings in extra quotes, or pass method calls:

```xml
<!-- Internal link -->
<Link to="'/about'">About Us</Link>

<!-- Dynamic target from loop -->
<Link to="item.href"><t t-esc="item.label"/></Link>

<!-- Computed class via method -->
<Link to="item.href" class="linkClass(item.href)">
  <t t-esc="item.label"/>
</Link>

<!-- External link — opens normally (auto-detected, no SPA intercept) -->
<Link to="'https://github.com/odoo/owl'" target="'_blank'">
  OWL Framework
</Link>

<!-- External with dynamic target, closing sidebar on click -->
<Link
  to="link.href"
  target="link.external ? '_blank' : undefined"
  t-on-click="props.onClose"
  class="linkClass(link.href)"
>
  <span t-esc="link.label"/>
</Link>
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `to` | `string` | Yes | Target URL (internal path or external URL) |
| `class` | `string` | No | CSS classes for the anchor element |
| `target` | `string` | No | Target window (`_blank`, `_self`, etc.) |
| `rel` | `string` | No | Relationship attribute (auto-set to `noopener noreferrer` for external `_blank` links) |
| `title` | `string` | No | Tooltip text |
| `download` | `string \| boolean` | No | Download attribute for file downloads |
| `hreflang` | `string` | No | Language of the linked resource |
| `type` | `string` | No | MIME type hint |
| `ping` | `string` | No | Space-separated URLs to ping on click |
| `referrerpolicy` | `string` | No | Referrer policy override |
| `media` | `string` | No | Media query hint |

Any additional attribute (`id`, `style`, `aria-*`, `data-*`, etc.) is forwarded directly to the rendered `<a>` element.

### External Link Detection

The component automatically detects external links and performs normal navigation:

- URLs starting with `http://` or `https://`
- Protocol-relative URLs (`//example.com`)
- Special protocols: `mailto:`, `tel:`, `ftp:`, etc.

### Programmatic Navigation

Use `navigateTo()` for programmatic navigation in JavaScript:

```js
import { navigateTo } from 'metaowl'

// Navigate to a new route
await navigateTo('/dashboard')

// Replace current history entry (no back button)
await navigateTo('/login', { replace: true })
```

### Router API

```js
import { router, navigateTo } from 'metaowl'

// Navigation
router.push('/path')           // Navigate to path
router.replace('/path')        // Replace current history entry
router.navigateTo('/path')     // SPA navigation
router.back()                  // Go back
router.forward()               // Go forward
router.go(-2)                  // Go 2 steps back

// Guards
router.beforeEach((to, from, next) => { ... })
router.afterEach((to, from) => { ... })

// State
router.currentRoute    // Current route object
router.previousRoute   // Previous route object
router.isNavigating    // Boolean indicating navigation in progress
```

### SPA Mode

SPA navigation is enabled by default when using `boot()`. To disable:

```js
boot(routes, null, { spa: false })
```

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

## Error Boundaries

Handle runtime errors gracefully with automatic fallback UI:

```js
import { ErrorBoundary } from 'metaowl'

// Wrap your app
const errorBoundary = ErrorBoundary.wrap(AppComponent)
errorBoundary.mount(document.body)

// Global error handler
ErrorBoundary.onError((error, context) => {
  console.error('App error:', error, context)
  // Send to error tracking service
  analytics.track('error', { message: error.message, path: context?.route })
})
```

**Error Pages:**

```js
// src/pages/error.js
export default class ErrorPage extends Component {
  static template = xml`
    <div class="error-page">
      <h1>Error <t t-esc="props.code || 500"/></h1>
      <p t-esc="props.message"/>
      <button t-on-click="goHome">Go Home</button>
    </div>
  `
}
```

---

## i18n / Internationalization

Full-featured translation system with pluralization:

```js
import { I18n } from 'metaowl'

await I18n.load({
  locale: 'de',
  messages: {
    welcome: 'Willkommen, {name}!',
    items: '{count, plural, one {# Item} other {# Items}}'
  }
})
```

**In templates:**

```xml
<div t-esc="I18n.t('welcome', { name: state.username })"/>
<span t-esc="I18n.t('items', { count: state.cartItems })"/>
```

**Pluralization:**

```js
I18n.t('items', { count: 1 })   // "1 Item"
I18n.t('items', { count: 5 })   // "5 Items"
```

---

## Form Handling

Declarative forms with validation support:

```js
import { useForm } from 'metaowl'

class LoginPage extends Component {
  setup() {
    this.form = useForm({
      schema: {
        email: { required: true, type: 'email' },
        password: { required: true, minLength: 8 }
      },
      onSubmit: async (values) => {
        await Fetch.post('/api/login', values)
        this.env.router.navigate('/dashboard')
      }
    })
  }
}
```

```xml
<form t-on-submit.prevent="form.submit">
  <input t-model="form.values.email" />
  <span t-if="form.errors.email" t-esc="form.errors.email"/>
  
  <input type="password" t-model="form.values.password" />
  <span t-if="form.errors.password" t-esc="form.errors.password"/>
  
  <button type="submit" t-att-disabled="form.isSubmitting">
    <t t-if="form.isSubmitting">Loading...</t>
    <t t-else="">Login</t>
  </button>
</form>
```

---

## Auto-Import

Optional automatic component registration for development productivity:

**Enable in vite.config.js:**

```js
import { metaowlConfig } from 'metaowl/vite'

export default metaowlConfig({
  autoImport: {
    enabled: true,
    pattern: '**/*.js'
  }
})
```

**How it works:**

1. Components in `src/components/` are auto-scanned
2. Type declarations are generated in `.metaowl/components.d.ts`
3. Use components without manual imports:

```js
// No import needed!
export default class MyPage extends Component {
  static template = xml`
    <div>
      <Button color="primary"/>
      <Card>
        <Modal t-if="state.showModal"/>
      </Card>
    </div>
  `
  // Components are automatically available
  // from src/components/Button/Button.js, etc.
}
```

**Note:** Auto-import is opt-in and primarily useful during development. For production, consider explicit imports for better tree-shaking and clarity.

---

## Odoo JSON-RPC Service

Connect to Odoo backends with a full-featured JSON-RPC client:

```js
import { OdooService } from 'metaowl'

// Configure connection
OdooService.configure({
  baseUrl: 'https://my-odoo-instance.com',
  database: 'my_database',
  username: 'admin',
  password: 'admin'  // or apiKey
})

// Authenticate
const session = await OdooService.authenticate()
console.log(`Logged in as ${session.name}`)

// Search and read records
const partners = await OdooService.searchRead('res.partner', {
  domain: [['is_company', '=', true]],
  fields: ['name', 'email', 'phone'],
  limit: 10
})

// Call any model method
await OdooService.call('res.partner', 'create', [{
  name: 'New Partner',
  email: 'partner@example.com'
}])
```

**CRUD Operations:**

```js
// Create
const id = await OdooService.create('res.partner', { name: 'Test' })

// Read
const records = await OdooService.read('res.partner', [id], ['name'])

// Update
await OdooService.write('res.partner', [id], { name: 'Updated' })

// Delete
await OdooService.unlink('res.partner', [id])
```

**Session Management:**

```js
// Check authentication
if (OdooService.isAuthenticated()) {
  console.log('User:', OdooService.getSession().name)
}

// Logout
OdooService.logout()

// Listen to auth changes
OdooService.onAuthChange((session) => {
  console.log(session ? 'Logged in' : 'Logged out')
})
```

---

## Composables / Hooks

Reusable OWL hooks for common patterns:

```js
import { useAuth, useLocalStorage, useFetch } from 'metaowl'

class MyComponent extends Component {
  setup() {
    // Authentication state
    const { user, isLoggedIn, logout } = useAuth()

    // Persisted state
    const theme = useLocalStorage('theme', 'light')

    // Data fetching
    const { data, loading, error, refresh } = useFetch('/api/users')

    return { user, theme, data, loading, error, refresh }
  }
}
```

**Available Composables:**

| Composable | Description |
|---|---|
| `useAuth()` | Authentication state linked to OdooService |
| `useLocalStorage(key, default)` | Reactive localStorage access |
| `useFetch(url, options)` | Data fetching with loading/error states |
| `useDebounce(value, wait)` | Debounced reactive value |
| `useThrottle(fn, wait)` | Throttled function |
| `useWindowSize()` | Reactive window dimensions |
| `useOnlineStatus()` | Network connectivity state |
| `useAsyncState(fn)` | Async operation state management |
| `useCache(key, default)` | Reactive cache access |

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

### `Link Component API`

```xml
<Link to="item.href" class="linkClass(item.href)" target="item.external ? '_blank' : undefined">
  <t t-esc="item.label"/>
</Link>
```

| Prop | Type | Description |
|------|------|-------------|
| `to` | `string` | Target URL (required) |
| `class` | `string` | CSS classes |
| `target` | `string` | Target window (`_blank`, `_self`) |
| `rel` | `string` | Link relationship (auto: `noopener noreferrer` for external `_blank`) |
| `title` | `string` | Tooltip text |
| `download` | `string \| boolean` | Download attribute |
| `hreflang` | `string` | Language of the linked resource |
| `type` | `string` | MIME type hint |
| `ping` | `string` | URLs to ping on click |
| `referrerpolicy` | `string` | Referrer policy override |
| `media` | `string` | Media query hint |

All other attributes (`id`, `style`, `aria-*`, `data-*`, etc.) are forwarded to the `<a>` element.

**Programmatic Navigation:**

```js
import { navigateTo, router } from 'metaowl'

// Navigate to new route (SPA mode)
await navigateTo('/dashboard')

// Replace current history entry
await navigateTo('/login', { replace: true })

// Using router singleton
router.push('/path')
router.replace('/path')
router.back()
router.forward()
router.go(-2)
```

**External Link Detection:**
- `http://` or `https://` → Normal navigation
- `//` → Protocol-relative, normal navigation
- `mailto:`, `tel:`, `ftp:` → Normal navigation

---

### `Error Boundary API`

| Function | Description |
|---|---|
| `ErrorBoundary.wrap(Component)` | Wrap component with error handling |
| `ErrorBoundary.onError(callback)` | Register global error handler `(error, context) => void` |
| `ErrorBoundary.getLastError()` | Get most recent error |
| `ErrorBoundary.clearError()` | Clear error state |

**Error Context:**

```ts
{
  route?: string,
  component?: string,
  timestamp: number
}
```

---

### `i18n API`

**`I18n.load(config)`**

```ts
I18n.load({
  locale: string,
  messages: Record<string, string | MessageFunction>,
  numberFormats?: Record<string, object>,
  dateFormats?: Record<string, object>
})
```

**`I18n.t(key, values?)`**

Translate a message with optional interpolation:

```ts
I18n.t('welcome', { name: 'John' })  // "Welcome, John!"
```

**`I18n.n(value, format?)`** / **`I18n.d(value, format?)`**

Format numbers and dates:

```ts
I18n.n(1234.5, 'currency')  // "€1,234.50"
I18n.d(new Date(), 'short') // "12.03.2026"
```

**Locale Switching:**

```js
await I18n.setLocale('en')
console.log(I18n.locale)  // "en"
```

---

### `Forms API`

**`useForm(options)`**

```ts
useForm({
  schema?: ValidationSchema,
  initialValues?: Record<string, any>,
  onSubmit?: (values: Record<string, any>) => Promise<void>,
  validateOnChange?: boolean,
  validateOnBlur?: boolean
}): FormInstance
```

**Form Instance:**

| Property | Type | Description |
|---|---|---|
| `values` | `object` | Current form values |
| `errors` | `object` | Validation errors by field |
| `touched` | `object` | Fields that have been touched |
| `isSubmitting` | `boolean` | Submit in progress |
| `isValid` | `boolean` | All validation passed |
| `isDirty` | `boolean` | Values differ from initial |

| Method | Description |
|---|---|
| `submit(event?)` | Trigger form submission |
| `setValue(field, value)` | Set a field value |
| `setValues(values)` | Set multiple values |
| `setError(field, message)` | Set a field error |
| `clearErrors()` | Clear all errors |
| `reset()` | Reset to initial values |
| `validate()` | Trigger validation |

**Validation Schema:**

```js
{
  email: {
    required: true,
    type: 'email'
  },
  age: {
    type: 'number',
    min: 0,
    max: 120
  }
}
```

---

### `OdooService API`

| Method | Description |
|---|---|
| `configure(config)` | Configure Odoo connection (baseUrl, database, credentials) |
| `authenticate()` | Login and get session |
| `logout()` | Clear session |
| `isAuthenticated()` | Check if currently logged in |
| `getSession()` | Get current session info |
| `onAuthChange(callback)` | Subscribe to auth state changes (returns unsubscribe) |

**CRUD Operations:**

| Method | Description |
|---|---|
| `searchRead(model, options)` | Search and read records |
| `call(model, method, args, kwargs)` | Call any model method |
| `read(model, ids, fields)` | Read specific records |
| `create(model, values)` | Create new record |
| `write(model, ids, values)` | Update records |
| `unlink(model, ids)` | Delete records |
| `searchCount(model, domain)` | Get count of matching records |

**Utility Methods:**

| Method | Description |
|---|---|
| `listDatabases()` | Get available databases |
| `versionInfo()` | Get Odoo server version info |

**Configuration Options:**

```ts
{
  baseUrl: string,        // Odoo instance URL
  database: string,       // Database name
  username?: string,      // Username (or use in authenticate())
  password?: string,      // Password (or apiKey)
  apiKey?: string,        // API Key alternative to password
  persistSession?: boolean // Persist to localStorage (default: true)
}
```

---

### `Composables API`

**`useAuth()`**

Authentication state for Odoo integration.

```ts
{
  user: Ref<Session|null>,      // Current user info
  isLoggedIn: Ref<boolean>,     // Auth status
  isLoading: Ref<boolean>,      // Loading state
  login: (credentials) => Promise<boolean>,
  logout: () => Promise<void>,
  checkAuth: () => Promise<boolean>
}
```

**`useLocalStorage(key, defaultValue)`**

Reactive localStorage access with cross-tab sync.

```ts
const theme = useLocalStorage('theme', 'light')

theme.value = 'dark'  // Automatically saves to localStorage
// Other tabs are notified via storage event
```

**`useFetch(url, options)`**

Data fetching with reactive states.

```ts
{
  data: Ref<any>,       // Fetched data
  loading: Ref<boolean>,
  error: Ref<Error|null>,
  refresh: () => Promise<void>,
  execute: (url?) => Promise<void>
}
```

Options: `initialData`, `immediate`, `transform`, `onError`

**`useDebounce(value, wait)`**

```ts
const searchQuery = useState('')
const debounced = useDebounce(searchQuery, 500)
// debounced updates 500ms after searchQuery stops changing
```

**`useThrottle(fn, wait)`**

```ts
const throttledSearch = useThrottle((query) => {
  performSearch(query)
}, 500)
```

**`useWindowSize()`**

```ts
const { width, height } = useWindowSize()
const isMobile = computed(() => width.value < 768)
```

**`useOnlineStatus()`**

```ts
const isOnline = useOnlineStatus()
// Reactive to network state changes
```

**`useAsyncState(asyncFn, options)`**

```ts
const { state, data, execute, isLoading, isSuccess, isError } =
  useAsyncState(fetchUserData, { immediate: true })
// state: null | 'loading' | 'success' | 'error'
```

**`useCache(key, defaultValue)`**

```ts
const { value, set, get, remove, clear } = useCache('user-prefs', {})
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
| `autoImport` | `{ enabled: false }` | Auto-import configuration: `{ enabled, pattern }` |

**Auto-Import Options:**

| Option | Default | Description |
|---|---|---|
| `enabled` | `false` | Enable component auto-import |
| `pattern` | `'*.js'` | Glob pattern for scanning components |

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

## Deployment

MetaOWL provides two ways to build your application for production:

### Option 1: `npm run generate` (Recommended)

```bash
npm run generate
```

This command generates static HTML files for all routes. The result works **without any server configuration** on all web hosts:

- GitHub Pages
- Vercel
- Netlify
- Cloudflare Pages
- Any traditional web host

All pages are generated as separate HTML files at build time, so every route can be accessed directly.

### Option 2: `npm run build`

```bash
npm run build
```

This command creates a Single Page Application (SPA). Since all routes are handled client-side, the web server must **forward all requests to `index.html`** (SPA fallback).

#### Web Server Configuration by Host:

**Vercel, Netlify, Cloudflare Pages:**
Create a `public/serve.json` file before building:

```json
{
  "rewrites": [
    { "source": "**", "destination": "/index.html" }
  ]
}
```

**Apache (.htaccess):**
```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ /index.html [L]
```

**nginx:**
```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

**Node.js (with serve):**
```bash
npx serve -s dist
```

---

## Changelog

### v0.4.0 (2026-03-24)

**Added:**

- **Link component** added.

### v0.3.7 (2026-03-24)

**Fixed:**

- **bin/metaowl-lint.js**: Fixed inconsistent default lint paths. Changed from `src/owl/pages/**` and `src/owl/components/**` to `src/pages/**` and `src/components/**` to match the documented project structure.

- **eslint.js**: Fixed `ignores` configuration placement. Moved `ignores` to a separate configuration object as required by ESLint Flat Config format. Also added `.metaowl/**` to the ignore list for the auto-generated component declarations.

- **modules/auto-import.js**: Fixed missing `node:` prefix for Node.js built-in module import.

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
