#!/usr/bin/env node
/**
 * metaowl dev — start the Vite development server.
 */
import { execSync } from 'node:child_process'
import { banner, cwd, resolveBin, step } from './utils.js'

banner('dev')
step('Starting development server...')
console.log()

execSync(`"${resolveBin('vite')}"`, { stdio: 'inherit', cwd })
