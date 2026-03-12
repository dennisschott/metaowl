/**
 * @module Fetch
 *
 * A static class wrapping the Fetch API with a configurable base URL and
 * error handling. All internal requests automatically prepend the configured
 * baseUrl and return parsed JSON.
 */
export default class Fetch {
  static _baseUrl = ''
  static _onError = null

  /**
   * Configure the Fetch helper. Call once in your metaowl.js before boot().
   *
   * @param {object} options
   * @param {string} [options.baseUrl=''] - Base URL prepended to every internal request.
   * @param {function} [options.onError] - Callback invoked on network errors.
   */
  static configure({ baseUrl = '', onError = null } = {}) {
    Fetch._baseUrl = baseUrl
    Fetch._onError = onError
  }

  /**
   * Perform a fetch request.
   *
   * @param {string} url - Path or full URL.
   * @param {'GET'|'POST'|'PUT'|'PATCH'|'DELETE'} [method='GET']
   * @param {object|null} [data=null] - Request body (JSON-serialised).
   * @param {boolean} [internal=true] - Prepend baseUrl when true.
   * @param {boolean} [triggerErrorHandler=true] - Call onError callback on failure.
   * @returns {Promise<any|null>}
   */
  static async url(url, method = 'GET', data = null, internal = true, triggerErrorHandler = true) {
    const fullUrl = `${internal ? Fetch._baseUrl : ''}${url}`

    const response = await fetch(fullUrl, {
      method,
      body: data ? JSON.stringify(data) : null
    }).catch(error => {
      console.warn('[metaowl] Fetch error:', error)
      if (triggerErrorHandler && Fetch._onError) {
        Fetch._onError(error)
      }
    })

    if (!response) return null

    return response.json()
  }
}
