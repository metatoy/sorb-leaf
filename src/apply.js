import { sanitizeCssValue } from './sanitize.js'

/**
 * Dev-only warning that never throws in a browser (no `process` global there).
 * Silent in production so a hostile token can't spam a shipped app's console.
 *
 * @param {string} key
 * @param {string} [reason]
 * @returns {void}
 */
const warnRejected = (key, reason) => {
  try {
    if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn(
        `[sorb] skipped token "--${key}": value failed CSS sanitization` +
          (reason ? ` (${reason})` : ''),
      )
    }
  } catch (e) {
    // never let logging break token application
    void e
  }
}

/**
 * Writes all token values as CSS custom properties on :root.
 * Applies globally — affects the entire app.
 *
 * Each value is validated by {@link sanitizeCssValue} at this injection
 * boundary (concern C1). A value that fails sanitization is SKIPPED (fail
 * safe) — it is never written — and the remaining tokens still apply.
 *
 * @param {import('./types').TokenSet} tokens
 * @returns {void}
 */
export const applyTokens = (tokens) => {
  const root = document.documentElement
  Object.entries(tokens).forEach(([key, value]) => {
    const result = sanitizeCssValue(String(value))
    if (!result.ok) {
      warnRejected(key, result.reason)
      return
    }
    root.style.setProperty(`--${key}`, result.value)
  })
}

/**
 * Removes token CSS custom properties from :root.
 * Called when clearing a preview to restore the committed set.
 *
 * @param {import('./types').TokenSet} tokens
 * @returns {void}
 */
export const clearTokenOverrides = (tokens) => {
  const root = document.documentElement
  Object.keys(tokens).forEach((key) => {
    root.style.removeProperty(`--${key}`)
  })
}
