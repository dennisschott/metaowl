import { createRequire } from 'node:module'
import type { PluginCreator } from 'postcss'

interface PostcssConfigOptions {
  safelist?: (string | RegExp)[]
  content?: string[]
  additionalPlugins?: ReturnType<PluginCreator<unknown>>[]
}

const defaultSafelist: (string | RegExp)[] = []
const require = createRequire(import.meta.url)

/**
 * PostCSS config factory for metaowl projects.
 */
export function createPostcssConfig(options: PostcssConfigOptions = {}): { plugins: unknown[] } {
  const {
    safelist = [],
    content = [],
    additionalPlugins = []
  } = options

  const plugins: unknown[] = [
    ...process.env.NODE_ENV === 'production'
      ? [
          require('@fullhuman/postcss-purgecss')({
            content: [
              './**/*.xml',
              './**/*.html',
              './src/**/*.js',
              ...content
            ],
            safelist: [...defaultSafelist, ...safelist]
          })
        ]
      : [],
    ...additionalPlugins
  ]

  return { plugins }
}
