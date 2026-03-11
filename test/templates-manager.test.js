import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mergeTemplates } from '../modules/templates-manager.js'

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
    expect(result).toBe('<templates><t t-name="Comp"><div/></t></templates>')
  })

  it('concatenates multiple template files', async () => {
    loadFile
      .mockResolvedValueOnce('<t t-name="A"><div/></t>')
      .mockResolvedValueOnce('<t t-name="B"><span/></t>')
    const result = await mergeTemplates(['/A.xml', '/B.xml'])
    expect(result).toBe('<templates><t t-name="A"><div/></t><t t-name="B"><span/></t></templates>')
  })

  it('returns empty templates tag for empty array', async () => {
    const result = await mergeTemplates([])
    expect(result).toBe('<templates></templates>')
  })

  it('skips failed files and logs error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    loadFile.mockRejectedValue(new Error('404'))
    const result = await mergeTemplates(['/missing.xml'])
    expect(result).toBe('<templates></templates>')
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
    expect(result).toBe('<templates><t t-name="Good"><div/></t><t t-name="Also"><span/></t></templates>')
    consoleSpy.mockRestore()
  })

  it('calls loadFile once per path', async () => {
    loadFile.mockResolvedValue('<t/>')
    await mergeTemplates(['/a.xml', '/b.xml', '/c.xml'])
    expect(loadFile).toHaveBeenCalledTimes(3)
  })
})
