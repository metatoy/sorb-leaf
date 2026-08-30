/**
 * The `mantine` TargetAdapter — Sorb's Mantine v7 framework target
 * (framework-targets-productization T2, the react-bootstrap pattern's second
 * promotion). Descriptive re-cast of the P2 spike (`sorb-demo-mantine/sd/
 * mantine-format.js`), now backed by the promoted `@sorb/seed` format
 * `sorb/mantine-vars` (`sorbMantineVars`).
 *
 * Non-React-specific host: Mantine's live preview is pure CSS (the
 * `sorb/mantine-vars` `:root { --mantine-*: var(--token) !important }`
 * override layer) + `sorbInit`/`applyTokens` swapping the underlying Sorb
 * vars — no adapter-level `inject` needed (field-correction: non-React
 * targets need no `inject`; that seam stays deferred to leaf-core).
 */
import * as core from '@sorb/core'

// The Style-Dictionary format id that emits this target's token set, from
// `@sorb/seed`'s named-format registry (`sorb-seed/src/emit/sorbMantine.js`):
//   export const SORB_MANTINE_VARS = 'sorb/mantine-vars'
// Inlined as a string (not imported) so `@sorb/leaf` doesn't take a
// build-time dependency on `@sorb/seed` — the format id is a stable,
// documented string contract, not a JS binding (same posture as
// `reactBootstrap.js`'s `SORB_TOKENSET_FORMAT_ID`).
const SORB_MANTINE_VARS_FORMAT_ID = 'sorb/mantine-vars'

/**
 * @type {import('@sorb/core').TargetAdapter}
 */
export const mantineTarget = {
  id: 'mantine',
  emitFormat: SORB_MANTINE_VARS_FORMAT_ID,
  // Kit-vocab expectPrefixes (field-correction, non-negotiable): the
  // payload-side kit namespace, NEVER the framework's own `mantine-`
  // var prefix — a framework-prefix guard false-positives on every working
  // preview (verified P2/P3 across the demo program). Overridable via
  // `config.preview.expectPrefixes`.
  expectPrefixes: ['color-', 'button-', 'radius-'],
  // Left undefined on purpose — see file header.
  inject: undefined,
  // CONVENTION-DECLARED, NOT demo-verified — the Mantine JJ demo never built
  // dark mode (acid-wash is a variant push, not a mode). Mantine v7's
  // documented color-scheme convention sets a `data-mantine-color-scheme`
  // attribute (MantineProvider manages it; `useMantineColorScheme` /
  // `<ColorSchemeScript>` toggle it). Feeds the real-dark-mode program's D1
  // phase; verification lands there, not here.
  darkMode: {
    strategy: 'attribute',
    attribute: 'data-mantine-color-scheme',
    darkSelector: '[data-mantine-color-scheme="dark"]',
    lightSelector: '[data-mantine-color-scheme="light"]',
  },
}

// Register into the @sorb/core registry WHEN this build's core supports it —
// see reactBootstrap.js for the full rationale (published-core lag guard).
if (typeof core.registerTarget === 'function') {
  core.registerTarget(mantineTarget)
}

export default mantineTarget
