import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getTarget } from '@sorb/core'

// Importing the module runs its registerTarget(...) side effect (same path
// `src/index.js` takes at load time).
import { muiTarget } from './mui.js'

test('mui is registered as a TargetAdapter', () => {
  assert.equal(getTarget('mui'), muiTarget)
})

test('mui adapter shape matches the confirmed contract values', () => {
  assert.deepEqual(muiTarget.expectPrefixes, ['color-', 'radius-'])
  assert.equal(muiTarget.emitFormat, 'sorb/mui-vars')
  assert.equal(muiTarget.inject, undefined)
})

test('mui expectPrefixes is kit vocab, not the framework var prefix', () => {
  // Field-correction: a framework-prefix guard (`mui-`) false-positives on
  // every working preview — the guard must check the payload/kit vocab.
  assert.ok(!muiTarget.expectPrefixes.includes('mui-'))
})

test('mui adapter carries the data-mui-color-scheme darkMode convention', () => {
  assert.deepEqual(muiTarget.darkMode, {
    strategy: 'attribute',
    attribute: 'data-mui-color-scheme',
    darkSelector: '[data-mui-color-scheme="dark"]',
    lightSelector: '[data-mui-color-scheme="light"]',
  })
})
