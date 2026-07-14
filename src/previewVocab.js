/**
 * Vocabulary / contract guard (GFP RC1 Part 4 · backlog B4).
 *
 * The failure mode this catches: a preview whose token keys don't intersect the
 * custom-property namespace the app actually consumes (e.g. an app that renders
 * from `--bs-*` fed a `--color-*` preview). `applyTokens` faithfully writes the
 * preview's vars onto `<html>`, the "preview active" banner lights — but nothing
 * on screen moves. A silent no-op is the worst founder-demo failure mode.
 *
 * This guard makes that condition LOUD instead of silent. It is fully opt-in:
 * off unless the consumer sets `config.preview.expectPrefixes` to a non-empty
 * array of key prefixes it expects (e.g. `['bs-']`). No DOM, fully node:test-able.
 */

/**
 * How many of `tokens`' keys start with ANY of `prefixes`.
 *
 * @param {import('./types').TokenSet} tokens
 * @param {string[]} prefixes
 * @returns {number}
 */
export const countMatchingPrefixes = (tokens, prefixes) => {
  const list = Array.isArray(prefixes) ? prefixes : []
  return Object.keys(tokens || {}).filter((key) => list.some((p) => key.startsWith(p))).length
}

/**
 * Decide whether a freshly-applied preview mismatches the app's expected token
 * vocabulary, and `console.warn` an actionable message when it does.
 *
 * Guard is OFF (returns false, never warns) unless `expectPrefixes` is a
 * non-empty array — so the default is zero behaviour change. When ON: a preview
 * that applied at least one token but matched ZERO expected prefixes is a
 * mismatch (warn + return true). An empty/failed preview (0 applied tokens) is
 * NOT treated as a mismatch — that is a separate condition the provider already
 * handles by falling back to committed tokens.
 *
 * @param {object} args
 * @param {import('./types').TokenSet} args.tokens Applied preview token set.
 * @param {string[]} [args.expectPrefixes] Key prefixes the app expects.
 * @param {string|null} [args.previewId] Preview id, for the message.
 * @returns {boolean} true when a vocabulary mismatch was detected.
 */
export const checkPreviewVocabulary = ({ tokens, expectPrefixes, previewId }) => {
  if (!Array.isArray(expectPrefixes) || expectPrefixes.length === 0) return false

  const appliedCount = Object.keys(tokens || {}).length
  if (appliedCount === 0) return false // empty/failed preview — not a vocab mismatch

  const matched = countMatchingPrefixes(tokens, expectPrefixes)
  if (matched > 0) return false

  try {
    // Intentionally NOT gated on NODE_ENV: the guard is opt-in, and a
    // demo-blocking silent no-op is exactly what a shipped consumer wants to see.
    // eslint-disable-next-line no-console
    console.warn(
      `[Sorb] preview ${previewId ? `"${previewId}" ` : ''}applied ${appliedCount} tokens ` +
        `but none match expected prefixes ${JSON.stringify(expectPrefixes)} — the app may not ` +
        `visibly re-skin (token-vocabulary mismatch).`,
    )
  } catch (e) {
    // never let logging break token application
    void e
  }
  return true
}
