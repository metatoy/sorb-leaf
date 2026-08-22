import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_CLOUD_BASE,
  getOrgKey,
  shouldResolveOrgConnection,
  resolveOrgConnection,
  buildEffectivePreviewConfig,
  buildEffectiveConfig,
} from './connection.js'

// ─── getOrgKey ────────────────────────────────────────────────────────────

test('getOrgKey reads config.orgKey', () => {
  assert.equal(getOrgKey({ orgKey: 'sorb_pk_abc' }), 'sorb_pk_abc')
})

test('getOrgKey falls back to config.publishableKey', () => {
  assert.equal(getOrgKey({ publishableKey: 'sorb_pk_xyz' }), 'sorb_pk_xyz')
})

test('getOrgKey prefers orgKey over publishableKey when both set', () => {
  assert.equal(getOrgKey({ orgKey: 'a', publishableKey: 'b' }), 'a')
})

test('getOrgKey trims whitespace', () => {
  assert.equal(getOrgKey({ orgKey: '  sorb_pk_abc  ' }), 'sorb_pk_abc')
})

test('getOrgKey is null for missing/blank/non-string', () => {
  assert.equal(getOrgKey({}), null)
  assert.equal(getOrgKey(undefined), null)
  assert.equal(getOrgKey({ orgKey: '   ' }), null)
  assert.equal(getOrgKey({ orgKey: 42 }), null)
})

// ─── shouldResolveOrgConnection ───────────────────────────────────────────

test('shouldResolveOrgConnection: true when orgKey present, no explicit origin', () => {
  assert.equal(shouldResolveOrgConnection({ orgKey: 'sorb_pk_abc' }), true)
})

test('shouldResolveOrgConnection: false when no org key at all', () => {
  assert.equal(shouldResolveOrgConnection({}), false)
  assert.equal(shouldResolveOrgConnection({ preview: { origin: 'http://localhost:7777' } }), false)
})

test('shouldResolveOrgConnection: false when explicit preview.origin is set (file-mode wins)', () => {
  assert.equal(
    shouldResolveOrgConnection({ orgKey: 'sorb_pk_abc', preview: { origin: 'http://localhost:7777' } }),
    false,
  )
})

test('shouldResolveOrgConnection: true when preview.origin is blank/whitespace', () => {
  assert.equal(shouldResolveOrgConnection({ orgKey: 'sorb_pk_abc', preview: { origin: '' } }), true)
  assert.equal(shouldResolveOrgConnection({ orgKey: 'sorb_pk_abc', preview: { origin: '   ' } }), true)
})

// ─── resolveOrgConnection ─────────────────────────────────────────────────

const fakeFetch = (impl) => impl

test('resolveOrgConnection: happy path builds the assumed request + response shape', async () => {
  let seenUrl
  const fetchImpl = fakeFetch(async (url) => {
    seenUrl = url
    return {
      ok: true,
      json: async () => ({
        bridgeMode: 'A',
        bridgeUrl: 'https://bridge.sorbcloud.com',
        orgId: 'org_123',
        tokenSource: 'main',
        previewPersistence: true,
      }),
    }
  })

  const result = await resolveOrgConnection('sorb_pk_abc', { fetchImpl })

  assert.equal(seenUrl, `${DEFAULT_CLOUD_BASE}/api/orgs/resolve?key=sorb_pk_abc`)
  assert.deepEqual(result, {
    bridgeMode: 'A',
    bridgeUrl: 'https://bridge.sorbcloud.com',
    orgId: 'org_123',
    tokenSource: 'main',
    previewPersistence: true,
    transport: 'sse',
  })
})

test('resolveOrgConnection: defaults transport to poll for non-A modes', async () => {
  const fetchImpl = fakeFetch(async () => ({
    ok: true,
    json: async () => ({ bridgeMode: 'C', bridgeUrl: 'http://localhost:7777' }),
  }))
  const result = await resolveOrgConnection('sorb_pk_abc', { fetchImpl })
  assert.equal(result.transport, 'poll')
})

test('resolveOrgConnection: honors explicit transport override', async () => {
  const fetchImpl = fakeFetch(async () => ({
    ok: true,
    json: async () => ({ bridgeMode: 'C', bridgeUrl: 'http://localhost:7777', transport: 'sse' }),
  }))
  const result = await resolveOrgConnection('sorb_pk_abc', { fetchImpl })
  assert.equal(result.transport, 'sse')
})

