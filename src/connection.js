// connection.js — org-key connection resolution (Phase E1, hosted-bridge-modes).
//
// Load-bearing principle (spec/sorb/hosted-bridge-modes-exploration-plan.md §1,
// experiments/sorb-bridge-modes/contracts/config-migration.md "Resolution chain
// per client / sorb-leaf"): the running app identifies itself via a single
// org/publishable key — like an analytics SDK key — and everything else
// (bridge mode/url, token source, preview persistence) resolves from the org
// server-side. Explicit `config.preview.origin` (today's file-mode / Mode C
// path) always wins and is untouched; org-key resolution is purely additive.
//
// TODO(E1 cloud contract — reconcile when the sorb-cloud agent lands the real
// endpoint): assumed shape —
//
//   GET <cloudBase>/api/orgs/resolve?key=<publishableKey>
//   → 200 {
//       bridgeMode: 'A' | 'B' | 'C',
//       bridgeUrl: string,               // e.g. "https://bridge.sorbcloud.com"
//       orgId?: string,                  // needed to build the SSE subscribe URL
//       tokenSource?: string,
//       previewPersistence?: { ttlMs?: number },
//       transport?: 'sse' | 'poll',      // defaults to 'sse' when bridgeMode === 'A'
//     }
//   → non-2xx (unknown/revoked key, network error) → resolution returns `null`;
//     the caller falls back to today's "server not running" behavior (loads
//     committed tokens, never throws).

/** @type {string} */
export const DEFAULT_CLOUD_BASE = 'https://api.sorbcloud.com'

/**
 * Read the org/publishable key off a SorbConfig, accepting either field name.
 * @param {import('./types').SorbConfig} [config]
 * @returns {string|null}
 */
export const getOrgKey = (config) => {
  if (!config) return null
  const key = config.orgKey || config.publishableKey
  return typeof key === 'string' && key.trim() !== '' ? key.trim() : null
}

/**
 * Should we attempt org-key resolution at all? Only when an org key is
 * present AND the consumer has not already pinned an explicit
 * `config.preview.origin` — an explicit origin is today's file-mode / Mode C
 * path and always takes precedence (config-migration.md's resolution chain,
 * step 1).
 *
 * @param {import('./types').SorbConfig} [config]
 * @returns {boolean}
 */
export const shouldResolveOrgConnection = (config) => {
  const key = getOrgKey(config)
  if (!key) return false
  const explicitOrigin = config && config.preview && config.preview.origin
  return !(typeof explicitOrigin === 'string' && explicitOrigin.trim() !== '')
}

/**
 * Fetch the effective connection config for an org/publishable key.
 * Never throws — network errors, non-2xx responses, and malformed payloads
 * all resolve to `null` so callers can fall back safely.
 *
 * @param {string} orgKey
 * @param {{ cloudBase?: string, fetchImpl?: typeof fetch }} [opts]
 * @returns {Promise<import('./types').ResolvedConnection|null>}
 */
export const resolveOrgConnection = async (orgKey, opts) => {
  const { cloudBase = DEFAULT_CLOUD_BASE, fetchImpl } = opts || {}
  const doFetch = fetchImpl || (typeof fetch !== 'undefined' ? fetch : null)
  if (!doFetch || typeof orgKey !== 'string' || orgKey.trim() === '') return null

  try {
    const base = cloudBase.replace(/\/$/, '')
    const url = `${base}/api/orgs/resolve?key=${encodeURIComponent(orgKey.trim())}`
    const res = await doFetch(url)
    if (!res || !res.ok) return null
    const data = await res.json()
    if (!data || typeof data !== 'object') return null
    if (typeof data.bridgeUrl !== 'string' || data.bridgeUrl.trim() === '') return null

    const bridgeMode = typeof data.bridgeMode === 'string' ? data.bridgeMode : 'C'
    return {
      bridgeMode,
      bridgeUrl: data.bridgeUrl,
      orgId: typeof data.orgId === 'string' ? data.orgId : null,
      tokenSource: typeof data.tokenSource === 'string' ? data.tokenSource : null,
      previewPersistence:
        data.previewPersistence && typeof data.previewPersistence === 'object'
          ? data.previewPersistence
          : null,
      transport: data.transport === 'poll' || data.transport === 'sse' ? data.transport : bridgeMode === 'A' ? 'sse' : 'poll',
    }
  } catch (e) {
    void e
    return null
  }
}

/**
 * Merge a resolved org connection into an effective `preview` config, without
 * mutating the inputs. When `resolved` is falsy this is the identity function
 * on `config.preview` — the byte-for-byte back-compat path.
 *
 * @param {import('./types').SorbConfig} config
 * @param {import('./types').ResolvedConnection|null} resolved
 * @returns {import('./types').PreviewConfig}
 */
export const buildEffectivePreviewConfig = (config, resolved) => {
  const base = (config && config.preview) || {}
  if (!resolved) return base
  const orgKey = getOrgKey(config)
  return {
    ...base,
    enabled: true,
    origin: resolved.bridgeUrl,
    allowedOrigins: [...(Array.isArray(base.allowedOrigins) ? base.allowedOrigins : []), resolved.bridgeUrl],
    key: base.key || orgKey || undefined,
  }
}

/**
 * Build the effective SorbConfig used for the rest of the provider's logic:
 * `config` untouched, except `preview` merged with the resolved connection
 * (if any). Pure, so it's trivially testable independent of React/fetch.
 *
 * @param {import('./types').SorbConfig} config
 * @param {import('./types').ResolvedConnection|null} resolved
 * @returns {import('./types').SorbConfig}
 */
export const buildEffectiveConfig = (config, resolved) => {
  if (!resolved) return config
  return { ...config, preview: buildEffectivePreviewConfig(config, resolved) }
}
