/**
 * @module Link
 *
 * SPA Link component for metaowl with automatic external link detection.
 */

import { Component, onMounted, onWillUnmount, useState } from '@odoo/owl'
import { EXTERNAL_URL_REGEX } from './constants.js'

declare global {
  interface Window {
    __metaowlNavigate?: (path: string) => void
  }
}

interface LinkProps {
  to: string
  class?: string
  activeClass?: string
  target?: string
  rel?: string
  title?: string
  download?: string | boolean
  hreflang?: string
  type?: string
  ping?: string
  referrerpolicy?: string
  media?: string
  [key: string]: unknown
}

function isExternalUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false
  return EXTERNAL_URL_REGEX.test(url)
}

function isActiveLink(linkPath: string, currentPath: string): boolean {
  if (!linkPath || !currentPath) return false
  const normalizedLink = linkPath.replace(/\/$/, '') || '/'
  const normalizedCurrent = currentPath.replace(/\/$/, '') || '/'
  return normalizedCurrent === normalizedLink ||
    (normalizedLink !== '/' && normalizedCurrent.startsWith(normalizedLink + '/'))
}

export class Link extends Component {
  static template = 'Link'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static props: any = {
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
    '*': true
  }

  declare props: LinkProps
  state!: { isActive: boolean }
  _navigate: ((path: string) => void) | null = null
  _updateActiveState: () => void = () => {}

  setup(): void {
    this.state = useState({
      isActive: false
    })

    this._updateActiveState = () => {
      if (this.props.activeClass) {
        this.state.isActive = isActiveLink(this.props.to, document.location.pathname)
      }
    }

    onMounted(() => {
      this._updateActiveState()
      window.addEventListener('popstate', this._updateActiveState)
    })

    onWillUnmount(() => {
      window.removeEventListener('popstate', this._updateActiveState)
    })
  }

  get linkClasses(): string {
    const classes: string[] = []
    if (this.props.class) {
      classes.push(this.props.class)
    }
    if (this.state.isActive && this.props.activeClass) {
      classes.push(this.props.activeClass)
    }
    return classes.join(' ')
  }

  get linkRel(): string | undefined {
    if (this.props.rel) return this.props.rel
    if (isExternalUrl(this.props.to) && this.props.target === '_blank') {
      return 'noopener noreferrer'
    }
    return undefined
  }

  get forwardedAttrs(): Record<string, unknown> {
    const attrs: Record<string, unknown> = { ...this.props }
    delete attrs.to
    delete attrs.class
    delete attrs.activeClass
    delete attrs.target
    delete attrs.rel
    delete attrs.title
    delete attrs.download
    return attrs
  }

  onClick(ev: MouseEvent): void {
    const url = this.props.to

    if (isExternalUrl(url)) {
      return
    }

    if (ev.ctrlKey || ev.metaKey || ev.altKey || ev.shiftKey) {
      return
    }

    if (ev.button !== 0) {
      return
    }

    if (this.props.download) {
      return
    }

    ev.preventDefault()

    window.history.pushState({ path: url }, '', url)

    if (typeof window.__metaowlNavigate === 'function') {
      window.__metaowlNavigate(url)
    } else {
      window.location.href = url
    }
  }
}

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

export function registerLinkTemplate(templates: string | Record<string, string>): string | void {
  if (typeof templates === 'string') {
    const linkContent = LinkTemplate
      .replace('<templates>', '')
      .replace('</templates>', '')
      .trim()
    return templates.replace('</templates>', linkContent + '\n</templates>')
  }

  if (templates && typeof templates === 'object') {
    templates.Link = LinkTemplate
  }
}

export default Link