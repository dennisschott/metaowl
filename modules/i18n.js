/**
 * @module i18n
 *
 * Internationalization (i18n) support for MetaOwl applications.
 *
 * Features:
 * - Translation function t()
 * - Locale switching
 * - Pluralization support
 * - Interpolation: {{variable}}
 * - Named formats
 * - Async locale loading
 * - Fallback locales
 *
 * @example
 * import { i18n, t } from 'metaowl'
 *
 * // Configure
 * i18n.configure({
 *   locale: 'de',
 *   fallbackLocale: 'en',
 *   messages: {
 *     en: { hello: 'Hello {{name}}' },
 *     de: { hello: 'Hallo {{name}}' }
 *   }
 * })
 *
 * // Use in templates
 * t('hello', { name: 'World' }) // 'Hallo World'
 *
 * // Use in OWL templates
 * xml`<span t-esc="t('hello', { name: state.user })" />`
 */

import { reactive } from '@odoo/owl'

/**
 * Reactive i18n state.
 */
const _state = reactive({
  locale: 'en',
  fallbackLocale: 'en',
  messages: {},
  loading: false
})

/**
 * Default pluralization rules.
 */
const _pluralRules = new Map()

/**
 * Configure pluralization for a locale.
 *
 * @param {string} locale
 * @param {Function} rule - (count) => form ('zero'|'one'|'two'|'few'|'many'|'other')
 */
export function setPluralizationRule(locale, rule) {
  _pluralRules.set(locale, rule)
}

/**
 * Default pluralization (English-like).
 *
 * @param {number} count
 * @returns {string}
 */
function defaultPluralRule(count) {
  if (count === 0) return 'zero'
  if (count === 1) return 'one'
  return 'other'
}

/**
 * Get plural form for count and locale.
 *
 * @param {number} count
 * @param {string} locale
 * @returns {string}
 */
function getPluralForm(count, locale) {
  const rule = _pluralRules.get(locale) || defaultPluralRule
  return rule(count)
}

/**
 * Configure i18n settings.
 *
 * @param {object} config
 * @param {string} [config.locale='en']
 * @param {string} [config.fallbackLocale='en']
 * @param {object} [config.messages={}]
 * @param {boolean} [config.warnOnMissing=true]
 */
export function configureI18n(config) {
  if (config.locale) {
    _state.locale = config.locale
    document.documentElement.lang = config.locale
  }
  if (config.fallbackLocale) {
    _state.fallbackLocale = config.fallbackLocale
  }
  if (config.messages) {
    _state.messages = config.messages
  }
}

/**
 * Get current locale.
 *
 * @returns {string}
 */
export function getLocale() {
  return _state.locale
}

/**
 * Set current locale.
 *
 * @param {string} locale
 * @returns {Promise<void>}
 */
export async function setLocale(locale) {
  _state.locale = locale
  document.documentElement.lang = locale
}

/**
 * Load locale messages asynchronously.
 *
 * @param {string} locale
 * @param {object|Promise<object>} messages
 */
export async function loadLocaleMessages(locale, messages) {
  _state.loading = true
  try {
    const loaded = await messages
    if (!_state.messages[locale]) {
      _state.messages[locale] = {}
    }
    Object.assign(_state.messages[locale], loaded)
  } finally {
    _state.loading = false
  }
}

/**
 * Translate a key with optional interpolation.
 *
 * @param {string} key - Dot-notation key (e.g., 'messages.hello')
 * @param {object} [values] - Interpolation values
 * @param {string} [defaultMessage] - Fallback message
 * @returns {string} Translated string
 *
 * @example
 * t('hello') // 'Hello'
 * t('hello', { name: 'World' }) // 'Hello World'
 * t('count', { n: 5 }) // Uses plural forms
 */
export function t(key, values = {}, defaultMessage) {
  const locale = _state.locale
  const fallbackLocale = _state.fallbackLocale

  // Get message
  let message = getMessage(key, locale)

  // Fallback
  if (!message && locale !== fallbackLocale) {
    message = getMessage(key, fallbackLocale)
  }

  // Still not found
  if (!message) {
    return defaultMessage || key
  }

  // Handle pluralization
  if (typeof message === 'object') {
    const count = values.n || values.count || 0
    const form = getPluralForm(count, locale)
    message = message[form] || message.other || message.one || key
  }

  // Interpolate
  return interpolate(message, values)
}

