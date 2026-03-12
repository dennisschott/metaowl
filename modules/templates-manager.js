/**
 * @module TemplatesManager
 *
 * Template loading and merging utilities for OWL applications.
 */
import { loadFile } from '@odoo/owl'

/**
 * Loads and concatenates a list of OWL XML template files into a single
 * `<templates>` string ready to be passed to OWL's mount() options.
 *
 * @param {string[]} files - Array of URL-style XML paths, e.g. ['/owl/components/Header/Header.xml']
 * @returns {Promise<string>}
 */
export async function mergeTemplates(files) {
  let templates = '<templates>'
  for (const file of files) {
    try {
      templates += await loadFile(file)
    } catch (e) {
      console.error(`[metaowl] Failed to load template: ${file}`, e)
    }
  }
  return templates + '</templates>'
}
