// diagnostics.js — the `sorb-hello` diagnosis channel (spec
// jj-demo-rebind-and-diagnosis §D2).
//
// Security posture (spec "Security invariants" 1–3, 5): this is a
// DIAGNOSTIC-ONLY channel. The leaf NEVER posts an unsolicited message — it
// only ANSWERS a `{ type:'sorb-ping' }` from a window on the diagnostics-origin
// allowlist, and always replies with the EXACT `event.origin` as targetOrigin
// (never `'*'`). The payload carries only namespace + key **last4** + version +
// bridge origin + the local preview-attempt outcome — everything already
// world-readable in the demo's public JS bundle. No auth/entitlement/routing
// decision may ever derive from a `sorb-hello`.
//
// Pure + node:test-able: no `window`, no `postMessage` at module scope. core.js
// wires the responder to `window.addEventListener('message', …)`; the responder
// itself replies via `event.source.postMessage`, so it's driven with a plain
// fake event object in tests.

/** Bumped in lockstep with package.json `version`. */
export const LEAF_VERSION = '0.5.0'

/**
 * Baked-default diagnostics origins — Sorb Cloud's dashboard (prod + staging),
 * the only pages entitled to fingerprint a demo's binding. Self-hosters extend
 * this via `config.diagnostics.allowedOrigins`.
 * @type {string[]}
 */
export const DEFAULT_DIAGNOSTICS_ORIGINS = ['https://app.sorbcloud.com', 'https://staging.app.sorbcloud.com']

/**
 * Normalize an origin string to its bare `scheme://host[:port]` form (no
 * trailing slash/path) for exact comparison. Returns null for empty/non-string
 * input. A sandboxed iframe's opaque `"null"` origin is returned verbatim and
 * so never matches a real allowlist entry.
 * @param {unknown} o
 * @returns {string|null}
 */
const normalizeOrigin = (o) => {
  if (typeof o !== 'string') return null
  const trimmed = o.trim()
  if (trimmed === '') return null
  try {
    return new URL(trimmed).origin
  } catch (e) {
    void e
    return trimmed.replace(/\/+$/, '')
  }
}

/**
 * Merge the baked-default diagnostics origins with any self-hoster overrides
 * from `config.diagnostics.allowedOrigins`.
 * @param {import('./types').SorbConfig} [config]
 * @returns {string[]}
 */
export const resolveDiagnosticsOrigins = (config) => {
  const extra =
    config && config.diagnostics && Array.isArray(config.diagnostics.allowedOrigins)
      ? config.diagnostics.allowedOrigins
      : []
  return [...DEFAULT_DIAGNOSTICS_ORIGINS, ...extra]
}

/**
 * Is `origin` on the diagnostics allowlist? Exact origin match after
 * normalizing trailing-slash/path differences on both sides.
 * @param {unknown} origin
 * @param {string[]} allowed
 * @returns {boolean}
 */
export const isAllowedDiagnosticsOrigin = (origin, allowed) => {
  const target = normalizeOrigin(origin)
  if (!target || !Array.isArray(allowed)) return false
  return allowed.some((a) => normalizeOrigin(a) === target)
}

/**
 * Last 4 characters of a key — the ONLY part of a key that ever leaves the
 * leaf (invariant 3: never the full pk). Returns null when there's no usable
 * key.
 * @param {unknown} key
 * @returns {string|null}
 */
export const keyLast4 = (key) => {
  if (typeof key !== 'string') return null
  const trimmed = key.trim()
  return trimmed === '' ? null : trimmed.slice(-4)
}

/**
 * Build a responder for the ping-only diagnostics handshake. The returned
 * function is a `message` event handler: it answers a `sorb-ping` from an
 * allowlisted origin by posting a `sorb-hello` back to `event.source` with the
 * EXACT `event.origin`. Every other message is ignored silently — including
 * pings from non-allowlisted origins. It NEVER initiates a message.
 *
 * @param {{
 *   getSnapshot: () => { namespace: string, keyLast4: string|null, leafVersion: string, bridgeOrigin: string|null, preview: { requestedId: string|null, outcome: string } },
 *   getAllowedOrigins: () => string[],
 * }} opts
 * @returns {(event: MessageEvent) => void}
 */
export const createDiagnosticsResponder = ({ getSnapshot, getAllowedOrigins }) => {
  return (event) => {
    if (!event || typeof event !== 'object') return
    const data = event.data
    if (!data || typeof data !== 'object' || data.type !== 'sorb-ping') return
    if (!isAllowedDiagnosticsOrigin(event.origin, getAllowedOrigins())) return
    const source = event.source
    if (!source || typeof source.postMessage !== 'function') return
    // Exact origin, never '*' (invariant 1). Reply only to the pinger.
    source.postMessage({ type: 'sorb-hello', ...getSnapshot() }, event.origin)
  }
}
