/**
 * The `angular-material` TargetAdapter — Sorb's Angular Material 20 (M3)
 * framework target (framework-targets-productization T5, the react-bootstrap
 * pattern's fifth promotion). Descriptive re-cast of the demo integration
 * (`sorb-demo-angular/sd.config.js:96-113`), now backed by the promoted
 * `@sorb/seed` format `sorb/mat-sys-vars` (`sorbMatSysVars`).
 *
 * Yes, this lives in `sorb-leaf` even though Angular Material is an Angular
 * component kit (per the productization spec's pattern-fidelity decision) —
 * the adapter is pure descriptive data (`id`/`emitFormat`/`expectPrefixes`/
 * `darkMode`) importing only `@sorb/core`; it doesn't run inside an Angular
 * app. Revisit its home if/when a leaf-core package split lands.
 *
 * Non-React-specific host: Angular Material's live preview is pure
 * `var()`-chain (the `sorb/mat-sys-vars` `:root { --mat-sys-*:
 * var(--token) !important }` override layer) + `sorbInit`/`applyTokens`
 * swapping the underlying Sorb vars — no adapter-level `inject` needed
 * (field-correction: non-React targets need no `inject`; that seam stays
 * deferred to leaf-core).
 *
 * DARK MODE — CONVENTION-DECLARED, UNCONFIRMED (spec risk table: "Angular M3
 * dark convention unconfirmed"): Angular Material 20's `mat.theme()` mixin
 * does NOT emit a fixed class/attribute selector the way Bootstrap
 * (`data-bs-theme`) or Mantine (`data-mantine-color-scheme`) do. Per the
 * Angular Material 20 docs (material.angular.dev/guide/theming +
 * angular/components `guides/theming.md`), `mat.theme()`'s color values use
 * the CSS `light-dark()` function and switch on the `color-scheme` CSS
 * property — there is no single canonical class or attribute name; apps
 * commonly toggle a class on `<html>`/`<body>` (naming varies:
 * `.dark-theme`, `.theme-dark`, …) that itself sets `color-scheme: dark`.
 * Per the productization spec's mitigation ("if ambiguous, declare
 * strategy:'class' with a header caveat"), this adapter declares a `.dark`
 * class selector (matching this codebase's other class-strategy convention,
 * `tailwindDarkMode` in `darkModeConventions.js`) as the best-known default —
 * a consumer whose app uses a different class name overrides via
 * `config.darkModeConvention` (real-dark-mode program, not this phase).
 * UNCONFIRMED: verification is explicitly out of scope here and belongs to
 * the real-dark-mode program (`spec/sorb/dark-mode-real-implementation.md`,
 * D1); this declaration only feeds that program.
 */
import * as core from '@sorb/core'

// The Style-Dictionary format id that emits this target's token set, from
// `@sorb/seed`'s named-format registry (`sorb-seed/src/emit/sorbMatSys.js`):
//   export const SORB_MAT_SYS_VARS = 'sorb/mat-sys-vars'
// Inlined as a string (not imported) so `@sorb/leaf` doesn't take a
// build-time dependency on `@sorb/seed` — the format id is a stable,
// documented string contract, not a JS binding (same posture as
// `reactBootstrap.js`'s `SORB_TOKENSET_FORMAT_ID`).
const SORB_MAT_SYS_VARS_FORMAT_ID = 'sorb/mat-sys-vars'

/**
 * @type {import('@sorb/core').TargetAdapter}
 */
export const angularMaterialTarget = {
  id: 'angular-material',
  emitFormat: SORB_MAT_SYS_VARS_FORMAT_ID,
  // Kit-vocab expectPrefixes (field-correction, non-negotiable): the
  // payload-side kit namespace, NEVER Angular Material's own `mat-sys-`
  // var prefix — a framework-prefix guard false-positives on every working
  // preview (verified P2/P3 across the demo program). Overridable via
  // `config.preview.expectPrefixes`.
  expectPrefixes: ['color-', 'radius-'],
  // Left undefined on purpose — see file header. Non-React (Angular) target;
  // the leaf-core inject seam stays deferred.
  inject: undefined,
  // CONVENTION-DECLARED + UNCONFIRMED — see file header "DARK MODE" section.
  // Best-known default given Angular Material 20's `light-dark()`/
  // `color-scheme` mechanism has no single canonical selector name.
  darkMode: {
    strategy: 'class',
    darkSelector: '.dark',
  },
}

// Register into the @sorb/core registry WHEN this build's core supports it —
// see reactBootstrap.js for the full rationale (published-core lag guard).
if (typeof core.registerTarget === 'function') {
  core.registerTarget(angularMaterialTarget)
}

export default angularMaterialTarget
