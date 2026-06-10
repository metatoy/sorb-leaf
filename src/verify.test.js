// node --test suite for verifyResolved (running-app token verification, W2).
// No DOM, no network: stubs document/getComputedStyle and injects fetch.

import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { verifyResolved } from './verify.js'

const ROOT_VALUES = {
  '--button-primary-bg-default': '#0f65ef',
  '--color-action-primary': '#0f65ef',
}

const realDoc = globalThis.document
const realGCS = globalThis.getComputedStyle
afterEach(() => {
  globalThis.document = realDoc
  globalThis.getComputedStyle = realGCS
})

const stubDom = (values) => {
  globalThis.document = { documentElement: {} }
  globalThis.getComputedStyle = () => ({ getPropertyValue: (k) => (k in values ? values[k] : '') })
}

test('SSR-safe: no document → { ok:false, reason:"no-dom" } (never throws)', async () => {
  globalThis.document = undefined
  const r = await verifyResolved(['button-primary-bg-default'], { fetch: () => { throw new Error('must not fetch') } })
  assert.deepEqual(r, { ok: false, reason: 'no-dom' })
})

test('empty token list → { ok:false, reason:"no-tokens" }', async () => {
  stubDom(ROOT_VALUES)
  assert.deepEqual(await verifyResolved([], { fetch: () => {} }), { ok: false, reason: 'no-tokens' })
})

test('reads :root values, posts {values} as --cssVars, returns the bridge verdict', async () => {
  stubDom(ROOT_VALUES)
  let posted = null
  const fetch = async (url, init) => {
    posted = { url, body: JSON.parse(init.body) }
    return { ok: true, json: async () => ({ ok: true, checked: 2, matched: 2, mismatches: [], unknown: [] }) }
  }
  // accepts bare names OR --cssVars; both normalize to --cssVar
  const r = await verifyResolved(['button-primary-bg-default', '--color-action-primary'], { fetch })
  assert.equal(posted.url, 'http://localhost:7777/verify/app')
  assert.deepEqual(posted.body, {
    values: { '--button-primary-bg-default': '#0f65ef', '--color-action-primary': '#0f65ef' },
  })
  assert.equal(r.ok, true)
  assert.equal(r.matched, 2)
})

test('origin override + trailing slash trimmed', async () => {
  stubDom(ROOT_VALUES)
  let url = null
  const fetch = async (u) => { url = u; return { ok: true, json: async () => ({ ok: true }) } }
  await verifyResolved(['color-action-primary'], { origin: 'http://127.0.0.1:9999/', fetch })
  assert.equal(url, 'http://127.0.0.1:9999/verify/app')
})

test('bridge unreachable (fetch throws) → { ok:false, reason:"bridge-unreachable" } (no throw)', async () => {
  stubDom(ROOT_VALUES)
  const fetch = async () => { throw new Error('ECONNREFUSED') }
  const r = await verifyResolved(['color-action-primary'], { fetch })
  assert.equal(r.ok, false)
  assert.equal(r.reason, 'bridge-unreachable')
  assert.match(r.error, /ECONNREFUSED/)
})

test('bridge non-2xx → { ok:false, reason:"bridge-error" } with status+detail', async () => {
  stubDom(ROOT_VALUES)
  const fetch = async () => ({ ok: false, status: 404, json: async () => ({ error: 'No resolved token map.' }) })
  const r = await verifyResolved(['color-action-primary'], { fetch })
  assert.equal(r.reason, 'bridge-error')
  assert.match(r.error, /404 — No resolved token map/)
})

test('un-applied :root (var(...) refs) → { ok:false, reason:"provider-not-applied" } (no fetch)', async () => {
  // variables.css with outputReferences but SorbProvider not mounted: the custom
  // prop reads back as a var() reference, not a value.
  stubDom({ '--button-primary-bg-default': 'var(--color-action-primary)' })
  const r = await verifyResolved(['button-primary-bg-default'], { fetch: () => { throw new Error('must not fetch') } })
  assert.equal(r.ok, false)
  assert.equal(r.reason, 'provider-not-applied')
  assert.deepEqual(r.unapplied, ['--button-primary-bg-default'])
})

test('forwards mismatches verbatim (a preview override reads as not-verified)', async () => {
  stubDom({ '--button-primary-bg-default': '#ff0000' }) // preview override active
  const fetch = async () => ({
    ok: true,
    json: async () => ({ ok: false, checked: 1, matched: 0, mismatches: [{ cssVar: '--button-primary-bg-default', expected: '#0f65ef', got: '#ff0000' }], unknown: [] }),
  })
  const r = await verifyResolved(['button-primary-bg-default'], { fetch })
  assert.equal(r.ok, false)
  assert.equal(r.mismatches[0].got, '#ff0000')
})
