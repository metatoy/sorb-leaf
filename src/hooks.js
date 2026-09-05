import { useTokenContext } from './context'

/**
 * Returns the full active token set (committed or preview).
 * @returns {import('./types').TokenSet}
 */
export const useTokens = () => {
  return useTokenContext().tokens
}

/**
 * Returns a single token value by key.
 *
 * @param {string} key
 * @returns {string}
 * @example
 * const primary = useToken('color-primary') // → '#3B5BDB'
 */
export const useToken = (key) => {
  const tokens = useTokenContext().tokens
  const value = tokens[key]
  if (value === undefined && process.env.NODE_ENV === 'development') {
    console.warn(`[Sorb] Token not found: "${key}"`)
  }
  return String(value ?? '')
}

/**
 * Returns whether a preview token set is currently active.
 * Useful for showing a preview indicator in your app.
 * @returns {boolean}
 */
export const useIsPreview = () => {
  return useTokenContext().isPreview
}

/**
 * Returns full preview state — useful for building a preview banner.
 *
 * `previewMismatch` is true when a preview loaded but its tokens don't match the
 * app's `preview.expectPrefixes` (vocabulary mismatch — see B4); use it to render
 * a warning state. Always false unless the guard is opted into.
 *
 * `previewError` is `{ id, outcome }` (`outcome`: `'not_found'|'unauthorized'|'network'`)
 * when a deliberately-requested `?preview=` fetch failed and the SDK fell back to
 * committed tokens — the case that used to be totally silent. `null` otherwise.
 * A `not_found` typically means the preview id belongs to a different project
 * than this app's key is bound to.
 *
 * @example
 * const { isPreview, previewId, previewMismatch, previewError, clearPreview } = usePreviewState()
 */
export const usePreviewState = () => {
  const { isPreview, previewId, previewMismatch, previewError, clearPreview } = useTokenContext()
  return { isPreview, previewId, previewMismatch, previewError, clearPreview }
}

/**
 * Real-dark-mode (spec D3): the manual mode selection + the live-resolved
 * scheme actually in effect.
 *
 * `mode` is meaningful for every app; `setMode('light'|'dark')` always
 * works. It only visibly changes anything once the consumer's `SorbConfig`
 * carries a `darkTokens` set (otherwise there's no dark stylesheet for the
 * attribute toggle to select).
 *
 * @returns {{ mode: 'auto'|'light'|'dark', setMode: (mode: 'auto'|'light'|'dark') => void, resolvedScheme: 'light'|'dark' }}
 * @example
 * const { mode, setMode, resolvedScheme } = useTheme()
 */
export const useTheme = () => {
  const { mode, setMode, resolvedScheme } = useTokenContext()
  return { mode, setMode, resolvedScheme }
}