test('resolveOrgConnection: respects a custom cloudBase', async () => {
  let seenUrl
  const fetchImpl = fakeFetch(async (url) => {
    seenUrl = url
    return { ok: true, json: async () => ({ bridgeUrl: 'https://x' }) }
  })
  await resolveOrgConnection('k', { fetchImpl, cloudBase: 'https://staging.sorbcloud.com/' })
  assert.equal(seenUrl, 'https://staging.sorbcloud.com/api/orgs/resolve?key=k')
})

test('resolveOrgConnection: non-ok response → null', async () => {
  const fetchImpl = fakeFetch(async () => ({ ok: false, json: async () => ({}) }))
  assert.equal(await resolveOrgConnection('sorb_pk_abc', { fetchImpl }), null)
})

test('resolveOrgConnection: network error (fetch throws) → null, never throws', async () => {
  const fetchImpl = fakeFetch(async () => {
    throw new Error('network down')
  })
  assert.equal(await resolveOrgConnection('sorb_pk_abc', { fetchImpl }), null)
})

test('resolveOrgConnection: malformed payload (missing bridgeUrl) → null', async () => {
  const fetchImpl = fakeFetch(async () => ({ ok: true, json: async () => ({ bridgeMode: 'A' }) }))
  assert.equal(await resolveOrgConnection('sorb_pk_abc', { fetchImpl }), null)
})

test('resolveOrgConnection: non-object payload → null', async () => {
  const fetchImpl = fakeFetch(async () => ({ ok: true, json: async () => null }))
  assert.equal(await resolveOrgConnection('sorb_pk_abc', { fetchImpl }), null)
})

test('resolveOrgConnection: no key or no fetch available → null', async () => {
  assert.equal(await resolveOrgConnection('', { fetchImpl: fakeFetch(async () => ({ ok: true })) }), null)
  assert.equal(await resolveOrgConnection('sorb_pk_abc', { fetchImpl: null }), null)
})

// ─── buildEffectivePreviewConfig / buildEffectiveConfig ───────────────────

test('buildEffectivePreviewConfig: null resolved → identity on config.preview', () => {
  const preview = { enabled: false }
  assert.equal(buildEffectivePreviewConfig({ preview }, null), preview)
  assert.deepEqual(buildEffectivePreviewConfig({}, null), {})
})

test('buildEffectivePreviewConfig: merges resolved bridgeUrl as origin + allowlist, forces enabled', () => {
  const resolved = { bridgeUrl: 'https://bridge.sorbcloud.com', transport: 'sse' }
  const result = buildEffectivePreviewConfig({ orgKey: 'sorb_pk_abc' }, resolved)
  assert.equal(result.enabled, true)
  assert.equal(result.origin, 'https://bridge.sorbcloud.com')
  assert.deepEqual(result.allowedOrigins, ['https://bridge.sorbcloud.com'])
  assert.equal(result.key, 'sorb_pk_abc')
})

test('buildEffectivePreviewConfig: preserves an existing explicit preview.key over the org key', () => {
  const resolved = { bridgeUrl: 'https://bridge.sorbcloud.com' }
  const result = buildEffectivePreviewConfig(
    { orgKey: 'sorb_pk_abc', preview: { key: 'sorb_pk_explicit' } },
    resolved,
  )
  assert.equal(result.key, 'sorb_pk_explicit')
})

test('buildEffectivePreviewConfig: extends (does not clobber) an existing allowedOrigins list', () => {
  const resolved = { bridgeUrl: 'https://bridge.sorbcloud.com' }
  const result = buildEffectivePreviewConfig(
    { preview: { allowedOrigins: ['https://staging.example.com'] } },
    resolved,
  )
  assert.deepEqual(result.allowedOrigins, ['https://staging.example.com', 'https://bridge.sorbcloud.com'])
})

test('buildEffectiveConfig: null resolved → same config object (identity)', () => {
  const config = { namespace: 'x', tokens: {} }
  assert.equal(buildEffectiveConfig(config, null), config)
})

test('buildEffectiveConfig: merges resolved preview without mutating the original config', () => {
  const config = { namespace: 'x', tokens: {}, orgKey: 'sorb_pk_abc' }
  const resolved = { bridgeUrl: 'https://bridge.sorbcloud.com', transport: 'sse' }
  const effective = buildEffectiveConfig(config, resolved)
  assert.equal(effective.namespace, 'x')
  assert.equal(effective.preview.origin, 'https://bridge.sorbcloud.com')
  assert.equal(config.preview, undefined) // original untouched
})
