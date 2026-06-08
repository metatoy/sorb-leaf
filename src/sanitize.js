/**
 * CSS token-value sanitizer — the C1 injection-boundary guard.
 *
 * Token values flow Figma → bridge → `applyTokens` → `setProperty`. Those values
 * are UNTRUSTED INPUT crossing a trust boundary. This is a pure string function
 * (no DOM) so it is fully node:test-able and reusable. Phase 2 will hoist it to
 * `@sorb/core`; do NOT add a DOM dependency here.
 *
 * Strategy: deny-by-default on the dangerous classes, then allowlist CSS
 * functions. A *valid* hostile value (a real `url(...)`) passes `setProperty`
 * unharmed, so we cannot rely on the browser — we reject it here.
 */

/**
 * The only CSS functions we permit inside a token value. Anything else —
 * `url(`, `image(`, `image-set(`, `-webkit-image-set(`, `cross-fade(`,
 * `expression(`, `paint(`, `element(`, `attr(`, … — is rejected.
 * @type {Set<string>}
 */
const ALLOWED_FUNCTIONS = new Set([
  'rgb',
  'rgba',
  'hsl',
  'hsla',
  'hwb',
  'lab',
  'lch',
  'oklab',
  'oklch',
  'color',
  'calc',
  'min',
  'max',
  'clamp',
  'var',
  'env',
])

// Matches an identifier immediately followed by '(' — i.e. a CSS function call.
// Identifiers may start with one or two leading hyphens (vendor prefixes like
// `-webkit-image-set`). The lookahead keeps the '(' out of the captured name.
const FUNCTION_CALL = /([a-zA-Z_-][\w-]*)\s*\(/g

// ASCII control chars (incl. NUL, newlines, tabs) — never legitimate in a
// token value and a classic way to smuggle past naive filters.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\x00-\x1f]/

// CSS-context-break characters that let a value escape the custom-property
// declaration: `;` ends the declaration, `{` / `}` open/close a block.
const CONTEXT_BREAK = /[{};]/

/**
 * Validate an untrusted CSS token value before it is injected via
 * `setProperty`. Pure — does not touch the DOM.
 *
 * Rules (deny-by-default):
 *  - non-string / empty input is rejected.
 *  - reject ASCII control chars `\x00-\x1f`.
 *  - reject the context-break chars `{` `}` `;`.
 *  - reject (case-insensitive, whitespace-tolerant) `@import`, `javascript:`,
 *    and the markup-break `</`.
 *  - extract every `identifier(` and reject if ANY is not in the allowlist
 *    (this is what stops `url(`, `image-set(`, `expression(`, `paint(`, …).
 *
 * @param {unknown} value
 * @returns {{ ok: boolean, value: string, reason?: string }}
 */
export const sanitizeCssValue = (value) => {
  if (typeof value !== 'string') {
    return { ok: false, value: '', reason: 'not-a-string' }
  }

  const raw = value
  if (raw.length === 0) {
    return { ok: false, value: '', reason: 'empty' }
  }

  if (CONTROL_CHARS.test(raw)) {
    return { ok: false, value: raw, reason: 'control-char' }
  }

  if (CONTEXT_BREAK.test(raw)) {
    return { ok: false, value: raw, reason: 'context-break-char' }
  }

  // Case-insensitive, whitespace-tolerant dangerous tokens. We strip ASCII
  // whitespace before substring-matching so `@ import`, `java script:`,
  // `< /script` style evasions are still caught.
  const lower = raw.toLowerCase()
  const collapsed = lower.replace(/\s+/g, '')
  if (collapsed.includes('@import')) {
    return { ok: false, value: raw, reason: 'at-import' }
  }
  if (collapsed.includes('javascript:')) {
    return { ok: false, value: raw, reason: 'javascript-scheme' }
  }
  if (collapsed.includes('</')) {
    return { ok: false, value: raw, reason: 'markup-break' }
  }

  // Allowlist every function call in the value.
  FUNCTION_CALL.lastIndex = 0
  let match
  while ((match = FUNCTION_CALL.exec(raw)) !== null) {
    const name = match[1].toLowerCase()
    if (!ALLOWED_FUNCTIONS.has(name)) {
      return { ok: false, value: raw, reason: `disallowed-function:${name}` }
    }
  }

  return { ok: true, value: raw }
}
