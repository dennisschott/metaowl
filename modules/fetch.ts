/**
 * @module Fetch
 *
 * A static class wrapping the Fetch API with a configurable base URL and
 * error handling. All internal requests automatically prepend the configured
 * baseUrl and return parsed JSON.
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
type FetchErrorHandler = ((error: unknown) => void) | null

interface FetchOptions {
  baseUrl?: string
  onError?: FetchErrorHandler
}

export default class Fetch {
  static _baseUrl = ''
  static _onError: FetchErrorHandler = null

  static configure({ baseUrl = '', onError = null }: FetchOptions = {}): void {
    Fetch._baseUrl = baseUrl
    Fetch._onError = onError
  }

  static async url<T = unknown>(
    url: string,
    method: HttpMethod = 'GET',
    data: object | null = null,
    internal = true,
    triggerErrorHandler = true
  ): Promise<T | null> {
    const fullUrl = `${internal ? Fetch._baseUrl : ''}${url}`

    const response = await fetch(fullUrl, {
      method,
      body: data ? JSON.stringify(data) : null
    }).catch((error: unknown) => {
      console.warn('[metaowl] Fetch error:', error)
      if (triggerErrorHandler && Fetch._onError) {
        Fetch._onError(error)
      }
      return null
    })

    if (!response) return null

    return await response.json() as T
  }
}