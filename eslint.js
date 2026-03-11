import js from '@eslint/js'
import globals from 'globals'

/**
 * Default metaowl ESLint configuration.
 *
 * Usage in your project's eslint.config.js:
 *
 *   import { eslintConfig } from 'metaowl/eslint'
 *   export default eslintConfig
 *
 * To extend/override:
 *
 *   import { eslintConfig } from 'metaowl/eslint'
 *   export default [
 *     ...eslintConfig,
 *     { rules: { 'no-console': 'warn' } }
 *   ]
 */
export const eslintConfig = [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        COMPONENTS: 'readonly'
      }
    },
    files: ['**/*.js', '**/*.jsx'],
    rules: {
      'no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],
      'semi': ['error', 'never'],
      'quotes': ['error', 'single'],
      'comma-dangle': ['error', 'never'],
      'no-undef': 'off'
    },
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**'
    ]
  }
]
