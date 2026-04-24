/**
 * @module ErrorBoundary
 *
 * Error boundaries for OWL applications.
 */

import { Component, useState, xml } from '@odoo/owl'

type ErrorContext = Record<string, unknown>
type ErrorHandler = (error: unknown, context: ErrorContext) => void
type ComponentClass = typeof Component & {
  new (...args: unknown[]): Component
  errorBoundary?: boolean
  fallback?: typeof Component
}

const globalErrorHandlers: ErrorHandler[] = []
let errorContext: ErrorContext = {}

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

  state!: {
    hasError: boolean
    error: unknown
    errorInfo: ErrorContext | null
  }

  setup(): void {
    this.state = useState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  onError(error: unknown, errorInfo: ErrorContext): void {
    this.state.hasError = true
    this.state.error = error
    this.state.errorInfo = errorInfo

    for (const handler of globalErrorHandlers) {
      handler(error, { ...errorContext, ...errorInfo })
    }
  }
}

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

export function onError(handler: ErrorHandler): () => void {
  globalErrorHandlers.push(handler)
  return () => {
    const index = globalErrorHandlers.indexOf(handler)
    if (index > -1) {
      globalErrorHandlers.splice(index, 1)
    }
  }
}

export function setErrorContext(context: ErrorContext): void {
  errorContext = { ...errorContext, ...context }
}

export function getErrorContext(): ErrorContext {
  return { ...errorContext }
}

export function clearErrorContext(): void {
  errorContext = {}
}

export function captureError(error: unknown, context: ErrorContext = {}): void {
  const fullContext = { ...errorContext, ...context }
  for (const handler of globalErrorHandlers) {
    handler(error, fullContext)
  }
}

export function errorBoundary(
  options: { enabled?: boolean; Fallback?: typeof Component } = {}
): (componentClass: ComponentClass) => ComponentClass {
  return function decorator(componentClass: ComponentClass): ComponentClass {
    componentClass.errorBoundary = true
    if (options.Fallback) {
      componentClass.fallback = options.Fallback
    }
    return componentClass
  }
}

export function withErrorBoundary(
  componentClass: ComponentClass,
  options: { Fallback?: typeof Component } = {}
): ComponentClass {
  return class WithErrorBoundary extends Component {
    static template = xml`
      <ErrorBoundary Fallback="props.Fallback || fallback">
        <t t-component="Component" t-props="props"/>
      </ErrorBoundary>
    `

    static components = { ErrorBoundary }

    Component!: ComponentClass
    fallback!: typeof Component

    setup(): void {
      this.Component = componentClass
      this.fallback = options.Fallback || DefaultErrorFallback
    }
  } as ComponentClass
}

export function initGlobalErrorHandling(): void {
  window.onerror = (
    message,
    source,
    lineno,
    colno,
    error
  ) => {
    captureError(error || new Error(String(message)), {
      type: 'window.onerror',
      source,
      lineno,
      colno
    })
    return false
  }

  window.onunhandledrejection = (event: PromiseRejectionEvent) => {
    captureError(event.reason, {
      type: 'unhandledrejection'
    })
  }
}