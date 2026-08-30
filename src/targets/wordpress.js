// wordpress — WordPress (block-theme) TargetAdapter
// (framework-targets-productization T9).
//
// ⚠️ EXPERIMENTAL / STAGED — NOT formally included or supported yet
// (founder 2026-08-30). Built + round-trip-verified on the `feat/wordpress-target`
// branch, but deliberately NOT merged to main, NOT published in any @sorb/leaf
// release, NOT re-exported from the public `src/index.js` barrel, and NOT listed
// in the sorb-cloud dashboard. Importing this module registers the target; the
// package entry does NOT import it, so a normal `@sorb/leaf` consumer never sees
// it until this is formally shipped. To ship: merge this branch, add the
// re-export to src/index.js, the README snippet, and the dashboard entry, then
// cut a release.
//
// Mechanism (non-React host): the WordPress block theme consumes the
// `sorb/wp-theme-json` emit (a theme.json `settings` fragment of `var(--token)`
// refs) via a `wp_theme_json_data_theme` filter; WP compiles preset vars that
// chain onto the kit's own custom properties, so `sorbInit` (from
// `@sorb/leaf/core`) live-re-themes with NO plugin override layer. `inject` stays
// undefined — like every target, live preview rides the CSS var-chain, not a
// registered injector. See `sorb-demo-wordpress` for the reference theme+plugin.

import * as core from '@sorb/core'

/** The `sorb/wp-theme-json` SD format id — inlined as a stable string contract
 *  (NOT imported from @sorb/seed, so @sorb/leaf takes no build dep on it). */
const SORB_WP_THEME_JSON_FORMAT_ID = 'sorb/wp-theme-json'

/**
 * @type {import('@sorb/core').TargetAdapter}
 */
export const wordpressTarget = {
  id: 'wordpress',
  emitFormat: SORB_WP_THEME_JSON_FORMAT_ID,
  // Vocab guard = the kit's OWN token-id prefixes (what a preview push carries),
  // NOT WordPress's derived `--wp--preset--*`/`--wp--custom--*` names. WP's
  // theme.json format emits the whole tree, so the guard spans all kit tiers.
  expectPrefixes: ['color-', 'space-', 'font-', 'radius-', 'shadow-', 'button-', 'card-', 'badge-', 'input-', 'nav-', 'toast-'],
  // Non-React host; live preview is the pure CSS var-chain via sorbInit — no
  // registered injector needed (the leaf-core `inject` seam stays deferred).
  inject: undefined,
  // WordPress has no single manual light/dark convention across themes; a Sorb
  // preview only swaps token VALUES, so this target is single-mode for now.
  // (Left undefined per the DarkModeConvention typedef = "no dark notion".)
  darkMode: undefined,
}

// Feature-detected side-effect registration — mirrors reactBootstrap.js. The
// `typeof` guard keeps esbuild builds working against a published @sorb/core
// that may lag the contract.
if (typeof core.registerTarget === 'function') {
  core.registerTarget(wordpressTarget)
}

export default wordpressTarget
