import type { FetchConfig, HttpMethod } from '../types.js'

export default class Fetch {
  private static _baseUrl = ''
  private static _onError: ((error: Error) => void) | null = null

  /**
   * Configure the Fetch helper. Call once in your metaowl.js before boot().
   *
   * @param options - Configuration options
   * @param options.baseUrl - Base URL prepended to every internal request.
   * @param options.onError - Callback invoked on network errors.
   */
  static configure({ baseUrl = '', onError = null }: FetchConfig = {}): void {
    Fetch._baseUrl = baseUrl
    Fetch._onError = onError
  }

  /**
   * Perform a fetch request.
   *
   * @param url - Path or full URL.
   * @param method - HTTP method
   * @param data - Request body (JSON-serialised).
   * @param internal - Prepend baseUrl when true.
   * @param triggerErrorHandler - Call onError callback on failure.
   * @returns The parsed JSON response, or `null` on error.
   */
  static async url<T = unknown>(
    url: string,
    method: HttpMethod = 'GET',
    data: unknown = null,
    internal = true,
    triggerErrorHandler = true
  ): Promise<T | null> {
    const fullUrl = `${internal ? Fetch._baseUrl : ''}${url}`

    const response = await fetch(fullUrl, {
      method,
      body: data ? JSON.stringify(data) : null
    }).catch((error: Error) => {
      console.warn('[metaowl] Fetch error:', error)
      if (triggerErrorHandler && Fetch._onError) {
        Fetch._onError(error)
      }
      return undefined
    })

    if (!response) return null

    return response.json() as Promise<T>
  }
}
