/**
 * @module TemplatesManager
 *
 * Template loading and merging utilities for OWL applications.
 */
import { loadFile } from '@odoo/owl'

/**
 * Link component template.
 * Automatically added to all templates.
 * @type {string}
 */
const LINK_COMPONENT_TEMPLATE = /* xml */ `
  <t t-name="Link">
    <a
      t-att="forwardedAttrs"
      t-att-href="props.to"
      t-att-class="linkClasses"
      t-att-target="props.target"
      t-att-rel="linkRel"
      t-att-title="props.title"
      t-att-download="props.download"
      t-on-click="onClick"
    >
      <t t-slot="default"/>
    </a>
  </t>
`

/**
 * Internal templates that are automatically added.
 * @type {string[]}
 */
const INTERNAL_TEMPLATES = [
  LINK_COMPONENT_TEMPLATE
]

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
      // If already wrapped (merged templates.xml), return as-is with internal templates
      if (content.trim().startsWith('<templates>')) {
        return content.replace('</templates>', INTERNAL_TEMPLATES.join('') + '</templates>')
      }
      // Otherwise wrap it with internal templates
      return '<templates>' + content + INTERNAL_TEMPLATES.join('') + '</templates>'
    } catch (e) {
      console.error(`[metaowl] Failed to load template: ${fileArray[0]}`, e)
      return '<templates>' + INTERNAL_TEMPLATES.join('') + '</templates>'
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
  return '<templates>' + results.join('') + INTERNAL_TEMPLATES.join('') + '</templates>'
}

/**
 * Gibt die internen Templates zurück.
 * Nützlich für Testing oder manuelle Template-Registrierung.
 *
 * @returns {string[]}
 */
export function getInternalTemplates() {
  return [...INTERNAL_TEMPLATES]
}
