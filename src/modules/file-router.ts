import type { ComponentConstructor } from '@odoo/owl'
import type { GlobModules, Route, RouteTable } from '../types.js'

function pathFromKey(key: string): string {
  const rel = key.replace(/^\.\/pages\//, '')
  const dirParts = rel.split('/').slice(0, -1)
  if (dirParts.length === 1 && dirParts[0] === 'index') return '/'
  return '/' + dirParts.join('/')
}

function componentFromModule(mod: Record<string, unknown>, key: string): ComponentConstructor {
  if (typeof mod.default === 'function') return mod.default as ComponentConstructor
  const named = Object.values(mod).find(v => typeof v === 'function')
  if (!named) throw new Error(`[metaowl] No component export found in "${key}"`)
  return named as ComponentConstructor
}

export function buildRoutes(modules: GlobModules): RouteTable {
  return Object.entries(modules).map(([key, mod]) => {
    const path = pathFromKey(key)
    const name = path === '/' ? 'index' : path.slice(1).replace(/\//g, '-')
    return {
      name,
      path: [path],
      component: componentFromModule(mod, key)
    }
  })
}
