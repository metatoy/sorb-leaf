import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getTarget } from '@sorb/core'

// Importing the module runs its registerTarget(...) side effect (same path
// `src/index.js` takes at load time).
import { tailwindV4Target } from './tailwindV4.js'

test('tailwind-v4 is registered as a TargetAdapter', () => {
  assert.equal(getTarget('tailwind-v4'), tailwindV4Target)
})

test('tailwind-v4 adapter shape matches the confirmed contract values', () => {
  assert.equal(tailwindV4Target.id, 'tailwind-v4')
  assert.equal(tailwindV4Target.emitFormat, 'sorb/tailwind-theme')
  assert.deepEqual(tailwindV4Target.expectPrefixes, ['color-', 'radius-', 'space-', 'font-'])
  assert.equal(tailwindV4Target.inject, undefined)
})

test('tailwind-v4 adapter carries the Tailwind .dark class darkMode convention', () => {
  assert.deepEqual(tailwindV4Target.darkMode, {
    strategy: 'class',
    darkSelector: '.dark',
  })
})
