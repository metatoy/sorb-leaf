// Type definitions for @sorb/leaf, expressed as JSDoc typedefs.
// These carry no runtime code — they exist purely for editor tooling and docs.

/**
 * @typedef {string | number} TokenValue
 */

/**
 * A flat map of token name → value.
 * @typedef {Object.<string, TokenValue>} TokenSet
 */

/**
 * @typedef {Object} PreviewConfig
 * @property {boolean} enabled
 *   Whether to allow preview mode at all. Set to false in production builds.
 *   e.g. `enabled: process.env.NODE_ENV !== 'production'`
 * @property {string} [origin]
 *   Where the local Sorb CLI is running. Defaults to http://localhost:7777.
 *   Only localhost/127.0.0.1/[::1] origins (any port) are trusted by default;
 *   any other origin must be listed in `allowedOrigins` or preview is blocked.
 * @property {string[]} [allowedOrigins]
 *   Extra exact origins (e.g. a staging or hosted bridge) to trust in addition
 *   to localhost. Never enable preview against an untrusted origin in production.
 * @property {string} [key]
 *   Bearer key for a hosted bridge (Sorb Cloud). When set, preview/verify
 *   requests send `Authorization: Bearer <key>`; when unset (localhost
 *   `sorb dev`) no header is sent. Use a read-only publishable `sorb_pk_…` key
 *   in anything distributable — supply it via env/config at deploy time, never
 *   hardcoded in source.
 * @property {number} [pollInterval]
 *   How often to poll for token updates while a preview is active,
 *   in milliseconds. Defaults to 1500.
 * @property {string[]} [expectPrefixes]
 *   Vocabulary/contract guard (B4). Token-key prefixes this app actually
 *   consumes (e.g. `['bs-']`). When set, a loaded preview that applies tokens
 *   but matches NONE of these prefixes is flagged (`previewMismatch` context
 *   state) and a console.warn is emitted — catching the silent-no-op where the
 *   banner lights but nothing re-skins. Omit/empty ⇒ guard disabled (default).
 */

/**
 * A resolved token with full metadata, as produced by sorb-seed.
 * The optional `deprecated` / `replacedBy` fields are only present when the
 * DTCG source carries `$deprecated: true` / `$extensions.sorb.replacedBy`.
 * @typedef {Object} ResolvedToken
 * @property {string}  id
 * @property {string}  cssVar
 * @property {*}       value
 * @property {string}  tier
 * @property {string}  type
 * @property {true}    [deprecated]
 * @property {string}  [replacedBy]
 */

/**
 * The effective connection sorb-cloud resolved for an org/publishable key
 * (E1 — hosted-bridge-modes, config-migration.md). See `src/connection.js`
 * for the assumed `GET <cloudBase>/api/orgs/resolve?key=` contract — TODO,
 * reconcile against the real sorb-cloud endpoint when it lands.
 * @typedef {Object} ResolvedConnection
 * @property {'A'|'B'|'C'|string} bridgeMode The org's configured bridge mode.
 * @property {string} bridgeUrl The bridge origin to preview against.
 * @property {string|null} orgId Needed to build the SSE subscribe URL.
 * @property {string|null} tokenSource
 * @property {boolean|null} previewPersistence
 * @property {'sse'|'poll'} transport Which preview-update transport to use.
 */

/**
 * A single row of the legacy-map shim — a subset of the engine's `auto` row
 * from `.sorb/adapt-report.json` (roadmap §6). The full engine row also carries
 * `file`/`loc`/`tokenId`/`confidence`/`candidates`/`status`; the runtime shim
 * only consumes `{ raw, prop, cssVar }`, so any `auto` row is a valid LegacyMapRow.
 *
 * @typedef {Object} LegacyMapRow
 * @property {string} raw
 *   The original hardcoded value as authored, e.g. "#0F65EF" or "4px". Doubles
 *   as the `var()` fallback so removing the provider restores it exactly.
 * @property {string} prop
 *   The CSS property the value applies to, e.g. "background" or "borderRadius"
 *   (camelCase or kebab-case both accepted).
 * @property {string} cssVar
 *   The target token's custom-property name WITHOUT the leading `--`,
 *   e.g. "button-primary-bg-default".
 */

/**
 * Opaque handle returned by `applyLegacyMap`, passed to `clearLegacyMap` to
 * restore the original inline styles. Internal shape may change.
 * @typedef {Object} LegacyMapHandle
 * @property {Array<{ el: HTMLElement, prop: string, prev: string }>} restores
 */

