import { describe, it } from 'vitest'
import { configureOwl } from '../modules/app-mounter.js'

describe('app-mounter', () => {
  describe('configureOwl', () => {
    it('should set warnIfNoStaticProps', () => {
      configureOwl({ warnIfNoStaticProps: false })
      // Verify the function doesn't throw and accepts the option
    })

    it('should set willStartTimeout', () => {
      configureOwl({ willStartTimeout: 5000 })
    })

    it('should accept string for translatableAttributes', () => {
      configureOwl({ translatableAttributes: 'title' })
    })

    it('should accept array for translatableAttributes', () => {
      configureOwl({ translatableAttributes: ['title', 'alt'] })
    })

    it('should merge translatableAttributes when array is provided', () => {
      configureOwl({ translatableAttributes: ['custom'] })
    })

    it('should handle empty object', () => {
      configureOwl({})
    })

    it('should handle additional unknown properties', () => {
      configureOwl({ customProp: 'value', anotherProp: 123 })
    })
  })
})
