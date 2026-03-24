/**
 * @module Link
 *
 * SPA Link component for metaowl with automatic external link detection.
 *
 * This component renders a link that navigates via history.pushState
 * for internal targets (without page reload) and navigates normally
 * for external targets.
 *
 * Features:
 * - Automatic detection of external links (http://, https://, //, mailto:, tel:, etc.)
 * - SPA navigation for internal links (no page reload)
 * - Support for active link styling
 * - Respects modifier keys (Ctrl, Meta, Alt) for normal browser navigation
 * - Accessible links with correct href attributes
 *
 * @example
 * // Internal link
 * <t-link to="/about">About Us</t-link>
 *
 * // With CSS classes
 * <t-link to="/user/profile" class="btn btn-primary">Profile</t-link>
 *
 * // Active link styling
 * <t-link to="/about" activeClass="active">About Us</t-link>
 *
 * // External link (automatically detected)
 * <t-link to="https://example.com">External</t-link>
 */

import { Component, useState, onMounted, onWillUnmount } from '@odoo/owl'

/**
 * Regex for detecting external URLs.
 * Matches: http://, https://, // (protocol-relative), mailto:, tel:, ftp:, etc.
 * @type {RegExp}
 */
const EXTERNAL_URL_REGEX = /^(https?:|\/\/|mailto:|tel:|ftp:|file:|javascript:)/i

/**
 * Checks if a URL is external.
 *
 * @param {string} url - The URL to check
 * @returns {boolean} True if external
 */
function isExternalUrl(url) {
  if (!url || typeof url !== 'string') return false
  return EXTERNAL_URL_REGEX.test(url)
}

/**
 * Checks if a link is considered "active" (for styling).
 *
 * @param {string} linkPath - The link path
 * @param {string} currentPath - The current path
 * @returns {boolean} True if active
 */
function isActiveLink(linkPath, currentPath) {
  if (!linkPath || !currentPath) return false
  // Exact match or subpath
  const normalizedLink = linkPath.replace(/\/$/, '') || '/'
  const normalizedCurrent = currentPath.replace(/\/$/, '') || '/'
  return normalizedCurrent === normalizedLink ||
    (normalizedLink !== '/' && normalizedCurrent.startsWith(normalizedLink + '/'))
}

/**
 * Link component for SPA navigation.
 *
 * Renders an <a> element that performs internal navigation
 * without page reload.
 */
export class Link extends Component {
  static template = 'Link'
  static props = {
    to: { type: String, optional: false },
    class: { type: String, optional: true },
    activeClass: { type: String, optional: true },
    target: { type: String, optional: true },
    rel: { type: String, optional: true },
    title: { type: String, optional: true },
    download: { type: [String, Boolean], optional: true },
    hreflang: { type: String, optional: true },
    type: { type: String, optional: true },
    ping: { type: String, optional: true },
    referrerpolicy: { type: String, optional: true },
    media: { type: String, optional: true },
    '*': true,
  }

  setup() {
    this.state = useState({
      isActive: false
    })

    // Reference to navigation function (injected from outside)
    this._navigate = null

    onMounted(() => {
      this._updateActiveState()
      // Listen to PopState events for updating active status
      window.addEventListener('popstate', this._updateActiveState)
    })

    onWillUnmount(() => {
      window.removeEventListener('popstate', this._updateActiveState)
    })

    this._updateActiveState = () => {
      if (this.props.activeClass) {
        this.state.isActive = isActiveLink(this.props.to, document.location.pathname)
      }
    }
  }

  /**
   * Getter for combined CSS classes.
   * @returns {string}
   */
  get linkClasses() {
    const classes = []
    if (this.props.class) {
      classes.push(this.props.class)
    }
    if (this.state.isActive && this.props.activeClass) {
      classes.push(this.props.activeClass)
    }
    return classes.join(' ')
  }

  /**
   * Getter for the rel attribute.
   * Automatically adds noopener noreferrer for external links with target="_blank".
   * @returns {string|undefined}
   */
  get linkRel() {
    if (this.props.rel) return this.props.rel
    if (isExternalUrl(this.props.to) && this.props.target === '_blank') {
      return 'noopener noreferrer'
    }
    return undefined
  }

  /**
   * Forward unknown component props as native <a> attributes.
   * This allows id/style/aria-* / data-* and similar anchor attributes.
   * @returns {Record<string, any>}
   */
  get forwardedAttrs() {
    const attrs = { ...this.props }
    delete attrs.to
    delete attrs.class
    delete attrs.activeClass
    delete attrs.target
    delete attrs.rel
    delete attrs.title
    delete attrs.download
    return attrs
  }

  /**
   * Handler for click events.
   * Checks if SPA navigation is possible or normal navigation should be used.
   *
   * @param {MouseEvent} ev - The click event
   */
  onClick(ev) {
    const url = this.props.to

    // External URLs: Normal navigation
    if (isExternalUrl(url)) {
      return // Let browser handle normal navigation
    }

    // Modifier keys: Normal navigation (new tab, download, etc.)
    if (ev.ctrlKey || ev.metaKey || ev.altKey || ev.shiftKey) {
      return
    }

    // Right click: Context menu
    if (ev.button !== 0) {
      return
    }

    // Download link: Normal navigation
    if (this.props.download) {
      return
    }

    // Internal SPA navigation
    ev.preventDefault()

    // Update URL immediately so components reading window.location.pathname
    // (e.g. isActive in sidebar) already see the correct path when the new
    // app mounts. The generation counter in _spaNavigate guarantees that only
    // the last-triggered navigation actually calls mountApp.
    window.history.pushState({ path: url }, '', url)

    if (typeof window.__metaowlNavigate === 'function') {
      window.__metaowlNavigate(url)
    } else {
      // Fallback: normal navigation (URL already updated above)
      window.location.href = url
    }
  }
}

/**
 * Template for the Link component.
 * Must be registered in the app's templates file or loaded dynamically.
 */
export const LinkTemplate = /* xml */ `
<templates>
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
</templates>
`

/**
 * Helper function to register the Link template.
 * Called automatically on app startup.
 *
 * @param {object} templates - The app's templates object
 * @returns {string|void} Modified templates if string was passed
 */
export function registerLinkTemplate(templates) {
  if (typeof templates === 'string') {
    // If templates is a string, add the Link template
    // Remove outer <templates> tags from LinkTemplate
    const linkContent = LinkTemplate
      .replace('<templates>', '')
      .replace('</templates>', '')
      .trim()
    // Insert before closing </templates> tag
    return templates.replace('</templates>', linkContent + '\n</templates>')
  }
  // If templates is an object, register the template
  if (templates && typeof templates === 'object') {
    templates.Link = LinkTemplate
  }
}

export default Link
