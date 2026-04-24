/**
 * @module i18n
 *
 * Internationalization (i18n) support for MetaOwl applications.
 */

import { reactive } from '@odoo/owl'

type PluralForm = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other'
type InterpolationValues = Record<string, unknown>
type MessageLeaf = string
interface MessagePluralMap extends Partial<Record<PluralForm, string>> {}
export interface MessageTree {
  [key: string]: MessageValue
}
export type MessageValue = MessageLeaf | MessagePluralMap | MessageTree
type LocaleMessages = Record<string, MessageTree>
type PluralRule = (count: number) => PluralForm

interface I18nConfig {
  locale?: string
  fallbackLocale?: string
  messages?: LocaleMessages
}

interface I18nLoadOptions {
  locale: string
  messages?: MessageTree | Promise<MessageTree>
  fallbackLocale?: string
}

interface I18nState {
  locale: string
  fallbackLocale: string
  messages: LocaleMessages
  loading: boolean
}

const state = reactive<I18nState>({
  locale: 'en',
  fallbackLocale: 'en',
  messages: {},
  loading: false
})

const pluralRules = new Map<string, PluralRule>()

export function setPluralizationRule(locale: string, rule: PluralRule): void {
  pluralRules.set(locale, rule)
}

function defaultPluralRule(count: number): PluralForm {
  if (count === 0) return 'zero'
  if (count === 1) return 'one'
  return 'other'
}

function getPluralForm(count: number, locale: string): PluralForm {
  const rule = pluralRules.get(locale) || defaultPluralRule
  return rule(count)
}

export function configureI18n(config: I18nConfig): void {
  if (config.locale) {
    state.locale = config.locale
    document.documentElement.lang = config.locale
  }
  if (config.fallbackLocale) {
    state.fallbackLocale = config.fallbackLocale
  }
  if (config.messages) {
    state.messages = config.messages
  }
}

export function getLocale(): string {
  return state.locale
}

export async function setLocale(locale: string): Promise<void> {
  state.locale = locale
  document.documentElement.lang = locale
}

export async function loadLocaleMessages(locale: string, messages: MessageTree | Promise<MessageTree>): Promise<void> {
  state.loading = true

  try {
    const loaded = await messages
    if (!state.messages[locale]) {
      state.messages[locale] = {}
    }
    Object.assign(state.messages[locale], loaded)
  } finally {
    state.loading = false
  }
}

export async function load(options: I18nLoadOptions): Promise<void> {
  const { locale, messages, fallbackLocale } = options

  if (fallbackLocale) {
    state.fallbackLocale = fallbackLocale
  }

  state.locale = locale
  document.documentElement.lang = locale

  if (messages) {
    await loadLocaleMessages(locale, messages)
  }
}

export function t(key: string, values: InterpolationValues = {}, defaultMessage?: string): string {
  const locale = state.locale
  const fallbackLocale = state.fallbackLocale

  let message = getMessage(key, locale)
  if (!message && locale !== fallbackLocale) {
    message = getMessage(key, fallbackLocale)
  }

  if (!message) {
    return defaultMessage || key
  }

  if (isPluralMessage(message)) {
    const countValue = values.n ?? values.count ?? 0
    const count = typeof countValue === 'number' ? countValue : Number(countValue)
    const form = getPluralForm(Number.isNaN(count) ? 0 : count, locale)
    message = message[form] || message.other || message.one || key
  }

  if (typeof message !== 'string') {
    return defaultMessage || key
  }

  return interpolate(message, values)
}

function getMessage(key: string, locale: string): MessageValue | undefined {
  const parts = key.split('.')
  let current: MessageValue | undefined = state.messages[locale]

  for (const part of parts) {
    if (!current || typeof current !== 'object') {
      return undefined
    }

    current = (current as MessageTree)[part]
  }

  return current
}

function isPluralMessage(message: MessageValue): message is MessagePluralMap {
  if (!message || typeof message !== 'object' || Array.isArray(message)) {
    return false
  }

  const keys = Object.keys(message)
  return keys.some((key) => ['zero', 'one', 'two', 'few', 'many', 'other'].includes(key))
}

function interpolate(message: string, values: InterpolationValues): string {
  return message.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    return values[key] !== undefined ? String(values[key]) : match
  })
}

export function formatDate(date: Date | number | string, options: Intl.DateTimeFormatOptions = {}): string {
  return new Intl.DateTimeFormat(state.locale, options).format(new Date(date))
}

export function formatNumber(value: number, options: Intl.NumberFormatOptions = {}): string {
  return new Intl.NumberFormat(state.locale, options).format(value)
}

export function formatCurrency(amount: number, currency: string, options: Intl.NumberFormatOptions = {}): string {
  return new Intl.NumberFormat(state.locale, {
    style: 'currency',
    currency,
    ...options
  }).format(amount)
}

export function formatRelativeTime(date: Date | number | string, style: Intl.RelativeTimeFormatStyle = 'long'): string {
  const targetDate = new Date(date)
  const now = new Date()
  const diff = targetDate.getTime() - now.getTime()

  const seconds = Math.round(diff / 1000)
  const minutes = Math.round(seconds / 60)
  const hours = Math.round(minutes / 60)
  const days = Math.round(hours / 24)

  const rtf = new Intl.RelativeTimeFormat(state.locale, { style })

  if (Math.abs(seconds) < 60) return rtf.format(seconds, 'second')
  if (Math.abs(minutes) < 60) return rtf.format(minutes, 'minute')
  if (Math.abs(hours) < 24) return rtf.format(hours, 'hour')
  return rtf.format(days, 'day')
}

export const i18n = {
  get locale(): string { return state.locale },
  get fallbackLocale(): string { return state.fallbackLocale },
  get loading(): boolean { return state.loading },
  get messages(): LocaleMessages { return state.messages },
  configure: configureI18n,
  setLocale,
  load,
  loadLocaleMessages,
  t,
  formatDate,
  formatNumber,
  formatCurrency,
  formatRelativeTime
}

export function createNamespacedT(namespace: string): (key: string, values?: InterpolationValues) => string {
  return (key, values) => t(`${namespace}.${key}`, values)
}

setPluralizationRule('de', (count) => {
  if (count === 0) return 'zero'
  if (count === 1) return 'one'
  return 'other'
})

setPluralizationRule('ru', (count) => {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return 'one'
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return 'few'
  if (mod10 === 0 || [5, 6, 7, 8, 9].includes(mod10) || [11, 12, 13, 14].includes(mod100)) return 'many'
  return 'other'
})