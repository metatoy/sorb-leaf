/**
 * The `mui` TargetAdapter — Sorb's MUI v6 framework target
 * (framework-targets-productization T3, the react-bootstrap pattern's third
 * promotion). Descriptive re-cast of the P3 spike (`sorb-demo-mui/sd.config.js:18-86`),
 * now backed by the promoted `@sorb/seed` format `sorb/mui-vars`
 * (`sorbMuiVars`).
 *
 * Non-React-specific host: MUI's live preview is pure CSS (the
 * `sorb/mui-vars` `:root, [data-mui-color-scheme] { --mui-*: var(--token,
 * seed) !important }` override layer) + `sorbInit`/`applyTokens` swapping the
 * underlying Sorb vars — no adapter-level `inject` needed (field-correction:
 * non-React targets need no `inject`; that seam stays deferred to leaf-core).
 */
import * as core from '@sorb/core'

// The Style-Dictionary format id that emits this target's token set, from
// `@sorb/seed`'s named-format registry (`sorb-seed/src/emit/sorbMui.js`):
//   export const SORB_MUI_VARS = 'sorb/mui-vars'
// Inlined as a string (not imported) so `@sorb/leaf` doesn't take a
// build-time dependency on `@sorb/seed` — the format id is a stable,
// documented string contract, not a JS binding (same posture as
// `reactBootstrap.js`'s `SORB_TOKENSET_FORMAT_ID` / `mantine.js`'s
// `SORB_MANTINE_VARS_FORMAT_ID`).
const SORB_MUI_VARS_FORMAT_ID = 'sorb/mui-vars'

/**
 * @type {import('@sorb/core').TargetAdapter}
 */
export const muiTarget = {
  id: 'mui',
  emitFormat: SORB_MUI_VARS_FORMAT_ID,
  // Kit-vocab expectPrefixes (field-correction, non-negotiable): the
  // payload-side kit namespace, NEVER the framework's own `mui-` var
  // prefix — a framework-prefix guard false-positives on every working
  // preview (verified P2/P3 across the demo program). Overridable via
  // `config.preview.expectPrefixes`.
  expectPrefixes: ['color-', 'radius-'],
  // Left undefined on purpose — see file header.
  inject: undefined,
  // CONVENTION-DECLARED, NOT demo-verified — the MUI JJ demo never built
  // dark mode (acid-wash is a variant push, not a mode). MUI v6's documented
  // `cssVariables: { colorSchemeSelector: 'data' }` convention sets a
  // `data-mui-color-scheme` attribute (`InitColorSchemeScript` / MUI's
  // `ThemeProvider` manage it). Feeds the real-dark-mode program's D1 phase;
  // verification lands there, not here.
  darkMode: {
    strategy: 'attribute',
    attribute: 'data-mui-color-scheme',
    darkSelector: '[data-mui-color-scheme="dark"]',
    lightSelector: '[data-mui-color-scheme="light"]',
  },
}

// Register into the @sorb/core registry WHEN this build's core supports it —
// see reactBootstrap.js for the full rationale (published-core lag guard).
if (typeof core.registerTarget === 'function') {
  core.registerTarget(muiTarget)
}

export default muiTarget
