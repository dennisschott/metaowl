/**
 * @module FileRouter
 *
 * File-based routing with dynamic route parameter support.
 */

import { buildRouteRegexPattern, type OwlComponent, type RouteConfig } from './constants.js'

type RouteModule = {
  default?: unknown
  [key: string]: unknown
}

type RouteParams = Record<string, string>

export type { RouteConfig }

export interface BuiltRoute {
  name: string
  path: string[]
  component: OwlComponent | null
  params?: string[]
  meta: Record<string, unknown>
  beforeEnter?: (...args: unknown[]) => unknown
  redirect?: string
  [key: string]: unknown
}

export type MatchedRoute = Omit<BuiltRoute, 'params'> & {
  matchedPath: string
  params: RouteParams
}

export function pathFromKey(key: string): string {
  const relativePath = key.replace(/^\.\/pages\//, '')
  const parts = relativePath.split('/')
  parts.pop()

  if (parts.length === 0) {
    return '/'
  }

  if (parts.length === 1 && parts[0] === 'index') {
    return '/'
  }

  return '/' + parts.map(segmentToPattern).join('/')
}

function segmentToPattern(segment: string): string {
  const insideBrackets = segment.match(/^\[(.+)\]$/)
  if (insideBrackets) {
    const content = insideBrackets[1] as string

    if (content.startsWith('...')) {
      const paramName = content.slice(3) || 'path'
      return `:${paramName}(.*)`
    }

    if (content.endsWith('?')) {
      const paramName = content.slice(0, -1)
      return `:${paramName}?`
    }

    return `:${content}`
  }

  return segment
}

function extractParamNames(filePath: string): string[] {
  const params: string[] = []
  const parts = filePath.split('/')

  for (const part of parts) {
    const match = part.match(/^\[([^?\]]+)\??\]$|^\[\.\.\.([^\]]+)\]$/)
    if (match) {
      params.push((match[1] || match[2] || 'path') as string)
    }
  }

  return params
}

function buildRegexPattern(path: string): string {
  return buildRouteRegexPattern(path)
}

