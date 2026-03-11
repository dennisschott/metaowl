import { describe, it, expect, beforeEach } from 'vitest'
import { processRoutes } from '../modules/router.js'

const Comp = function Page() {}

function makeRoute(path) {
  return { name: 'page', path: [path], component: Comp }
}

// Stub document.location for each test
function setPath(pathname) {
  Object.defineProperty(globalThis, 'document', {
    value: { location: { pathname } },
    writable: true,
    configurable: true
  })
}

beforeEach(() => {
  setPath('/')
})

describe('processRoutes', () => {
  it('resolves a matching route for /', async () => {
    setPath('/')
    const routes = [makeRoute('/')]
    const result = await processRoutes(routes)
    expect(result).toHaveLength(1)
    expect(result[0].component).toBe(Comp)
  })

  it('resolves /index.html as the index route', async () => {
    setPath('/index.html')
    const routes = [makeRoute('/')]
    const result = await processRoutes(routes)
    expect(result[0].component).toBe(Comp)
  })

  it('resolves /about via trailing slash variant', async () => {
    setPath('/about/')
    const routes = [makeRoute('/about')]
    const result = await processRoutes(routes)
    expect(result[0].component).toBe(Comp)
  })

  it('resolves /about.html variant', async () => {
    setPath('/about.html')
    const routes = [makeRoute('/about')]
    const result = await processRoutes(routes)
    expect(result[0].component).toBe(Comp)
  })

  it('resolves /about/index.html variant', async () => {
    setPath('/about/index.html')
    const routes = [makeRoute('/about')]
    const result = await processRoutes(routes)
    expect(result[0].component).toBe(Comp)
  })

  it('throws when no route matches', async () => {
    setPath('/not-found')
    const routes = [makeRoute('/')]
    await expect(processRoutes(routes)).rejects.toThrow('No route found')
  })

  it('does not duplicate SSG paths on repeated calls', async () => {
    setPath('/')
    const route = makeRoute('/')
    await processRoutes([route])
    const countBefore = route.path.length
    setPath('/index.html')
    await processRoutes([route])
    // /index.html should still only appear once
    const indexHtmlCount = route.path.filter(p => p === '/index.html').length
    expect(indexHtmlCount).toBe(1)
  })
})
