/**
 * Pure (no-DOM) preview-body classification — real-dark-mode phase 2 (spec
 * P2). The bridge's `/preview/:id` fetch response AND the SSE `onTokens`
 * push carry the SAME body shape, which is EITHER:
 *
 *  - legacy flat map: `{ "--token": "value", ... }`
 *  - mode-aware wrapper: `{ tokens: {...light}, darkTokens？: {...dark},
 *    darkMode？: DarkModeConvention }`
 *
 * Kept separate from `TokenProvider.jsx` (which owns the DOM side-effects —
 * `injectModeStylesheet`/`applyTokens`) so the detection + resolution logic
 * is unit-testable without a DOM stub.
 */

/**
 * @param {unknown} body
 * @returns {boolean} true when `body` uses the mode-aware wrapper shape.
 */
export const isModeAwarePreviewBody = (body) =>
  !!body && typeof body === 'object' && !Array.isArray(body) && 'tokens' in body

/**
 * @typedef {{ kind: 'flat', tokens: import('./types').TokenSet }} FlatPreviewResolution
 * @typedef {{
 *   kind: 'mode-aware',
 *   lightTokens: import('./types').TokenSet,
 *   darkTokens: import('./types').TokenSet,
 *   darkMode: import('@sorb/core').DarkModeConvention,
 * }} ModeAwarePreviewResolution
 */

/**
 * Resolves a raw preview body into either a flat-apply instruction or a
 * mode-aware-inject instruction. Never touches the DOM.
 *
 * - Legacy flat body ⇒ `{ kind: 'flat', tokens: body }` (byte-identical
 *   back-compat path — the caller must still call the exact same
 *   `applyTokens` it always has).
 * - Mode-aware body with NO `darkTokens` (absent/empty) ⇒ still `'flat'`,
 *   using `body.tokens` as the flat map (spec: "treat body.tokens as the
 *   flat map").
 * - Mode-aware body WITH a non-empty `darkTokens` ⇒ `'mode-aware'`, with
 *   `darkMode` resolved from `body.darkMode`, falling back to
 *   `fallbackDarkMode` (the active target's convention) when the bridge
 *   didn't send one.
 *
 * @param {unknown} body
 * @param {import('@sorb/core').DarkModeConvention | undefined} fallbackDarkMode
 * @returns {FlatPreviewResolution | ModeAwarePreviewResolution}
 */
export const resolvePreviewBody = (body, fallbackDarkMode) => {
  if (!isModeAwarePreviewBody(body)) {
    return { kind: 'flat', tokens: /** @type {import('./types').TokenSet} */ (body) }
  }
  const wrapper = /** @type {{ tokens: import('./types').TokenSet, darkTokens?: import('./types').TokenSet, darkMode?: import('@sorb/core').DarkModeConvention }} */ (
    body
  )
  const darkTokens = wrapper.darkTokens
  if (darkTokens && Object.keys(darkTokens).length > 0) {
    return {
      kind: 'mode-aware',
      lightTokens: wrapper.tokens,
      darkTokens,
      darkMode: wrapper.darkMode ?? fallbackDarkMode,
    }
  }
  return { kind: 'flat', tokens: wrapper.tokens }
}
