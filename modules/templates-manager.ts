/**
 * @module TemplatesManager
 *
 * Template loading and merging utilities for OWL applications.
 */
import { loadFile } from '@odoo/owl'

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

const INTERNAL_TEMPLATES: string[] = [LINK_COMPONENT_TEMPLATE]

export async function mergeTemplates(files: string | string[]): Promise<string> {
  const fileArray = Array.isArray(files) ? files : [files]

  if (fileArray.length === 1) {
    try {
      const content = await loadFile(fileArray[0])
      if (content.trim().startsWith('<templates>')) {
        return content.replace('</templates>', INTERNAL_TEMPLATES.join('') + '</templates>')
      }

      return '<templates>' + content + INTERNAL_TEMPLATES.join('') + '</templates>'
    } catch (error) {
      console.error(`[metaowl] Failed to load template: ${fileArray[0]}`, error)
      return '<templates>' + INTERNAL_TEMPLATES.join('') + '</templates>'
    }
  }

  const results = await Promise.all(
    fileArray.map(async (file) => {
      try {
        return await loadFile(file)
      } catch (error) {
        console.error(`[metaowl] Failed to load template: ${file}`, error)
        return ''
      }
    })
  )

  return '<templates>' + results.join('') + INTERNAL_TEMPLATES.join('') + '</templates>'
}

export function getInternalTemplates(): string[] {
  return [...INTERNAL_TEMPLATES]
}