/**
 * @typedef {Object} SorbConfig
 * @property {string} namespace Your app or design system namespace.
 * @property {TokenSet} tokens
 *   Committed token set — bundled at build time. Always used in production.
 *   Used as fallback if preview fails.
 * @property {TokenSet} [darkTokens]
 *   Committed DARK-mode token set (real-dark-mode spec D3) — same token ids
 *   as `tokens`, dark values. When present, `SorbProvider` injects a
 *   mode-aware `<style id="sorb-tokens">` stylesheet (`buildModeStylesheet`)
 *   instead of the flat inline `applyTokens` path, and `setMode`/`useTheme`
 *   become meaningful. Omit for a single-mode (light-only) app — unchanged,
 *   byte-identical behavior to today.
 * @property {import('@sorb/core').DarkModeConvention} [darkModeConvention]
 *   Override the dark-mode convention used to build the mode-aware
 *   stylesheet. Defaults to the `react-bootstrap` TargetAdapter's
 *   `darkMode` (`data-bs-theme`) — override only for a non-default target.
 * @property {ResolvedToken[]} [resolved]
 *   Full resolved token array from sorb-seed output. When provided, SorbProvider
 *   will emit a dev-mode console.warn for any token flagged as deprecated.
 * @property {PreviewConfig} [preview]
 *   Preview configuration. Omit or set enabled: false to disable entirely.
 *   An explicit `preview.origin` always wins over org-key resolution (below)
 *   — this is today's file-mode / Mode C path and is never overridden.
 * @property {string} [orgKey]
 *   Org/publishable key (E1). Like an analytics SDK key: when set (and no
 *   explicit `preview.origin` is pinned), SorbProvider resolves bridge
 *   mode/url, token source, and preview persistence from sorb-cloud instead
 *   of requiring a local `sorb.config.json`. Purely additive — omit for
 *   today's file-mode behavior, unchanged.
 * @property {string} [publishableKey]
 *   Alias for `orgKey` — either field name works; `orgKey` is checked first
 *   when both are set (see `getOrgKey` in `connection.js`).
 * @property {string} [cloudBase]
 *   Override the sorb-cloud base URL used for org-key resolution. Defaults
 *   to `connection.js`'s `DEFAULT_CLOUD_BASE`. Mainly for tests/staging.
 * @property {{ allowedOrigins?: string[] }} [diagnostics]
 *   Diagnosis channel (spec jj-demo-rebind-and-diagnosis D2). The leaf answers
 *   a `{ type:'sorb-ping' }` postMessage with a `sorb-hello` fingerprint
 *   (namespace + key last4 + version + bridge origin + preview outcome) — but
 *   ONLY when the ping's `event.origin` is allowlisted. Baked defaults are Sorb
 *   Cloud's dashboard (`https://app.sorbcloud.com` + staging); set
 *   `diagnostics.allowedOrigins` to extend the allowlist for a self-hosted
 *   dashboard. The leaf never posts unsolicited and replies only to the exact
 *   pinging origin — see `src/diagnostics.js`.
 * @property {LegacyMapRow[]} [legacyMap]
 *   Legacy-React adapter shim: the `auto` rows from `.sorb/adapt-report.json`.
 *   When present, after committed tokens are applied the provider remaps any
 *   element whose hardcoded computed style matches a row's `raw` to
 *   `var(--<cssVar>, <raw>)` — non-destructive, reversible on unmount.
 */

/**
 * @typedef {Object} TokenContextValue
 * @property {TokenSet} tokens Currently active token set (committed or preview).
 * @property {boolean} isPreview True when a preview token set is loaded.
 * @property {string | null} previewId The active preview ID, or null.
 * @property {boolean} previewMismatch
 *   True when the active preview applied tokens but none matched the app's
 *   `preview.expectPrefixes` (vocabulary mismatch — the app likely won't
 *   re-skin). Always false when the guard is not opted into.
 * @property {{ id: string, outcome: 'not_found'|'unauthorized'|'network' }|null} previewError
 *   Set when a deliberately-requested `?preview=` fetch failed and the SDK
 *   silently fell back to committed tokens (the previously-invisible failure —
 *   spec jj-demo-rebind-and-diagnosis D2). `outcome` classifies the HTTP/network
 *   cause: `not_found` (404 — cross-tenant id or expired preview), `unauthorized`
 *   (401/403), `network` (unreachable/parse). `null` on the normal path.
 * @property {() => void} clearPreview
 *   Clears the preview, removes the query param, loads committed tokens.
 * @property {'auto'|'light'|'dark'} mode
 *   The current MANUAL mode selection (real-dark-mode spec D3). `'auto'`
 *   (default) defers to the OS `prefers-color-scheme` via the injected media
 *   query — no `data-bs-theme` attribute is set. `'light'`/`'dark'` are a
 *   manual override that always wins (sets `data-bs-theme`).
 * @property {(mode: 'auto'|'light'|'dark') => void} setMode
 *   Change the manual mode selection.
 * @property {'light'|'dark'} resolvedScheme
 *   The scheme actually in effect right now: `mode` itself when it's
 *   `'light'`/`'dark'`, otherwise the live-tracked OS
 *   `prefers-color-scheme` result while `mode === 'auto'`.
 */

export {}
