#!/usr/bin/env node
/**
 * metaowl build — lint then production build.
 */
import { banner, metaowlRoot, resolveBin, run, success } from './utils.js'

banner('build')
run('Linting', `node "${metaowlRoot}/bin/metaowl-lint.js"`)
run('Building', `"${resolveBin('vite')}" build`)
success('Build complete')
console.log()

