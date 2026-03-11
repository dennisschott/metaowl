// CommonJS PostCSS config factory for metaowl projects.
// This file provides backward compatibility for projects using require().
//
// Usage in postcss.config.cjs:
//   const { createPostcssConfig } = require('metaowl/postcss')
//   module.exports = createPostcssConfig()
//
// Override safelist or add content globs:
//   module.exports = createPostcssConfig({
//     safelist: [/^my-custom-class/],
//     content: ['./templates/**/*.html']
//   })

const defaultSafelist = []

function createPostcssConfig(options = {}) {
  const {
    safelist = [],
    content = [],
    additionalPlugins = []
  } = options

  return {
    plugins: [
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
  }
}

module.exports = { createPostcssConfig }
