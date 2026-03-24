import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mergeTemplates, getInternalTemplates } from '../modules/templates-manager.js'

vi.mock('@odoo/owl', () => ({
  loadFile: vi.fn(),
}))

import { loadFile } from '@odoo/owl'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('mergeTemplates', () => {
  it('returns wrapped templates string from a single file', async () => {
    loadFile.mockResolvedValue('<t t-name="Comp"><div/></t>')
    const result = await mergeTemplates(['/components/Comp.xml'])
    expect(result).toContain('<templates>')
    expect(result).toContain('<t t-name="Comp"><div/></t>')
    expect(result).toContain('</templates>')
    expect(result).toContain('t-name="Link"') // Internal Link template
  })

  it('concatenates multiple template files', async () => {
    loadFile
      .mockResolvedValueOnce('<t t-name="A"><div/></t>')
      .mockResolvedValueOnce('<t t-name="B"><span/></t>')
    const result = await mergeTemplates(['/A.xml', '/B.xml'])
    expect(result).toContain('<templates>')
    expect(result).toContain('<t t-name="A"><div/></t>')
    expect(result).toContain('<t t-name="B"><span/></t>')
    expect(result).toContain('</templates>')
    expect(result).toContain('t-name="Link"') // Internal Link template
  })

  it('returns templates with internal components for empty array', async () => {
    const result = await mergeTemplates([])
    expect(result).toContain('<templates>')
    expect(result).toContain('</templates>')
    expect(result).toContain('t-name="Link"') // Internal Link template
  })

  it('skips failed files and logs error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    loadFile.mockRejectedValue(new Error('404'))
    const result = await mergeTemplates(['/missing.xml'])
    expect(result).toContain('<templates>')
    expect(result).toContain('</templates>')
    expect(result).toContain('t-name="Link"') // Internal Link template despite error
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[metaowl] Failed to load template: /missing.xml'),
      expect.any(Error)
    )
    consoleSpy.mockRestore()
  })

  it('collects successful files even when one fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    loadFile
      .mockResolvedValueOnce('<t t-name="Good"><div/></t>')
      .mockRejectedValueOnce(new Error('404'))
      .mockResolvedValueOnce('<t t-name="Also"><span/></t>')
    const result = await mergeTemplates(['/good.xml', '/missing.xml', '/also.xml'])
    expect(result).toContain('<t t-name="Good"><div/></t>')
    expect(result).toContain('<t t-name="Also"><span/></t>')
    expect(result).toContain('t-name="Link"') // Internal Link template
    consoleSpy.mockRestore()
  })

  it('includes internal Link component template', async () => {
    const templates = getInternalTemplates()
    expect(templates.length).toBeGreaterThan(0)
    expect(templates[0]).toContain('t-name="Link"')
    expect(templates[0]).toContain('<a')
    expect(templates[0]).toContain('t-att-href')
  })

  it('calls loadFile once per path', async () => {
    loadFile.mockResolvedValue('<t/>')
    await mergeTemplates(['/a.xml', '/b.xml', '/c.xml'])
    expect(loadFile).toHaveBeenCalledTimes(3)
  })
})
