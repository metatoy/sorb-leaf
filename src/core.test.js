import { test } from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { classifyPreviewFailure, sorbInit } from './core.js'

// ─── classifyPreviewFailure (pure) ──────────────────────────────────────────

test('classifyPreviewFailure: 404 → not_found (cross-tenant / expired)', () => {
  assert.equal(classifyPreviewFailure({ status: 404 }), 'not_found')
})

test('classifyPreviewFailure: 401/403 → unauthorized', () => {
  assert.equal(classifyPreviewFailure({ status: 401 }), 'unauthorized')
  assert.equal(classifyPreviewFailure({ status: 403 }), 'unauthorized')
})

test('classifyPreviewFailure: 5xx / other status → network', () => {
  assert.equal(classifyPreviewFailure({ status: 500 }), 'network')
  assert.equal(classifyPreviewFailure({ status: 200 }), 'network') // e.g. body JSON parse fail
})

test('classifyPreviewFailure: no response (fetch rejected) → network', () => {
  assert.equal(classifyPreviewFailure(undefined), 'network')
  assert.equal(classifyPreviewFailure(null), 'network')
})

// ─── sorbInit failure path (integration) ────────────────────────────────────
//
// Uses jsdom only for `document` (applyTokens/clearModeStylesheet). `window`
// is a minimal spy that records the diagnostics message listener so we can
// invoke it directly — this sidesteps jsdom's MessageEvent `source` handling
// while still exercising core.js's real wiring.

const DEMO_KEY = 'sorb_pk_7dYkZJFQ'

function installEnv(search) {
  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>')
  global.document = dom.window.document
  global.location = { search, pathname: '/' }
  const listeners = []
  global.window = {
    addEventListener: (type, handler) => listeners.push({ type, handler }),
    removeEventListener: () => {},
  }
  return { listeners }
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 15))

test('failed 404 preview: silent-fallback preserved BUT previewError recorded + one always-on warn', async () => {
  const { listeners } = installEnv('?preview=DXw1DDaJ')
  global.fetch = async () => ({ ok: false, status: 404, json: async () => ({}) })
  const warns = []
  const origWarn = console.warn
  console.warn = (msg) => warns.push(msg)

  let inst
  try {
    inst = sorbInit({
      namespace: 'jj-demo',
      tokens: { 'bs-primary': '#111111' },
      preview: { enabled: true, key: DEMO_KEY },
    })
    await tick()
  } finally {
    console.warn = origWarn
  }

  const state = inst.getState()
  // silent fallback preserved: not in preview, committed tokens still active
  assert.equal(state.isPreview, false)
  assert.equal(state.tokens['bs-primary'], '#111111')
  // …but the failure is now observable
  assert.deepEqual(state.previewError, { id: 'DXw1DDaJ', outcome: 'not_found' })
  // exactly one always-on warn naming the preview id
  assert.equal(warns.length, 1)
  assert.match(warns[0], /DXw1DDaJ/)
  assert.match(warns[0], /different project/)
  // diagnostics listener registered EVEN on the failure path
  assert.equal(listeners.filter((l) => l.type === 'message').length, 1)
  inst.destroy()
})

test('diagnostics handshake answers on the failure path with the not_found outcome', async () => {
  const { listeners } = installEnv('?preview=DXw1DDaJ')
  global.fetch = async () => ({ ok: false, status: 404, json: async () => ({}) })
  const origWarn = console.warn
  console.warn = () => {}

  let inst
  try {
    inst = sorbInit({
      namespace: 'jj-demo',
      tokens: { 'bs-primary': '#111111' },
      preview: { enabled: true, key: DEMO_KEY },
    })
    await tick()
  } finally {
    console.warn = origWarn
  }

  const handler = listeners.find((l) => l.type === 'message').handler
  const posted = []
  handler({
    data: { type: 'sorb-ping' },
    origin: 'https://app.sorbcloud.com',
    source: { postMessage: (payload, targetOrigin) => posted.push({ payload, targetOrigin }) },
  })

  assert.equal(posted.length, 1)
  assert.equal(posted[0].targetOrigin, 'https://app.sorbcloud.com') // exact, not '*'
  const { payload } = posted[0]
  assert.equal(payload.type, 'sorb-hello')
  assert.equal(payload.namespace, 'jj-demo')
  assert.equal(payload.keyLast4, 'ZJFQ') // last4 only, never the full key
  assert.equal(payload.leafVersion, '0.5.0')
  assert.equal(payload.bridgeOrigin, 'http://localhost:7777')
  assert.deepEqual(payload.preview, { requestedId: 'DXw1DDaJ', outcome: 'not_found' })

  // a ping from a non-allowlisted origin gets NOTHING
  const posted2 = []
  handler({
    data: { type: 'sorb-ping' },
    origin: 'https://evil.example',
    source: { postMessage: (p, t) => posted2.push({ p, t }) },
  })
  assert.equal(posted2.length, 0)

  inst.destroy()
})

test('normal path (no ?preview=): no previewError, no warn, listener still registered, outcome none', async () => {
  const { listeners } = installEnv('')
  global.fetch = async () => {
    throw new Error('fetch should not be called on the no-preview path')
  }
  const warns = []
  const origWarn = console.warn
  console.warn = (msg) => warns.push(msg)

  let inst
  try {
    inst = sorbInit({
      namespace: 'jj-demo',
      tokens: { 'bs-primary': '#111111' },
      preview: { enabled: true, key: DEMO_KEY },
    })
    await tick()
  } finally {
    console.warn = origWarn
  }

  const state = inst.getState()
  assert.equal(state.isPreview, false)
  assert.equal(state.previewError, null)
  assert.equal(warns.length, 0)

  const handler = listeners.find((l) => l.type === 'message').handler
  const posted = []
  handler({
    data: { type: 'sorb-ping' },
    origin: 'https://app.sorbcloud.com',
    source: { postMessage: (payload, targetOrigin) => posted.push({ payload, targetOrigin }) },
  })
  assert.equal(posted.length, 1)
  assert.deepEqual(posted[0].payload.preview, { requestedId: null, outcome: 'none' })
  inst.destroy()
})
