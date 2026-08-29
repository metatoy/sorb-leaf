import { sanitizeCssValue } from './sanitize.js'

/**
 * Builds the mode-aware CSS text carrying both a light and (optionally) a
 * dark value-set for the same token ids — real-dark-mode spec D2/D3.
 *
 * Pure — no DOM. Returns a CSS string meant to be upserted into a
 * `<style id="sorb-tokens">` tag by {@link injectModeStylesheet} (`apply.js`).
 *
 * Contract (must stay byte-shape-stable — the demo/cloud emit agents match
 * this exact shape):
 *
 * ```css
 * :root { --a: 1; color-scheme: light; }
 * @media (prefers-color-scheme: dark) {
 *   :root:not([data-bs-theme="light"]) { --a: 2; color-scheme: dark; }
 * }
 * [data-bs-theme="dark"] { --a: 2; color-scheme: dark; }
 * [data-bs-theme="light"] { --a: 1; color-scheme: light; }
 * ```
 *
 * The `:not(<lightSelector>)` clause in the `@media` block is what lets a
 * manual "light" override beat the OS `prefers-color-scheme: dark` setting —
 * without it, an explicit light choice would still get overridden by an OS
 * dark preference.
 *
 * Single-mode fallback (no `darkVars` / no `darkMode`): emits ONLY a flat
 * `:root { <light decls> }` block — no `color-scheme`, no media query, no
 * attribute rules — so a light-only theme's CSS is unchanged from today's
 * flat emit (back-compat gate, spec §3 D3).
 *
 * @param {import('./types').TokenSet} lightVars
 *   Light-mode token map. Keys may be bare (`'primary'`) or already
 *   `--`-prefixed (`'--primary'`) — normalized here.
 * @param {import('./types').TokenSet | null | undefined} darkVars
 *   Dark-mode token map, same key shape. `null`/`undefined`/`{}` ⇒ single-mode.
 * @param {import('@sorb/core').DarkModeConvention | null | undefined} darkMode
 *   The active TargetAdapter's dark-mode convention (e.g.
 *   `reactBootstrapTarget.darkMode`). Undefined ⇒ single-mode.
 * @returns {string} CSS text, ready to inject verbatim.
 */
export const buildModeStylesheet = (lightVars, darkVars, darkMode) => {
  const lightDecls = normalizeDecls(lightVars)
  const hasDark = !!darkMode && !!darkVars && Object.keys(darkVars).length > 0

  if (!hasDark) {
    return `:root {\n${indent(lightDecls)}\n}\n`
  }

  const darkDecls = normalizeDecls(darkVars)
  const darkSelector = darkMode.darkSelector
  const lightSelector = darkMode.lightSelector

  const mediaScopeSelector = lightSelector ? `:root:not(${lightSelector})` : ':root'

  const lines = []
  lines.push(':root {')
  lines.push(indent([...lightDecls, 'color-scheme: light;']))
  lines.push('}')
  lines.push('@media (prefers-color-scheme: dark) {')
  lines.push(`  ${mediaScopeSelector} {`)
  lines.push(indent([...darkDecls, 'color-scheme: dark;'], 2))
  lines.push('  }')
  lines.push('}')
  lines.push(`${darkSelector} {`)
  lines.push(indent([...darkDecls, 'color-scheme: dark;']))
  lines.push('}')
  if (lightSelector) {
    lines.push(`${lightSelector} {`)
    lines.push(indent([...lightDecls, 'color-scheme: light;']))
    lines.push('}')
  }
  return `${lines.join('\n')}\n`
}

/**
 * Normalizes a TokenSet into `--key: value;` declaration lines, normalizing
 * bare keys to `--`-prefixed and skipping any value that fails
 * {@link sanitizeCssValue} (fail-safe — same C1 boundary `applyTokens` uses;
 * this text goes straight into a `<style>` tag so it's an even more
 * sensitive boundary than `setProperty`).
 *
 * @param {import('./types').TokenSet | null | undefined} vars
 * @returns {string[]}
 */
const normalizeDecls = (vars) => {
  if (!vars) return []
  return Object.entries(vars).reduce((acc, [key, value]) => {
    const result = sanitizeCssValue(String(value))
    if (!result.ok) return acc
    const cssVar = key.startsWith('--') ? key : `--${key}`
    acc.push(`${cssVar}: ${result.value};`)
    return acc
  }, [])
}

/**
 * @param {string[]} lines
 * @param {number} [level]
 * @returns {string}
 */
const indent = (lines, level = 1) => {
  const pad = '  '.repeat(level)
  return lines.map((l) => `${pad}${l}`).join('\n')
}
