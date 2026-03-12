/**
 * @module TemplatesManager
 *
 * Template loading and merging utilities for OWL applications.
 * Supports both runtime loading (legacy) and build-time inlined templates.
 */
import { loadFile } from '@odoo/owl'

/**
 * Try to import inlined templates from build time.
 * Returns null if not available (dev mode without inline plugin or legacy setup).
 */
async function getInlinedTemplates() {
  try {
    // In production (build), templates are inlined via Vite plugin
    const { TEMPLATES } = await import('/src/templates.js')
    return TEMPLATES
  } catch (e) {
    // In development or legacy setup, templates are loaded at runtime
    return null
  }
}

/**
 * Loads and concatenates a list of OWL XML template files into a single
 * `<templates>` string ready to be passed to OWL's mount() options.
 *
 * If inlined templates are available (from build time), those are used directly.
 * Otherwise, falls back to runtime loading of individual XML files.
 *
 * @param {string[]} [files] - Array of URL-style XML paths (ignored if inlined templates exist)
 * @returns {Promise<string>}
 */
export async function mergeTemplates(files = []) {
  // Try to get inlined templates first (production build)
  const inlined = await getInlinedTemplates()
  if (inlined) {
    return inlined
  }

  // Fallback: load templates at runtime (development or legacy)
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

/**
 * Check if inlined templates are available.
 * @returns {Promise<boolean>}
 */
export async function hasInlinedTemplates() {
  const templates = await getInlinedTemplates()
  return templates !== null
}
