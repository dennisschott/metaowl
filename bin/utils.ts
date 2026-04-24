/**
 * Shared CLI utilities for metaowl bin scripts.
 */
import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

type ExecOptions = Record<string, unknown>

function resolvePackageRoot(): string {
  let currentDir = dirname(fileURLToPath(import.meta.url))

  while (true) {
    if (existsSync(resolve(currentDir, 'package.json'))) {
      return currentDir
    }

    const parentDir = resolve(currentDir, '..')
    if (parentDir === currentDir) {
      throw new Error('[metaowl] Could not resolve package root for CLI runtime')
    }

    currentDir = parentDir
  }
}

export const metaowlRoot = resolvePackageRoot()
export const bin = resolve(metaowlRoot, 'node_modules/.bin')
export const cwd = process.cwd()
const cwdBin = resolve(cwd, 'node_modules/.bin')

const packageJson = JSON.parse(readFileSync(resolve(metaowlRoot, 'package.json'), 'utf-8')) as { version: string }
export const version = packageJson.version

export function resolveOwnRuntimeBin(name: string): string {
  const fileName = name.endsWith('.js') ? name : `${name}.js`
  return resolve(metaowlRoot, 'build/runtime/bin', fileName)
}

export function resolveBin(name: string): string {
  const local = resolve(bin, name)
  if (existsSync(local)) return local

  const project = resolve(cwdBin, name)
  if (existsSync(project)) return project

  return name
}

const tty = Boolean(process.stdout.isTTY)
const a = (text: string, code: string): string => tty ? `\x1b[${code}m${text}\x1b[0m` : text

export function banner(command: string): void {
  console.log()
  console.log(`  ${a('metaowl', '1;36')} ${a(command, '1')}  ${a(`v${version}`, '2')}`)
  console.log()
}

export function step(message: string): void {
  console.log(`  ${a('›', '36')} ${message}`)
}

export function success(message: string): void {
  console.log(`  ${a('✓', '32')} ${a(message, '2')}`)
}

export function failure(message: string): void {
  console.error(`  ${a('✗', '31')} ${message}`)
}

export function run(label: string, cmd: string, opts: ExecOptions = {}): void {
  step(label)
  console.log()
  try {
    execSync(cmd, { stdio: 'inherit', cwd, ...opts })
  } catch {
    console.log()
    failure(`${label} failed`)
    process.exit(1)
  }
  console.log()
}