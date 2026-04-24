#!/usr/bin/env node
/**
 * metaowl lint — format with Prettier then lint with ESLint.
 */
import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { globSync } from 'glob'
import { banner, cwd, failure, resolveBin, step, success } from './utils.js'

type PackageMetaowlConfig = {
  metaowl?: {
    lint?: string[]
  }
}

banner('lint')

let lintTargets: string[] | null = null
try {
  const pkg = JSON.parse(readFileSync(resolve(cwd, 'package.json'), 'utf8')) as PackageMetaowlConfig
  lintTargets = pkg.metaowl?.lint ?? null
} catch {
  // No package.json or no metaowl config.
}

const defaults = [
  'src/metaowl.js',
  'src/css.js',
  'src/pages/**',
  'src/components/**'
]

const candidates = lintTargets ?? defaults
const existing = candidates.filter((pattern) => {
  if (existsSync(resolve(cwd, pattern))) return true
  return globSync(pattern, { cwd }).length > 0
})

if (existing.length === 0) {
  success('No lint targets found — skipping')
  console.log()
  process.exit(0)
}

const targets = existing.map((target) => `"${target}"`).join(' ')

step('Formatting with Prettier...')
console.log()
try {
  execSync(`"${resolveBin('prettier')}" src --single-quote --no-semi --write`, { stdio: 'inherit', cwd })
} catch {
  failure('Prettier failed')
  process.exit(1)
}
console.log()

step('Linting with ESLint...')
console.log()
try {
  execSync(`"${resolveBin('eslint')}" ${targets} --fix`, { stdio: 'inherit', cwd })
} catch {
  failure('ESLint failed')
  process.exit(1)
}
console.log()

success('Lint complete')
console.log()