#!/usr/bin/env node
/**
 * metaowl dev — start the Vite development server.
 */
import { execSync } from 'node:child_process'
import { banner, bin, cwd, step } from './utils.js'

banner('dev')
step('Starting development server...')
console.log()

execSync(`"${bin}/vite"`, { stdio: 'inherit', cwd })
