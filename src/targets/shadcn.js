/**
 * The `shadcn` TargetAdapter — framework-targets-productization T1(A):
 * Tailwind v4 + shadcn/ui's component vocabulary, themed through Sorb's
 * `sorb/shadcn-theme` format (`@sorb/seed`) — the `:root{}` shadcn-var→role
 * map + `@theme inline{}` Tailwind-utility bindings. (For plain Tailwind
 * utilities with no shadcn layer, see `./tailwindV4.js`.)
 *
 * Non-React target: live preview is pure CSS (the runtime var-swap re-themes
 * shadcn components — `bg-primary`, `text-foreground`, `border-input`, … —
 * with zero shadcn-specific bridge code) + a `variables.css`/`sorbInit`
 * var-chain — no adapter-level `inject` needed. `inject` is left undefined
 * per the same rationale as `reactBootstrap.js`'s header (the seam is
 * deferred to a future leaf-core/emit split).
 */
import * as core from '@sorb/core'
import { tailwindDarkMode } from '../darkModeConventions.js'

// The Style-Dictionary format id that emits this target's token set
// (`@sorb/seed`'s `SORB_SHADCN`). Inlined as a string (not imported) so
// `@sorb/leaf` doesn't take a build-time dependency on `@sorb/seed` — the
// format id is a stable, documented string contract, not a JS binding.
const SORB_SHADCN_FORMAT_ID = 'sorb/shadcn-theme'

/**
 * @type {import('@sorb/core').TargetAdapter}
 */
export const shadcnTarget = {
  id: 'shadcn',
  emitFormat: SORB_SHADCN_FORMAT_ID,
  // Payload-side KIT vocabulary (framework-targets-productization field-
  // correction), never a framework/shadcn var prefix — shadcn's own vars
  // (`--background`, `--primary`, …) are the OUTPUT of this format, not the
  // guarded payload; the guard is against the underlying Sorb kit vocab the
  // format's :root map references.
  expectPrefixes: ['color-', 'radius-', 'space-', 'font-'],
  // Left undefined on purpose — see file header.
  inject: undefined,
  // CONVENTION-DECLARED, not demo-verified (the JJ demos never built dark
  // mode): shadcn ships on top of Tailwind's `darkMode: 'class'` convention
  // (a `.dark` class toggled on `documentElement`, per shadcn/ui's own
  // docs). Feeds the real-dark-mode program's D1 phase; verification lands
  // there.
  darkMode: tailwindDarkMode,
}

// Register into the @sorb/core registry WHEN this build's core supports it —
// same feature-detect rationale as `reactBootstrap.js` (published core can
// lag the connector contract across the polyrepo's publish order).
if (typeof core.registerTarget === 'function') {
  core.registerTarget(shadcnTarget)
}

export default shadcnTarget
