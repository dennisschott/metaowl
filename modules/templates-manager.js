/**
 * @module TemplatesManager
 *
 * Template loading and merging utilities for OWL applications.
 */
import { loadFile } from '@odoo/owl'

/**
 * Loads OWL XML template(s) into a string ready to be passed to OWL's mount() options.
 *
 * If a single file is provided that already contains <templates> wrapper (merged file),
 * it's returned as-is. Otherwise, the content is wrapped in <templates>.
 *
 * @param {string|string[]} files - Array of URL-style XML paths or single path
 * @returns {Promise<string>}
 */
export async function mergeTemplates(files) {
  // Normalize to array
  const fileArray = Array.isArray(files) ? files : [files]

  // If there's only one file, check if it's already wrapped
  if (fileArray.length === 1) {
    try {
      const content = await loadFile(fileArray[0])
      // If already wrapped (merged templates.xml), return as-is
      if (content.trim().startsWith('<templates>')) {
        return content
      }
      // Otherwise wrap it
      return '<templates>' + content + '</templates>'
    } catch (e) {
      console.error(`[metaowl] Failed to load template: ${fileArray[0]}`, e)
      return '<templates></templates>'
    }
  }

  // Multiple files: load each and wrap in <templates>
  const results = await Promise.all(
    fileArray.map(async (file) => {
      try {
        return await loadFile(file)
      } catch (e) {
        console.error(`[metaowl] Failed to load template: ${file}`, e)
        return ''
      }
    })
  )
  return '<templates>' + results.join('') + '</templates>'
}
