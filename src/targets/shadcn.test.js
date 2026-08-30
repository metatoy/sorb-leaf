import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getTarget } from '@sorb/core'

// Importing the module runs its registerTarget(...) side effect (same path
// `src/index.js` takes at load time).
import { shadcnTarget } from './shadcn.js'

test('shadcn is registered as a TargetAdapter', () => {
  assert.equal(getTarget('shadcn'), shadcnTarget)
})

test('shadcn adapter shape matches the confirmed contract values', () => {
  assert.equal(shadcnTarget.id, 'shadcn')
  assert.equal(shadcnTarget.emitFormat, 'sorb/shadcn-theme')
  assert.deepEqual(shadcnTarget.expectPrefixes, ['color-', 'radius-', 'space-', 'font-'])
  assert.equal(shadcnTarget.inject, undefined)
})

test('shadcn adapter carries the Tailwind .dark class darkMode convention', () => {
  assert.deepEqual(shadcnTarget.darkMode, {
    strategy: 'class',
    darkSelector: '.dark',
  })
})
