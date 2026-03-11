/**
 * Shared CLI utilities for metaowl bin scripts.
 * Uses ANSI escape codes only when stdout is a TTY (no color when piped).
 */
import { existsSync, readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync, type ExecSyncOptions } from 'node:child_process'

export const metaowlRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const bin = resolve(metaowlRoot, 'node_modules/.bin')
export const cwd = process.cwd()
const cwdBin = resolve(cwd, 'node_modules/.bin')

const { version } = JSON.parse(readFileSync(resolve(metaowlRoot, 'package.json'), 'utf-8')) as { version: string }
export { version }

/**
 * Resolve an executable path with fallback for hoisted installs.
 * Priority:
 * 1) metaowl-local node_modules/.bin
 * 2) project node_modules/.bin
 * 3) command name (PATH lookup by shell)
 *
 * @param name - The executable name
 * @returns The resolved path
 */
export function resolveBin(name: string): string {
  const local = resolve(bin, name)
  if (existsSync(local)) return local

  const project = resolve(cwdBin, name)
  if (existsSync(project)) return project

  return name
}

const TTY = Boolean(process.stdout.isTTY)
const a = (str: string, code: string): string => TTY ? `\x1b[${code}m${str}\x1b[0m` : str

/** Print a styled header for the current command. */
export function banner(command: string): void {
  console.log()
  console.log(`  ${a('metaowl', '1;36')} ${a(command, '1')}  ${a(`v${version}`, '2')}`)
  console.log()
}

/** Print a step indicator: "  › message" */
export function step(msg: string): void {
  console.log(`  ${a('›', '36')} ${msg}`)
}

/** Print a success line: "  ✓ message" */
export function success(msg: string): void {
  console.log(`  ${a('✓', '32')} ${a(msg, '2')}`)
}

/** Print an error line: "  ✗ message" */
export function failure(msg: string): void {
  console.error(`  ${a('✗', '31')} ${msg}`)
}

/**
 * Run a shell command, printing a step label before and a blank line after.
 * Exits the process with code 1 on failure.
 *
 * @param label - Human-readable step description.
 * @param cmd - Shell command to execute.
 * @param opts - Additional options forwarded to execSync.
 */
export function run(label: string, cmd: string, opts: ExecSyncOptions = {}): void {
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
