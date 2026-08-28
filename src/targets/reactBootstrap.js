/**
 * The `react-bootstrap` TargetAdapter — Sorb's DEFAULT target (connectors
 * architecture spec §3.3/§4 C3): "how tokens bind into the running app" for
 * today's React + Bootstrap-styled component set.
 *
 * v1 scope (spec §4 C3): DEFINE + REGISTER the adapter against the
 * `@sorb/core` connector contract. This is a descriptive re-cast of today's
 * already-shipped behavior — it does NOT reroute the live vocab guard or the
 * Provider's token-apply path to the registry. `SorbProvider` keeps reading
 * `config.preview.expectPrefixes` directly (see `TokenProvider.jsx`) and
 * `applyTokens` (`apply.js`) stays the pure-JS inject; both are unchanged by
 * this file. `inject` is intentionally left undefined here — React hosts
 * bind tokens via the Provider/`applyTokens`, not via an adapter-level
 * `inject` call; that seam is for non-React hosts and belongs to the
 * Component Compat Roadmap's `@sorb/leaf-core`/`@sorb/emit` extraction
 * (out of scope for this phase).
 */
import { registerTarget } from '@sorb/core'

// The Style-Dictionary format id that emits this target's token set, from the
// named-format registry (`sorb-demo/sd/sorb-format.js:30`):
//   export const SORB_TOKENSET = 'sorb/tokenset-esm'
// Inlined as a string (not imported) so `@sorb/leaf` doesn't take a build-time
// dependency on `sorb-demo`'s Style Dictionary config — the format id is a
// stable, documented string contract, not a JS binding.
const SORB_TOKENSET_FORMAT_ID = 'sorb/tokenset-esm'

/**
 * @type {import('@sorb/core').TargetAdapter}
 */
export const reactBootstrapTarget = {
  id: 'react-bootstrap',
  emitFormat: SORB_TOKENSET_FORMAT_ID,
  // The Bootstrap-styled vocab namespace (matches `sorb-demo/src/sorbConfig.js`'s
  // `preview.expectPrefixes: ['bs-']`).
  expectPrefixes: ['bs-'],
  // Left undefined on purpose — see file header.
  inject: undefined,
}

registerTarget(reactBootstrapTarget)

export default reactBootstrapTarget
