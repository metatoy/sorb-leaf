import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_DIAGNOSTICS_ORIGINS,
  resolveDiagnosticsOrigins,
  isAllowedDiagnosticsOrigin,
  keyLast4,
  createDiagnosticsResponder,
} from './diagnostics.js'

// ─── keyLast4 (invariant 3 — never the full pk) ─────────────────────────────

test('keyLast4: returns only the last 4 chars', () => {
  assert.equal(keyLast4('sorb_pk_7dYkZJFQ'), 'ZJFQ')
})

test('keyLast4: null/empty/non-string → null', () => {
  assert.equal(keyLast4(null), null)
  assert.equal(keyLast4(undefined), null)
  assert.equal(keyLast4(''), null)
  assert.equal(keyLast4('   '), null)
  assert.equal(keyLast4(1234), null)
})

// ─── allowlist resolution ───────────────────────────────────────────────────

test('resolveDiagnosticsOrigins: baked defaults are Sorb Cloud prod + staging', () => {
  assert.deepEqual(DEFAULT_DIAGNOSTICS_ORIGINS, [
    'https://app.sorbcloud.com',
    'https://staging.app.sorbcloud.com',
  ])
  assert.deepEqual(resolveDiagnosticsOrigins(undefined), DEFAULT_DIAGNOSTICS_ORIGINS)
  assert.deepEqual(resolveDiagnosticsOrigins({}), DEFAULT_DIAGNOSTICS_ORIGINS)
})

test('resolveDiagnosticsOrigins: config.diagnostics.allowedOrigins extends the defaults', () => {
  const out = resolveDiagnosticsOrigins({ diagnostics: { allowedOrigins: ['https://dash.self.example'] } })
  assert.deepEqual(out, [
    'https://app.sorbcloud.com',
    'https://staging.app.sorbcloud.com',
    'https://dash.self.example',
  ])
})

test('isAllowedDiagnosticsOrigin: exact match, trailing-slash tolerant', () => {
  const allowed = resolveDiagnosticsOrigins()
  assert.equal(isAllowedDiagnosticsOrigin('https://app.sorbcloud.com', allowed), true)
  assert.equal(isAllowedDiagnosticsOrigin('https://app.sorbcloud.com/', allowed), true)
  assert.equal(isAllowedDiagnosticsOrigin('https://staging.app.sorbcloud.com', allowed), true)
})

test('isAllowedDiagnosticsOrigin: a random third-party origin is NOT allowed', () => {
  const allowed = resolveDiagnosticsOrigins()
  assert.equal(isAllowedDiagnosticsOrigin('https://evil.example', allowed), false)
  assert.equal(isAllowedDiagnosticsOrigin('http://app.sorbcloud.com', allowed), false) // scheme differs
  assert.equal(isAllowedDiagnosticsOrigin('null', allowed), false) // sandboxed opaque origin
  assert.equal(isAllowedDiagnosticsOrigin('', allowed), false)
  assert.equal(isAllowedDiagnosticsOrigin(undefined, allowed), false)
})

// ─── createDiagnosticsResponder (ping-only handshake) ───────────────────────

const SNAPSHOT = {
  namespace: 'jj-demo',
  keyLast4: 'ZJFQ',
  leafVersion: '0.5.0',
  bridgeOrigin: 'https://bridge.sorbcloud.com',
  preview: { requestedId: 'DXw1DDaJ', outcome: 'not_found' },
}

const makeResponder = (allowed = resolveDiagnosticsOrigins()) =>
  createDiagnosticsResponder({ getSnapshot: () => SNAPSHOT, getAllowedOrigins: () => allowed })

test('responder ANSWERS an allowlisted sorb-ping with the EXACT origin (never "*")', () => {
  const posted = []
  const respond = makeResponder()
  respond({
    data: { type: 'sorb-ping' },
    origin: 'https://app.sorbcloud.com',
    source: { postMessage: (payload, targetOrigin) => posted.push({ payload, targetOrigin }) },
  })
  assert.equal(posted.length, 1)
  assert.equal(posted[0].targetOrigin, 'https://app.sorbcloud.com')
  assert.notEqual(posted[0].targetOrigin, '*')
  assert.deepEqual(posted[0].payload, { type: 'sorb-hello', ...SNAPSHOT })
  // invariant 3: last4 only, no full key field anywhere in the payload
  assert.equal(posted[0].payload.keyLast4, 'ZJFQ')
  assert.equal('key' in posted[0].payload, false)
})

test('responder IGNORES a sorb-ping from a NON-allowlisted origin (no reply)', () => {
  const posted = []
  const respond = makeResponder()
  respond({
    data: { type: 'sorb-ping' },
    origin: 'https://evil.example',
    source: { postMessage: (p, t) => posted.push({ p, t }) },
  })
  assert.equal(posted.length, 0)
})

test('responder IGNORES a non-ping message from an allowlisted origin', () => {
  const posted = []
  const respond = makeResponder()
  for (const data of [{ type: 'sorb-hello' }, { type: 'other' }, null, 'string', undefined]) {
    respond({
      data,
      origin: 'https://app.sorbcloud.com',
      source: { postMessage: (p, t) => posted.push({ p, t }) },
    })
  }
  assert.equal(posted.length, 0)
})

test('responder never posts unsolicited — only ever replies inside a ping handler', () => {
  // The responder is a pure event handler: constructing it and never invoking
  // it produces zero posts. There is no code path that initiates a message.
  let posts = 0
  createDiagnosticsResponder({
    getSnapshot: () => {
      posts++ // would only run if the snapshot were read, i.e. on a reply
      return SNAPSHOT
    },
    getAllowedOrigins: () => resolveDiagnosticsOrigins(),
  })
  assert.equal(posts, 0)
})

test('responder tolerates a missing/invalid source without throwing', () => {
  const respond = makeResponder()
  assert.doesNotThrow(() => respond({ data: { type: 'sorb-ping' }, origin: 'https://app.sorbcloud.com' }))
  assert.doesNotThrow(() => respond({ data: { type: 'sorb-ping' }, origin: 'https://app.sorbcloud.com', source: {} }))
  assert.doesNotThrow(() => respond(null))
  assert.doesNotThrow(() => respond(undefined))
})
