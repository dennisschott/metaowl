import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  onError,
  setErrorContext,
  getErrorContext,
  clearErrorContext,
  captureError,
  initGlobalErrorHandling
} from '../modules/error-boundary.js'

describe('Error Boundary', () => {
  beforeEach(() => {
    clearErrorContext()
    // Clear all handlers
    vi.clearAllMocks()
  })

  describe('onError', () => {
    it('registers an error handler', () => {
      const handler = vi.fn()
      const unsubscribe = onError(handler)

      // Simulate error
      const error = new Error('Test error')
      captureError(error)

      expect(handler).toHaveBeenCalled()
      unsubscribe()
    })

    it('returns unsubscribe function', () => {
      const handler = vi.fn()
      const unsubscribe = onError(handler)

      unsubscribe()

      // Simulate error after unsubscribe
      const error = new Error('Test error')
      captureError(error)

      expect(handler).not.toHaveBeenCalled()
    })

    it('calls multiple handlers', () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()

      onError(handler1)
      onError(handler2)

      const error = new Error('Test error')
      captureError(error)

      expect(handler1).toHaveBeenCalled()
      expect(handler2).toHaveBeenCalled()
    })

    it('passes error and context to handler', () => {
      const handler = vi.fn()
      setErrorContext({ route: '/test' })

      onError(handler)

      const error = new Error('Test error')
      captureError(error, { component: 'TestComponent' })

      expect(handler).toHaveBeenCalledWith(error, {
        route: '/test',
        component: 'TestComponent'
      })
    })
  })

  describe('setErrorContext / getErrorContext', () => {
    it('sets and gets error context', () => {
      setErrorContext({ route: '/home' })

      expect(getErrorContext()).toEqual({ route: '/home' })
    })

    it('merges context objects', () => {
      setErrorContext({ route: '/home' })
      setErrorContext({ user: 'john' })

      expect(getErrorContext()).toEqual({
        route: '/home',
        user: 'john'
      })
    })
  })

  describe('clearErrorContext', () => {
    it('clears all context', () => {
      setErrorContext({ route: '/home', user: 'john' })
      clearErrorContext()

      expect(getErrorContext()).toEqual({})
    })
  })

  describe('captureError', () => {
    it('captures error and notifies handlers', () => {
      const handler = vi.fn()
      onError(handler)

      const error = new Error('Captured error')
      captureError(error)

      expect(handler).toHaveBeenCalledWith(error, {})
    })

    it('includes context in captured error', () => {
      const handler = vi.fn()
      setErrorContext({ app: 'test' })
      onError(handler)

      const error = new Error('Test error')
      captureError(error, { component: 'Home' })

      expect(handler).toHaveBeenCalledWith(error, {
        app: 'test',
        component: 'Home'
      })
    })
  })
})
