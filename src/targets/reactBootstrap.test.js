import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getTarget, resolveConnectorIds } from '@sorb/core'

// Importing the module runs its registerTarget(...) side effect (same path
// `src/index.js` takes at load time).
import { reactBootstrapTarget } from './reactBootstrap.js'

test('react-bootstrap is registered as a TargetAdapter', () => {
  assert.equal(getTarget('react-bootstrap'), reactBootstrapTarget)
})

test('react-bootstrap is the default target', () => {
  assert.equal(resolveConnectorIds({}).target, 'react-bootstrap')
})

test('react-bootstrap adapter shape matches the confirmed contract values', () => {
  assert.ok(reactBootstrapTarget.expectPrefixes.includes('bs-'))
  assert.equal(reactBootstrapTarget.emitFormat, 'sorb/tokenset-esm')
})

test('react-bootstrap adapter carries the data-bs-theme darkMode convention', () => {
  assert.deepEqual(reactBootstrapTarget.darkMode, {
    strategy: 'attribute',
    attribute: 'data-bs-theme',
    darkSelector: '[data-bs-theme="dark"]',
    lightSelector: '[data-bs-theme="light"]',
  })
})