/**
 * Get message by dot-notation key.
 *
 * @param {string} key
 * @param {string} locale
 * @returns {string|object|undefined}
 */
function getMessage(key, locale) {
  const parts = key.split('.')
  let current = _state.messages[locale]

  for (const part of parts) {
    if (!current || typeof current !== 'object') {
      return undefined
    }
    current = current[part]
  }

  return current
}

/**
 * Interpolate values into message.
 *
 * @param {string} message
 * @param {object} values
 * @returns {string}
 */
function interpolate(message, values) {
  return message.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return values[key] !== undefined ? values[key] : match
  })
}

/**
 * Format a date according to locale.
 *
 * @param {Date|number|string} date
 * @param {object} [options] - Intl.DateTimeFormat options
 * @returns {string}
 */
export function formatDate(date, options = {}) {
  const d = new Date(date)
  return new Intl.DateTimeFormat(_state.locale, options).format(d)
}

/**
 * Format a number according to locale.
 *
 * @param {number} number
 * @param {object} [options] - Intl.NumberFormat options
 * @returns {string}
 */
export function formatNumber(number, options = {}) {
  return new Intl.NumberFormat(_state.locale, options).format(number)
}

/**
 * Format currency according to locale.
 *
 * @param {number} amount
 * @param {string} currency - Currency code (e.g., 'USD', 'EUR')
 * @param {object} [options]
 * @returns {string}
 */
export function formatCurrency(amount, currency, options = {}) {
  return new Intl.NumberFormat(_state.locale, {
    style: 'currency',
    currency,
    ...options
  }).format(amount)
}

/**
 * Format relative time (e.g., "2 hours ago").
 *
 * @param {Date|number|string} date
 * @param {string} [style='long'] - 'long'|'short'|'narrow'
 * @returns {string}
 */
export function formatRelativeTime(date, style = 'long') {
  const d = new Date(date)
  const now = new Date()
  const diff = d.getTime() - now.getTime()

  const seconds = Math.round(diff / 1000)
  const minutes = Math.round(seconds / 60)
  const hours = Math.round(minutes / 60)
  const days = Math.round(hours / 24)

  const rtf = new Intl.RelativeTimeFormat(_state.locale, { style })

  if (Math.abs(seconds) < 60) return rtf.format(seconds, 'second')
  if (Math.abs(minutes) < 60) return rtf.format(minutes, 'minute')
  if (Math.abs(hours) < 24) return rtf.format(hours, 'hour')
  return rtf.format(days, 'day')
}

/**
 * i18n helper for OWL templates.
 * Use as: t-esc="i18n.t('key', values)"
 */
export const i18n = {
  get locale() { return _state.locale },
  get fallbackLocale() { return _state.fallbackLocale },
  get loading() { return _state.loading },
  get messages() { return _state.messages },
  configure: configureI18n,
  setLocale,
  t,
  formatDate,
  formatNumber,
  formatCurrency,
  formatRelativeTime
}

/**
 * Create a namespaced translation function.
 *
 * @param {string} namespace - e.g., 'forms', 'errors'
 * @returns {Function} - (key, values) => string
 *
 * @example
 * const tf = createNamespacedT('forms')
 * tf('name.label') // Same as t('forms.name.label')
 */
export function createNamespacedT(namespace) {
  return (key, values) => t(`${namespace}.${key}`, values)
}

// Set up German pluralization
setPluralizationRule('de', (count) => {
  if (count === 0) return 'zero'
  if (count === 1) return 'one'
  return 'other'
})

// Set up Russian pluralization (complex)
setPluralizationRule('ru', (count) => {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return 'one'
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return 'few'
  if (mod10 === 0 || [5, 6, 7, 8, 9].includes(mod10) || [11, 12, 13, 14].includes(mod100)) return 'many'
  return 'other'
})
