#!/usr/bin/env node
/**
 * metaowl lint — format with Prettier then lint with ESLint.
 *
 * Lint targets can be configured in package.json under `metaowl.lint`:
 *
 *   "metaowl": {
 *     "lint": ["src/app.js", "src/pages/**", "src/components/**"]
 *   }
 */
import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { globSync } from 'glob'
import { banner, bin, cwd, step, success, failure } from './utils.js'

banner('lint')

let lintTargets = null
try {
  const pkg = JSON.parse(readFileSync(resolve(cwd, 'package.json'), 'utf8'))
  lintTargets = pkg?.metaowl?.lint ?? null
} catch {
  // no package.json or no metaowl config
}

const defaults = [
  'src/metaowl.js',
  'src/css.js',
  'src/owl/pages/**',
  'src/owl/components/**'
]

const candidates = lintTargets ?? defaults

const existing = candidates.filter(pattern => {
  if (existsSync(resolve(cwd, pattern))) return true
  return globSync(pattern, { cwd }).length > 0
})

if (existing.length === 0) {
  success('No lint targets found — skipping')
  console.log()
  process.exit(0)
}

const targets = existing.map(t => `"${t}"`).join(' ')

step('Formatting with Prettier...')
console.log()
try {
  execSync(`"${bin}/prettier" src --single-quote --no-semi --write`, { stdio: 'inherit', cwd })
} catch {
  failure('Prettier failed')
  process.exit(1)
}
console.log()

step('Linting with ESLint...')
console.log()
try {
  execSync(`"${bin}/eslint" ${targets} --fix`, { stdio: 'inherit', cwd })
} catch {
  failure('ESLint failed')
  process.exit(1)
}
console.log()

success('Lint complete')
console.log()