export function matchRoute(pattern: string, path: string): { params: RouteParams; pattern: string } | null {
  const paramNames: string[] = []
  const paramRegex = /:([^/?(]+)/g
  let match: RegExpExecArray | null

  while ((match = paramRegex.exec(pattern)) !== null) {
    paramNames.push(match[1] as string)
  }

  const regex = new RegExp(buildRegexPattern(pattern))
  const matches = path.match(regex)
  if (!matches) {
    return null
  }

  const params: RouteParams = {}
  for (let index = 0; index < paramNames.length; index++) {
    const value = matches[index + 1]
    if (value !== undefined) {
      params[paramNames[index] as string] = value
    }
  }

  return { params, pattern }
}

export function isDynamicRoute(path: string): boolean {
  return path.includes(':')
}

function componentFromModule(mod: RouteModule, key: string): OwlComponent {
  if (typeof mod.default === 'function') {
    return mod.default as unknown as OwlComponent
  }

  const funcs = Object.values(mod).filter((v): v is OwlComponent => typeof v === 'function')
  if (funcs.length === 0) {
    throw new Error(`[metaowl] No component export found in "${key}"`)
  }

  return funcs[0]
}

export function buildRoutes(modules: Record<string, RouteModule>): BuiltRoute[] {
  const routes: BuiltRoute[] = []
  const nameCounts: Record<string, number> = {}

  for (const [key, mod] of Object.entries(modules)) {
    const derivedPath = pathFromKey(key)
    const component = componentFromModule(mod, key)
    const routeConfig = component.route || {}
    const routePath = typeof routeConfig.path === 'string' ? routeConfig.path : derivedPath
    const baseName = routePath === '/'
      ? 'index'
      : routePath.slice(1).replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')

    const routeName = nameCounts[baseName] !== undefined
      ? `${baseName}-${++nameCounts[baseName]}`
      : (nameCounts[baseName] = 0, baseName)

    const route: BuiltRoute = {
      name: routeName,
      path: [routePath],
      component,
      params: extractParamNames(key),
      meta: component.route?.meta || {}
    }

    if (component.route) {
      Object.assign(route, component.route)
      route.path = [typeof route.path === 'string' ? route.path : routePath]
      route.meta = route.meta || {}
    }

    routes.push(route)
  }

  routes.sort((left, right) => {
    const leftPath = left.path[0] as string
    const rightPath = right.path[0] as string

    const leftIsCatchAll = leftPath.includes('(.*)')
    const rightIsCatchAll = rightPath.includes('(.*)')
    if (!leftIsCatchAll && rightIsCatchAll) return -1
    if (leftIsCatchAll && !rightIsCatchAll) return 1

    const leftIsDynamic = isDynamicRoute(leftPath)
    const rightIsDynamic = isDynamicRoute(rightPath)
    if (!leftIsDynamic && rightIsDynamic) return -1
    if (leftIsDynamic && !rightIsDynamic) return 1

    if (leftIsDynamic && rightIsDynamic) {
      const leftSegments = leftPath.split('/').length
      const rightSegments = rightPath.split('/').length
      if (leftSegments !== rightSegments) return rightSegments - leftSegments

      const leftParamCount = left.params?.length || 0
      const rightParamCount = right.params?.length || 0
      return leftParamCount - rightParamCount
    }

    return 0
  })

  return routes
}

export function findRoute(routes: BuiltRoute[], path: string): MatchedRoute | null {
  for (const route of routes) {
    for (const routePath of route.path) {
      const match = matchRoute(routePath, path)
      if (match) {
        return {
          ...route,
          matchedPath: routePath,
          params: match.params
        }
      }
    }
  }

  return null
}

export function generateUrl(routes: Array<Pick<BuiltRoute, 'name' | 'path'>>, name: string, params: Record<string, string> = {}): string {
  const route = routes.find((candidate) => candidate.name === name)
  if (!route) {
    throw new Error(`[metaowl] Route "${name}" not found`)
  }

  let path = route.path[0] as string

  for (const [key, value] of Object.entries(params)) {
    path = path.replace(`:${key}`, value)
    path = path.replace(`:${key}?`, value)
  }

  return path.replace(/\/:[^/]+\?/g, '').replace(/\?$/, '')
}

export function validateRouteParams(
  route: Pick<BuiltRoute, 'params'>,
  params: Record<string, string>
): { valid: boolean; missing: string[]; extra: string[] } {
  const required = route.params || []
  const provided = Object.keys(params)

  const missing = required.filter((param) => !provided.includes(param))
  const extra = provided.filter((param) => !required.includes(param))

  return {
    valid: missing.length === 0,
    missing,
    extra
  }
}

export function parseCurrentRoute(routes: BuiltRoute[]): MatchedRoute | null {
  return findRoute(routes, document.location.pathname)
}

export function defineRoute(config: RouteConfig): RouteConfig {
  return config
}

export function route(config: RouteConfig): (componentClass: OwlComponent) => OwlComponent {
  return function decorator(componentClass: OwlComponent): OwlComponent {
    componentClass.route = config
    return componentClass
  }
}

export function createCatchAllRoute(
  component: OwlComponent,
  options: { name?: string; meta?: Record<string, unknown> } = {}
): BuiltRoute {
  return {
    name: options.name || '404',
    path: ['/:path(.*)'],
    component,
    params: ['path'],
    meta: { ...options.meta, catchAll: true }
  }
}

export function createRedirectRoute(from: string, to: string): BuiltRoute & { redirect: string } {
  const name = from.replace(/^\//, '').replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-')
  return {
    name: `redirect-${name}`,
    path: [from],
    redirect: to,
    component: null,
    meta: {}
  }
}