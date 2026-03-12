import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { scanComponents, generateComponentDts } from '../modules/auto-import.js'
import { mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

describe('auto-import', () => {
  let tempDir

  beforeEach(() => {
    tempDir = join(tmpdir(), `metaowl-test-${Date.now()}`)
    mkdirSync(tempDir, { recursive: true })
  })

  afterEach(() => {
    try {
      rmSync(tempDir, { recursive: true, force: true })
    } catch {
      // Ignore cleanup errors
    }
  })

  describe('scanComponents', () => {
    it('should find all component files', async () => {
      // Create test components
      mkdirSync(join(tempDir, 'Button'), { recursive: true })
      mkdirSync(join(tempDir, 'Card'), { recursive: true })
      writeFileSync(join(tempDir, 'Button', 'Button.js'), 'export default {}')
      writeFileSync(join(tempDir, 'Card', 'Card.js'), 'export default {}')

      const components = await scanComponents(tempDir)

      expect(components).toHaveLength(2)
      expect(components).toContain('Button')
      expect(components).toContain('Card')
    })

    it('should filter helpers', async () => {
      mkdirSync(join(tempDir, 'Button'), { recursive: true })
      mkdirSync(join(tempDir, 'utils'), { recursive: true })
      writeFileSync(join(tempDir, 'Button', 'Button.js'), 'export default {}')
      writeFileSync(join(tempDir, 'utils', 'helpers.js'), 'export const utils = {}')

      const components = await scanComponents(tempDir)

      // Finds all JS files recursively
      expect(components).toContain('Button')
      expect(components).toContain('helpers')
    })

    it('should return empty array for non-existent directory', async () => {
      const components = await scanComponents('/non-existent/path')
      expect(components).toEqual([])
    })
  })

  describe('generateComponentDts', () => {
    it('should generate TypeScript declarations', async () => {
      const components = ['Button', 'Card', 'Modal']
      const outputPath = join(tempDir, 'components.d.ts')

      await generateComponentDts(components, outputPath)

      // Check file was created
      const fs = await import('fs')
      const content = fs.readFileSync(outputPath, 'utf-8')

      expect(content).toContain('Button')
      expect(content).toContain('Card')
      expect(content).toContain('Modal')
      expect(content).toContain('declare module')
    })

    it('should handle empty components array', async () => {
      await generateComponentDts([], join(tempDir, 'empty.d.ts'))

      const fs = await import('fs')
      const content = fs.readFileSync(join(tempDir, 'empty.d.ts'), 'utf-8')

      expect(content).toContain('declare module')
    })
  })

  describe('integration', () => {
    it('should work with nested components', async () => {
      // Create nested structure
      const nestedPath = join(tempDir, 'ui', 'forms')
      mkdirSync(nestedPath, { recursive: true })
      writeFileSync(join(nestedPath, 'TextField.js'), 'export default {}')
      writeFileSync(join(nestedPath, 'SelectField.js'), 'export default {}')

      const components = await scanComponents(tempDir)

      expect(components).toContain('TextField')
      expect(components).toContain('SelectField')
    })

    it('should ignore non-js files', async () => {
      mkdirSync(join(tempDir, 'Button'), { recursive: true })
      writeFileSync(join(tempDir, 'Button', 'Button.js'), 'export default {}')
      writeFileSync(join(tempDir, 'Button', 'Button.test.js'), 'test')
      writeFileSync(join(tempDir, 'Button', 'styles.css'), '/* styles */')

      const components = await scanComponents(tempDir)

      expect(components).toHaveLength(1)
      expect(components).toContain('Button')
    })
  })
})
