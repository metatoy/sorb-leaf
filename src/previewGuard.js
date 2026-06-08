/**
 * Preview-origin guard — the C3 production foot-gun guard.
 *
 * Preview defaults OFF. Even when a team opts in, the SDK must only talk to a
 * TRUSTED bridge origin: a stray `?preview=` on a production link must not be
 * able to point the running app at an untrusted bridge. This pure helper makes
 * that decision; the provider wires it in. No DOM, fully node:test-able.
 */

const DEFAULT_ORIGIN = 'http://localhost:7777'

/**
 * Is `origin` a localhost / loopback origin (any port)? `http`/`https`,
 * `localhost`, `127.0.0.1`, and IPv6 `[::1]` all count.
 *
 * @param {string} origin
 * @returns {boolean}
 */
const isLocalhostOrigin = (origin) => {
  let url
  try {
    url = new URL(origin)
  } catch (e) {
    void e
    return false
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false
  const host = url.hostname.toLowerCase()
  return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]'
}

/**
 * Normalise to a bare `protocol//host:port` origin for exact comparison
 * against a consumer-supplied allowlist (trailing slashes / paths ignored).
 *
 * @param {string} value
 * @returns {string|null}
 */
const toOrigin = (value) => {
  try {
    return new URL(value).origin
  } catch (e) {
    void e
    return null
  }
}

/**
 * Decide whether the preview path may run, and against which origin.
 *
 * Allowed only when BOTH:
 *   1. `config.preview?.enabled === true` (strict — not just truthy), and
 *   2. the resolved origin is on the allowlist: localhost/127.0.0.1/[::1]
 *      (any port) by default, plus any exact origins the consumer lists in
 *      `config.preview.allowedOrigins`.
 *
 * Anything else (disabled, missing config, non-allowlisted origin, malformed
 * origin) → not allowed; the caller falls back to committed tokens.
 *
 * @param {import('./types').SorbConfig} [config]
 * @returns {{ allowed: boolean, origin: string|null, reason?: string }}
 */
export const shouldLoadPreview = (config) => {
  const preview = config && config.preview
  if (!preview || preview.enabled !== true) {
    return { allowed: false, origin: null, reason: 'preview-disabled' }
  }

  const origin = preview.origin ?? DEFAULT_ORIGIN
  const normalized = toOrigin(origin)
  if (!normalized) {
    return { allowed: false, origin: null, reason: 'malformed-origin' }
  }

  if (isLocalhostOrigin(origin)) {
    return { allowed: true, origin }
  }

  const extra = Array.isArray(preview.allowedOrigins) ? preview.allowedOrigins : []
  const allowed = extra.some((entry) => toOrigin(entry) === normalized)
  if (allowed) {
    return { allowed: true, origin }
  }

  return { allowed: false, origin, reason: 'origin-not-allowlisted' }
}
