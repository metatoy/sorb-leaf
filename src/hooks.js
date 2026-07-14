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
 * @example
 * const { isPreview, previewId, previewMismatch, clearPreview } = usePreviewState()
 */
export const usePreviewState = () => {
  const { isPreview, previewId, previewMismatch, clearPreview } = useTokenContext()
  return { isPreview, previewId, previewMismatch, clearPreview }
}
