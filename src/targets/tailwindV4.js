/**
 * The `tailwind-v4` TargetAdapter — framework-targets-productization T1(A):
 * plain Tailwind v4 utilities theming through Sorb's `@theme inline` format
 * (`sorb/tailwind-theme`, `@sorb/seed`), with NO shadcn semantic-var layer.
 * (For shadcn/ui's component vocabulary, see `./shadcn.js`.)
 *
 * Non-React target: live preview is pure CSS (the runtime var-swap re-themes
 * `@theme inline` utilities with zero Tailwind-specific bridge code) + a
 * `variables.css`/`sorbInit` var-chain — no adapter-level `inject` needed.
 * `inject` is left undefined per the same rationale as `reactBootstrap.js`'s
 * header (the seam is deferred to a future leaf-core/emit split).
 */
import * as core from '@sorb/core'
import { tailwindDarkMode } from '../darkModeConventions.js'

// The Style-Dictionary format id that emits this target's token set
// (`@sorb/seed`'s `SORB_TAILWIND`). Inlined as a string (not imported) so
// `@sorb/leaf` doesn't take a build-time dependency on `@sorb/seed` — the
// format id is a stable, documented string contract, not a JS binding.
const SORB_TAILWIND_FORMAT_ID = 'sorb/tailwind-theme'

/**
 * @type {import('@sorb/core').TargetAdapter}
 */
export const tailwindV4Target = {
  id: 'tailwind-v4',
  emitFormat: SORB_TAILWIND_FORMAT_ID,
  // Payload-side KIT vocabulary (framework-targets-productization field-
  // correction), never a framework var prefix — a plain Sorb kit's own
  // token-family prefixes, matching what `@theme inline` references.
  expectPrefixes: ['color-', 'radius-', 'space-', 'font-'],
  // Left undefined on purpose — see file header.
  inject: undefined,
  // CONVENTION-DECLARED, not demo-verified (the JJ demos never built dark
  // mode): Tailwind's documented `darkMode: 'class'` convention — a `.dark`
  // class toggled on `documentElement`. Feeds the real-dark-mode program's D1
  // phase; verification lands there.
  darkMode: tailwindDarkMode,
}

// Register into the @sorb/core registry WHEN this build's core supports it —
// same feature-detect rationale as `reactBootstrap.js` (published core can
// lag the connector contract across the polyrepo's publish order).
if (typeof core.registerTarget === 'function') {
  core.registerTarget(tailwindV4Target)
}

export default tailwindV4Target
