import { beforeEach, describe, expect, it } from 'vitest'
import {
  configureI18n,
  createNamespacedT,
  formatCurrency,
  formatDate,
  formatNumber,
  formatRelativeTime,
  getLocale,
  i18n,
  loadLocaleMessages,
  setLocale,
  t
} from '../modules/i18n.js'

describe('i18n', () => {
  beforeEach(() => {
    configureI18n({
      locale: 'en',
      fallbackLocale: 'en',
      messages: {
        en: {
          hello: 'Hello',
          greeting: 'Hello {{name}}',
          count: {
            zero: 'No items',
            one: 'One item',
            other: '{{n}} items'
          }
        },
        de: {
          hello: 'Hallo',
          greeting: 'Hallo {{name}}'
        }
      }
    })
  })

  describe('t()', () => {
    it('translates simple key', () => {
      expect(t('hello')).toBe('Hello')
    })

    it('interpolates values', () => {
      expect(t('greeting', { name: 'World' })).toBe('Hello World')
    })

    it('returns key if translation not found', () => {
      expect(t('nonexistent.key')).toBe('nonexistent.key')
    })

    it('uses fallback locale', () => {
      configureI18n({ locale: 'fr', fallbackLocale: 'en' })
      expect(t('hello')).toBe('Hello')
    })
  })

  describe('pluralization', () => {
    it('handles zero', () => {
      expect(t('count', { n: 0 })).toBe('No items')
    })

    it('handles one', () => {
      expect(t('count', { n: 1 })).toBe('One item')
    })

    it('handles other', () => {
      expect(t('count', { n: 5 })).toBe('5 items')
    })

    it('uses fallback when form not defined', () => {
      configureI18n({
        locale: 'de',
        messages: {
          de: {
            items: {
              one: 'Ein Artikel'
            }
          }
        }
      })

      expect(t('items', { n: 2 })).toBe('Ein Artikel')
    })
  })

  describe('locale switching', () => {
    it('sets and gets locale', async () => {
      await setLocale('de')
      expect(getLocale()).toBe('de')
      expect(document.documentElement.lang).toBe('de')
    })

    it('updates html lang attribute', async () => {
      await setLocale('de')
      expect(document.documentElement.lang).toBe('de')
    })
  })

  describe('loadLocaleMessages', () => {
    it('loads messages asynchronously', async () => {
      const messages = { goodbye: 'Farewell' }
      await loadLocaleMessages('en', messages)

      expect(t('goodbye')).toBe('Farewell')
    })

    it('merges with existing messages', async () => {
      await loadLocaleMessages('en', { newKey: 'New Value' })

      expect(t('hello')).toBe('Hello')
      expect(t('newKey')).toBe('New Value')
    })
  })

  describe('formatDate', () => {
    it('formats date according to locale', () => {
      const date = new Date('2024-01-15')
      const result = formatDate(date, { dateStyle: 'short' })
      expect(result).toContain('1')
      expect(result).toContain('15')
    })
  })

  describe('formatNumber', () => {
    it('formats number according to locale', () => {
      const result = formatNumber(1234.5)
      expect(result).toContain('1')
      expect(result).toContain('5')
    })
  })

  describe('formatCurrency', () => {
    it('formats currency', () => {
      const result = formatCurrency(1234.5, 'USD')
      expect(result).toContain('$')
    })

    it('formats EUR', () => {
      const result = formatCurrency(1234.5, 'EUR')
      expect(result).toContain('€')
    })
  })

  describe('formatRelativeTime', () => {
    it('formats relative time', () => {
      const future = new Date(Date.now() + 2 * 60 * 60 * 1000)
      const result = formatRelativeTime(future)
      expect(result).toContain('2')
    })
  })

  describe('createNamespacedT', () => {
    it('creates namespaced translator', () => {
      configureI18n({
        messages: {
          en: {
            forms: {
              name: { label: 'Name' },
              email: { label: 'Email' }
            }
          }
        }
      })

      const tf = createNamespacedT('forms')
      expect(tf('name.label')).toBe('Name')
      expect(tf('email.label')).toBe('Email')
    })
  })

  describe('i18n object', () => {
    it('exposes locale getter', () => {
      expect(i18n.locale).toBe('en')
    })

    it('exposes t function', () => {
      expect(i18n.t('hello')).toBe('Hello')
    })

    it('exposes format functions', () => {
      expect(typeof i18n.formatDate).toBe('function')
      expect(typeof i18n.formatNumber).toBe('function')
      expect(typeof i18n.formatCurrency).toBe('function')
    })
  })
})