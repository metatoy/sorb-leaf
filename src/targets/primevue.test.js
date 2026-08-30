import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getTarget } from '@sorb/core'

// Importing the module runs its registerTarget(...) side effect (same path
// `src/index.js` takes at load time).
import { primevueTarget } from './primevue.js'

test('primevue is registered as a TargetAdapter', () => {
  assert.equal(getTarget('primevue'), primevueTarget)
})

test('primevue adapter shape matches the confirmed contract values', () => {
  assert.deepEqual(primevueTarget.expectPrefixes, [
    'color-', 'button-', 'card-', 'badge-', 'input-', 'nav-', 'toast-', 'radius-',
  ])
  assert.equal(primevueTarget.emitFormat, 'sorb/primevue-preset')
  assert.equal(primevueTarget.inject, undefined)
})

test('primevue expectPrefixes is kit vocab, not the framework var prefix', () => {
  // Field-correction: a framework-prefix guard (`p-`) false-positives on
  // every working preview — the guard must check the payload/kit vocab, not
  // PrimeVue's own `--p-*` CSS custom property namespace.
  assert.ok(!primevueTarget.expectPrefixes.includes('p-'))
})

test('primevue adapter carries the .p-dark darkMode convention', () => {
  assert.deepEqual(primevueTarget.darkMode, {
    strategy: 'class',
    darkSelector: '.p-dark',
  })
})
