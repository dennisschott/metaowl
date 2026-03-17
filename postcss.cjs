// CommonJS PostCSS config factory for metaowl projects.
// Usage in postcss.config.cjs:
//
//   const { createPostcssConfig } = require('metaowl/postcss')
//   module.exports = createPostcssConfig()
//
// Add extra PostCSS plugins:
//
//   module.exports = createPostcssConfig({
//     additionalPlugins: [require('some-postcss-plugin')()]
//   })
//
// Note: PurgeCSS is intentionally not included. Tailwind CSS v4 performs its
// own content scanning and generates only the CSS that is actually used.
// Adding PurgeCSS on top breaks responsive variants (sm:, md:, lg:, etc.)
// because its default extractor treats ":" as a separator.

function createPostcssConfig(options = {}) {
  const { additionalPlugins = [] } = options

  return {
    plugins: [
      ...additionalPlugins
    ]
  }
}

module.exports = { createPostcssConfig }
