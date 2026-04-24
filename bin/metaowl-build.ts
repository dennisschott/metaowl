#!/usr/bin/env node
/**
 * metaowl build — lint then production build.
 */
import { banner, resolveBin, resolveOwnRuntimeBin, run, success } from './utils.js'

banner('build')
run('Linting', `node "${resolveOwnRuntimeBin('metaowl-lint')}"`)
run('Building', `"${resolveBin('vite')}" build`)
success('Build complete')
console.log()