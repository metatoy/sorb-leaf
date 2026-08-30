import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getTarget } from '@sorb/core'

// Importing the module runs its registerTarget(...) side effect. NOTE: unlike
// the shipped adapters, wordpress.js is NOT re-exported from src/index.js (it's
// STAGED/experimental, T9) — so it only registers when imported directly, e.g.
// here or by a consumer who opts in explicitly.
import { wordpressTarget } from './wordpress.js'

test('wordpress is registered as a TargetAdapter (on direct import)', () => {
  assert.equal(getTarget('wordpress'), wordpressTarget)
})

test('wordpress adapter shape matches the contract', () => {
  assert.equal(wordpressTarget.id, 'wordpress')
  assert.equal(wordpressTarget.emitFormat, 'sorb/wp-theme-json')
  assert.equal(wordpressTarget.inject, undefined)
  assert.equal(wordpressTarget.darkMode, undefined) // single-mode: WP has no manual dark std
})

test('wordpress expectPrefixes is kit vocab, not WP framework prefixes', () => {
  // Field-correction: the guard checks the preview payload's kit token ids,
  // never WordPress's derived --wp--preset--/--wp--custom-- names.
  assert.ok(Array.isArray(wordpressTarget.expectPrefixes))
  assert.ok(wordpressTarget.expectPrefixes.includes('color-'))
  assert.ok(!wordpressTarget.expectPrefixes.some((p) => p.startsWith('wp--') || p.startsWith('wp-')))
})
