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

/** The id of the `<style>` tag {@link injectModeStylesheet} upserts. */
export const MODE_STYLESHEET_ID = 'sorb-tokens'

/**
 * Upserts a `<style id="sorb-tokens">` tag in `<head>` carrying mode-aware
 * CSS (real-dark-mode spec D3) — the injection path used when a theme has
 * both a light and a dark value-set (see `buildModeStylesheet`,
 * `./modeStylesheet.js`).
 *
 * DELIBERATELY SEPARATE from `applyTokens`/`clearTokenOverrides` (inline
 * `style.setProperty`, above): those two stay untouched and are still what
 * `TokenProvider` calls for a light-only theme, so a single-mode app's
 * output is byte-identical to today (back-compat gate, spec §3 D3). This
 * function is only reached when a theme actually has a dark mode — a
 * `<style>` tag is required (not inline styles) because only a stylesheet
 * can carry a `@media (prefers-color-scheme: dark)` block and
 * attribute-selector rules; inline styles on `documentElement` can express
 * neither.
 *
 * The `css` argument is expected to already be sanitized (`buildModeStylesheet`
 * runs every value through `sanitizeCssValue` before it reaches here) — this
 * function does no further validation, it only manages the tag's lifecycle.
 *
 * @param {string} css  CSS text, e.g. from `buildModeStylesheet(...)`.
 * @returns {void}
 */
export const injectModeStylesheet = (css) => {
  let tag = document.getElementById(MODE_STYLESHEET_ID)
  if (!tag) {
    tag = document.createElement('style')
    tag.id = MODE_STYLESHEET_ID
    document.head.appendChild(tag)
  }
  tag.textContent = css
}

/**
 * Removes the `<style id="sorb-tokens">` tag injected by
 * {@link injectModeStylesheet}, if present. Counterpart to
 * `clearTokenOverrides` for the mode-aware (dual-mode) path.
 *
 * @returns {void}
 */
export const clearModeStylesheet = () => {
  const tag = document.getElementById(MODE_STYLESHEET_ID)
  if (tag && tag.parentNode) tag.parentNode.removeChild(tag)
}
