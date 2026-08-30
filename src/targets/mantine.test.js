import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getTarget } from '@sorb/core'

// Importing the module runs its registerTarget(...) side effect (same path
// `src/index.js` takes at load time).
import { mantineTarget } from './mantine.js'

test('mantine is registered as a TargetAdapter', () => {
  assert.equal(getTarget('mantine'), mantineTarget)
})

test('mantine adapter shape matches the confirmed contract values', () => {
  assert.deepEqual(mantineTarget.expectPrefixes, ['color-', 'button-', 'radius-'])
  assert.equal(mantineTarget.emitFormat, 'sorb/mantine-vars')
  assert.equal(mantineTarget.inject, undefined)
})

test('mantine expectPrefixes is kit vocab, not the framework var prefix', () => {
  // Field-correction: a framework-prefix guard (`mantine-`) false-positives
  // on every working preview — the guard must check the payload/kit vocab.
  assert.ok(!mantineTarget.expectPrefixes.includes('mantine-'))
})

test('mantine adapter carries the data-mantine-color-scheme darkMode convention', () => {
  assert.deepEqual(mantineTarget.darkMode, {
    strategy: 'attribute',
    attribute: 'data-mantine-color-scheme',
    darkSelector: '[data-mantine-color-scheme="dark"]',
    lightSelector: '[data-mantine-color-scheme="light"]',
  })
})
