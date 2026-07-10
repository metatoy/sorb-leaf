import { test } from 'node:test'
import assert from 'node:assert/strict'
import { bridgeHeaders } from './bridgeAuth.js'

test('no key → no Authorization header (localhost path unchanged)', () => {
  assert.deepEqual(bridgeHeaders(), {})
  assert.deepEqual(bridgeHeaders(undefined), {})
  assert.deepEqual(bridgeHeaders(''), {})
  assert.deepEqual(bridgeHeaders('   '), {})
})

test('key present → Bearer Authorization header', () => {
  assert.deepEqual(bridgeHeaders('sorb_pk_abc'), { Authorization: 'Bearer sorb_pk_abc' })
})

test('key is trimmed', () => {
  assert.deepEqual(bridgeHeaders('  sorb_pk_abc  '), { Authorization: 'Bearer sorb_pk_abc' })
})

test('base headers are preserved and not mutated', () => {
  const base = { 'Content-Type': 'application/json' }
  assert.deepEqual(bridgeHeaders('sorb_pk_abc', base), {
    'Content-Type': 'application/json',
    Authorization: 'Bearer sorb_pk_abc',
  })
  // no-key still returns a copy of base without mutating it
  assert.deepEqual(bridgeHeaders('', base), { 'Content-Type': 'application/json' })
  assert.deepEqual(base, { 'Content-Type': 'application/json' })
})
