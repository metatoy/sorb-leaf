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
 * @property {{ttlMs?: number}|null} previewPersistence
 * @property {'sse'|'poll'} transport Which preview-update transport to use.
 */

/**
 * @typedef {Object} SorbConfig
 * @property {string} namespace Your app or design system namespace.
 * @property {TokenSet} tokens
 *   Committed token set — bundled at build time. Always used in production.
 *   Used as fallback if preview fails.
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
 * @property {() => void} clearPreview
 *   Clears the preview, removes the query param, loads committed tokens.
 */

export {}
