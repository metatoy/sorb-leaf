/**
 * The `primevue` TargetAdapter — Sorb's PrimeVue v4 framework target
 * (framework-targets-productization T4, the react-bootstrap pattern's fourth
 * promotion, and the first backed by a JS-EMITTING format). Descriptive
 * re-cast of the P4/P4a spike (`sorb-demo-primevue/src/jjPreset.js`), now
 * backed by the promoted `@sorb/seed` format `sorb/primevue-preset`
 * (`sorbPrimevuePreset`).
 *
 * Yes, this lives in `sorb-leaf` even though PrimeVue is a Vue component kit
 * (per the productization spec's pattern-fidelity decision) — the adapter is
 * pure descriptive data (`id`/`emitFormat`/`expectPrefixes`/`darkMode`)
 * importing only `@sorb/core`, not a React or Vue integration; it doesn't run
 * inside a Vue app. Revisit its home if/when a leaf-core package split lands.
 *
 * Non-React-specific host: PrimeVue's live preview is pure `var()`-chain (the
 * generated preset's `--p-*` custom properties each verbatim-indirect onto a
 * Sorb CSS var) + `sorbInit`/`applyTokens` swapping the underlying Sorb vars —
 * no adapter-level `inject` needed (field-correction: non-React targets need
 * no `inject`; that seam stays deferred to leaf-core).
 */
import * as core from '@sorb/core'

// The Style-Dictionary format id that emits this target's token set, from
// `@sorb/seed`'s named-format registry (`sorb-seed/src/emit/sorbPrimevue.js`):
//   export const SORB_PRIMEVUE_PRESET = 'sorb/primevue-preset'
// Inlined as a string (not imported) so `@sorb/leaf` doesn't take a
// build-time dependency on `@sorb/seed` — the format id is a stable,
// documented string contract, not a JS binding (same posture as
// `reactBootstrap.js`'s `SORB_TOKENSET_FORMAT_ID`).
const SORB_PRIMEVUE_PRESET_FORMAT_ID = 'sorb/primevue-preset'

/**
 * @type {import('@sorb/core').TargetAdapter}
 */
export const primevueTarget = {
  id: 'primevue',
  emitFormat: SORB_PRIMEVUE_PRESET_FORMAT_ID,
  // Kit-vocab expectPrefixes (field-correction, non-negotiable): the
  // payload-side kit namespace, NEVER a PrimeVue-owned prefix (`p-`) — a
  // framework-prefix guard false-positives on every working preview
  // (verified P2/P3 across the demo program). This target's preset draws
  // from a wider slice of the kit vocab than Mantine/MUI (component-tier
  // overrides for Tag/Toast/Menubar), hence the longer list. Overridable via
  // `config.preview.expectPrefixes`.
  expectPrefixes: ['color-', 'button-', 'card-', 'badge-', 'input-', 'nav-', 'toast-', 'radius-'],
  // Left undefined on purpose — see file header.
  inject: undefined,
  // CONVENTION-DECLARED, NOT demo-verified — the PrimeVue JJ demo never
  // built dark mode (acid-wash is a variant push, not a mode). PrimeVue v4's
  // documented dark-mode convention is a `.p-dark` selector class (default
  // `darkModeSelector` in `definePreset`/PrimeVue config), toggled on an
  // ancestor (typically `<html>`). Feeds the real-dark-mode program's D1
  // phase; verification lands there, not here.
  darkMode: {
    strategy: 'class',
    darkSelector: '.p-dark',
  },
}

// Register into the @sorb/core registry WHEN this build's core supports it —
// see reactBootstrap.js for the full rationale (published-core lag guard).
if (typeof core.registerTarget === 'function') {
  core.registerTarget(primevueTarget)
}

export default primevueTarget
