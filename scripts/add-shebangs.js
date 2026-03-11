#!/usr/bin/env node
/**
 * Adds shebang lines to compiled bin files after TypeScript build.
 * TypeScript compiler strips shebangs from source files.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const binDir = join(process.cwd(), 'dist', 'bin')
const bins = [
  'metaowl-build.js',
  'metaowl-create.js',
  'metaowl-dev.js',
  'metaowl-generate.js',
  'metaowl-lint.js'
]

const shebang = '#!/usr/bin/env node\n'

for (const bin of bins) {
  const filePath = join(binDir, bin)
  try {
    const content = readFileSync(filePath, 'utf-8')
    if (!content.startsWith('#!')) {
      writeFileSync(filePath, shebang + content, 'utf-8')
      console.log(`✓ Added shebang to ${bin}`)
    } else {
      console.log(`✓ Shebang already present in ${bin}`)
    }
  } catch (error) {
    console.error(`✗ Failed to process ${bin}:`, error.message)
    process.exit(1)
  }
}

console.log('\n✓ All bin files have shebang lines')
