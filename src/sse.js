// sse.js — hosted-relay preview subscription (Phase E1, hosted-bridge-modes).
//
// When the resolved connection is a hosted relay (Mode A), SorbProvider
// subscribes to preview updates via Server-Sent Events instead of the poll
// loop kept for Mode C / non-SSE bridges. Pure URL-building + frame-parsing
// live here so they're node:test-able without a real EventSource/DOM; the
// thin `createPreviewSubscription` wiring is exercised with a fake
// EventSource constructor in tests.
//
// TODO(juice SSE contract — reconcile when the sorb-juice agent lands the
// real endpoint): assumed shape —
//
//   new EventSource(`${bridgeUrl}/orgs/${orgId}/preview/${previewId}/subscribe`)
//   (auth: EventSource can't set custom headers, so the bearer key is passed
//   as a `?key=` query param until an EventSource polyfill with header
//   support is adopted — flagged for reconciliation, not decided here)
//
//   `message` event, `evt.data` = JSON:
//     { type: 'snapshot' | 'update', tokens: TokenSet }   — apply tokens
//     { type: 'ping' }                                    — keepalive, ignored
//
// Relay-spike precedent (experiments/sorb-bridge-modes/relay-spike/NOTES.md):
// "initial snapshot on subscribe + periodic ping" is exactly this shape.

/**
 * Build the subscribe URL for a hosted-relay preview.
 * @param {string} bridgeUrl
 * @param {string} orgId
 * @param {string} previewId
 * @param {string} [key] Bearer key, sent as `?key=` (see TODO above).
 * @returns {string}
 */
export const buildSubscribeUrl = (bridgeUrl, orgId, previewId, key) => {
  const base = String(bridgeUrl).replace(/\/$/, '')
  const path = `${base}/orgs/${encodeURIComponent(orgId)}/preview/${encodeURIComponent(previewId)}/subscribe`
  if (typeof key === 'string' && key.trim() !== '') {
    return `${path}?key=${encodeURIComponent(key.trim())}`
  }
  return path
}

/**
 * Parse one SSE frame's `data` payload. Returns `null` for anything that
 * isn't a recognised, well-formed frame — callers should simply ignore it
 * (never throw on an unexpected/future frame shape).
 *
 * @param {string} raw
 * @returns {{ type: 'snapshot'|'update', tokens: import('./types').TokenSet } | { type: 'ping' } | null}
 */
export const parsePreviewFrame = (raw) => {
  let frame
  try {
    frame = JSON.parse(raw)
  } catch (e) {
    void e
    return null
  }
  if (!frame || typeof frame !== 'object') return null
  if (frame.type === 'ping') return { type: 'ping' }
  if ((frame.type === 'snapshot' || frame.type === 'update') && frame.tokens && typeof frame.tokens === 'object') {
    return { type: frame.type, tokens: frame.tokens }
  }
  return null
}

/**
 * Open an SSE subscription and wire parsed token frames to `onTokens`.
 * Returns an unsubscribe function, or `null` if no usable EventSource
 * constructor was provided (caller should fall back to polling).
 *
 * @param {{
 *   EventSourceImpl?: typeof EventSource,
 *   url: string,
 *   onTokens: (tokens: import('./types').TokenSet) => void,
 *   onError?: (evt: unknown) => void,
 * }} opts
 * @returns {(() => void) | null}
 */
export const createPreviewSubscription = ({ EventSourceImpl, url, onTokens, onError }) => {
  if (typeof EventSourceImpl !== 'function') return null

  const es = new EventSourceImpl(url)

  es.onmessage = (evt) => {
    const parsed = parsePreviewFrame(evt && evt.data)
    if (!parsed || parsed.type === 'ping') return
    onTokens(parsed.tokens)
  }

  const handleError = (evt) => {
    if (onError) onError(evt)
  }
  if (typeof es.addEventListener === 'function') {
    es.addEventListener('error', handleError)
  } else {
    es.onerror = handleError
  }

  return () => {
    try {
      es.close()
    } catch (e) {
      void e
    }
  }
}
