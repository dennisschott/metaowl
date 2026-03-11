import { describe, it, expect } from 'vitest'
import { buildRoutes } from '../modules/file-router.js'

const Comp = function IndexPage() {}
const About = function AboutPage() {}
const Deep = function DeepPage() {}

describe('buildRoutes', () => {
  it('maps index directory to /', () => {
    const routes = buildRoutes({
      './pages/index/Index.js': { default: Comp }
    })
    expect(routes).toHaveLength(1)
    expect(routes[0].path).toContain('/')
    expect(routes[0].name).toBe('index')
    expect(routes[0].component).toBe(Comp)
  })

  it('maps a named directory to its URL path', () => {
    const routes = buildRoutes({
      './pages/about/About.js': { default: About }
    })
    expect(routes[0].path).toContain('/about')
    expect(routes[0].name).toBe('about')
  })

  it('maps nested directories to a slug name', () => {
    const routes = buildRoutes({
      './pages/blog/post/Post.js': { default: Deep }
    })
    expect(routes[0].path).toContain('/blog/post')
    expect(routes[0].name).toBe('blog-post')
  })

  it('falls back to first function export when no default', () => {
    const routes = buildRoutes({
      './pages/index/Index.js': { MyComp: Comp }
    })
    expect(routes[0].component).toBe(Comp)
  })

  it('throws when module has no function export', () => {
    expect(() =>
      buildRoutes({ './pages/index/Index.js': { value: 42 } })
    ).toThrow('[metaowl]')
  })

  it('builds multiple routes from multiple modules', () => {
    const routes = buildRoutes({
      './pages/index/Index.js': { default: Comp },
      './pages/about/About.js': { default: About }
    })
    expect(routes).toHaveLength(2)
  })
})
