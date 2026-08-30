import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getTarget } from '@sorb/core'

// Importing the module runs its registerTarget(...) side effect (same path
// `src/index.js` takes at load time).
import { angularMaterialTarget } from './angularMaterial.js'

test('angular-material is registered as a TargetAdapter', () => {
  assert.equal(getTarget('angular-material'), angularMaterialTarget)
})

test('angular-material adapter shape matches the confirmed contract values', () => {
  assert.deepEqual(angularMaterialTarget.expectPrefixes, ['color-', 'radius-'])
  assert.equal(angularMaterialTarget.emitFormat, 'sorb/mat-sys-vars')
  assert.equal(angularMaterialTarget.inject, undefined)
})

test('angular-material expectPrefixes is kit vocab, not the framework var prefix', () => {
  // Field-correction: a framework-prefix guard (`mat-sys-`) false-positives
  // on every working preview — the guard must check the payload/kit vocab,
  // not Angular Material's own `--mat-sys-*` system-variable namespace.
  assert.ok(!angularMaterialTarget.expectPrefixes.includes('mat-sys-'))
})

test('angular-material adapter carries the convention-declared, unconfirmed .dark darkMode convention', () => {
  assert.deepEqual(angularMaterialTarget.darkMode, {
    strategy: 'class',
    darkSelector: '.dark',
  })
})
