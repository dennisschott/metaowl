/**
 * @module ErrorBoundary
 *
 * Error boundaries for OWL applications. Catches JavaScript errors anywhere
 * in their child component tree, logs those errors, and displays a fallback UI.
 *
 * Features:
 * - Component-level error boundaries
 * - Global error handler
 * - Custom fallback components
 * - Error logging hooks
 * - Error page routing (404, 500)
 *
 * @example
 * // Wrap component with error boundary
 * export default class MyPage extends Component {
 *   static template = 'MyPage'
 *   static errorBoundary = true
 *   static fallback = ErrorFallback
 *
 *   onError(error, errorInfo) {
 *     console.error('Caught error:', error)
 *   }
 * }
 *
 * // Global error handler
 * onError((error, context) => {
 *   sendToAnalytics(error, context)
 * })
 */

import { Component } from '@odoo/owl'

/**
 * Global error handlers registry.
 * @type {Function[]}
 */
const _globalErrorHandlers = []

/**
 * Global error context (component name, route, etc.)
 * @type {object}
 */
let _errorContext = {}

/**
 * Error boundary wrapper component.
 * Renders children and catches errors during rendering/lifecycle.
 */
export class ErrorBoundary extends Component {
  static template = xml`
    <t t-if="state.hasError">
      <t t-component="props.Fallback || fallback" 
         t-props="{ error: state.error, errorInfo: state.errorInfo }"/>
    </t>
    <t t-else="">
      <t t-slot="default"/>
    </t>
  `

  static defaultProps = {
    Fallback: null
  }

  setup() {
    this.state = useState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  onError(error, errorInfo) {
    this.state.hasError = true
    this.state.error = error
    this.state.errorInfo = errorInfo

    // Call global error handlers
    for (const handler of _globalErrorHandlers) {
      handler(error, { ..._errorContext, ...errorInfo })
    }
  }
}

/**
 * Default fallback component showing error details.
 */
export class DefaultErrorFallback extends Component {
  static template = xml`
    <div class="error-boundary-fallback">
      <h2>Something went wrong</h2>
      <t t-if="props.error">
        <details>
          <summary>Error details</summary>
          <pre t-esc="props.error.stack || props.error.message || props.error"/>
        </details>
      </t>
    </div>
  `
}

/**
 * Register a global error handler.
 *
 * @param {Function} handler - (error, context) => void
 * @returns {Function} Unsubscribe function
 */
export function onError(handler) {
  _globalErrorHandlers.push(handler)
  return () => {
    const index = _globalErrorHandlers.indexOf(handler)
    if (index > -1) {
      _globalErrorHandlers.splice(index, 1)
    }
  }
}

/**
 * Set global error context (e.g., current route, user info).
 *
 * @param {object} context
 */
export function setErrorContext(context) {
  _errorContext = { ..._errorContext, ...context }
}

/**
 * Get current error context.
 *
 * @returns {object}
 */
export function getErrorContext() {
  return { ..._errorContext }
}

/**
 * Clear global error context.
 */
export function clearErrorContext() {
  _errorContext = {}
}

/**
 * Capture and report an error manually.
 *
 * @param {Error} error
 * @param {object} [context]
 */
export function captureError(error, context = {}) {
  const fullContext = { ..._errorContext, ...context }
  for (const handler of _globalErrorHandlers) {
    handler(error, fullContext)
  }
}

/**
 * Error boundary decorator for component classes.
 *
 * @param {object} options
 * @param {boolean} [options.enabled=true]
 * @param {typeof Component} [options.Fallback]
 * @returns {Function} Decorator
 *
 * @example
 * @errorBoundary({ Fallback: CustomFallback })
 * export class MyComponent extends Component { }
 */
export function errorBoundary(options = {}) {
  return function decorator(ComponentClass) {
    ComponentClass.errorBoundary = true
    if (options.Fallback) {
      ComponentClass.fallback = options.Fallback
    }
    return ComponentClass
  }
}

/**
 * Create an error boundary wrapper for a component.
 *
 * @param {typeof Component} ComponentClass
 * @param {object} [options]
 * @param {typeof Component} [options.Fallback]
 * @returns {typeof Component} Wrapped component
 */
export function withErrorBoundary(ComponentClass, options = {}) {
  return class extends Component {
    static template = xml`
      <ErrorBoundary Fallback="props.Fallback || fallback">
        <t t-component="Component" t-props="props"/>
      </ErrorBoundary>
    `

    static components = { ErrorBoundary }

    setup() {
      this.Component = ComponentClass
      this.fallback = options.Fallback || DefaultErrorFallback
    }
  }
}

/**
 * Initialize global error handling.
 * Sets up window.onerror and window.onunhandledrejection.
 */
export function initGlobalErrorHandling() {
  // Catch global errors
  window.onerror = (message, source, lineno, colno, error) => {
    captureError(error || new Error(message), {
      type: 'window.onerror',
      source,
      lineno,
      colno
    })
    return false // Don't prevent default handling
  }

  // Catch unhandled promise rejections
  window.onunhandledrejection = (event) => {
    captureError(event.reason, {
      type: 'unhandledrejection'
    })
  }
}

// Import at end to avoid circular dependency
import { useState, xml } from '@odoo/owl'
