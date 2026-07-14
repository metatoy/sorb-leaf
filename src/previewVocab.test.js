import { test, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { checkPreviewVocabulary, countMatchingPrefixes } from './previewVocab.js'

// Capture console.warn without pulling in a mocking lib.
const warnings = []
let realWarn
beforeEach(() => {
  warnings.length = 0
  realWarn = console.warn
  console.warn = (...args) => warnings.push(args.join(' '))
})
afterEach(() => {
  console.warn = realWarn
})

// (i) prefixes set + matching keys ⇒ no warn, flag false
test('matching keys → no warn, flag false', () => {
  const mismatch = checkPreviewVocabulary({
    tokens: { 'bs-primary': '#f26722', 'bs-link-color': '#f26722' },
    expectPrefixes: ['bs-'],
    previewId: 'uUMw0sOr',
  })
  assert.equal(mismatch, false)
  assert.equal(warnings.length, 0)
})

// (ii) prefixes set + non-matching keys (a color-* preview) ⇒ warn fired + flag true
test('non-matching keys → warn fired, flag true', () => {
  const mismatch = checkPreviewVocabulary({
    tokens: {
      'color-blue-500': '#0f65ef',
      'color-action-primary': '#0f65ef',
      'button-primary-bg-default': '#0f65ef',
      'radius-control': '4px',
    },
    expectPrefixes: ['bs-'],
    previewId: 'dOROuCB0',
  })
  assert.equal(mismatch, true)
  assert.equal(warnings.length, 1)
  // message names the preview id, the applied count, and the expected prefixes
  assert.match(warnings[0], /dOROuCB0/)
  assert.match(warnings[0], /applied 4 tokens/)
  assert.match(warnings[0], /\["bs-"\]/)
  assert.match(warnings[0], /token-vocabulary mismatch/)
})

// (iii) prefixes unset ⇒ no check, no warn (guard disabled = zero behaviour change)
test('prefixes unset → no check, no warn, flag false', () => {
  const mismatch = checkPreviewVocabulary({
    tokens: { 'color-blue-500': '#0f65ef' },
    expectPrefixes: undefined,
    previewId: 'dOROuCB0',
  })
  assert.equal(mismatch, false)
  assert.equal(warnings.length, 0)
})

// edge: empty prefixes array is also treated as disabled
test('empty prefixes array → guard disabled', () => {
  const mismatch = checkPreviewVocabulary({
    tokens: { 'color-blue-500': '#0f65ef' },
    expectPrefixes: [],
  })
  assert.equal(mismatch, false)
  assert.equal(warnings.length, 0)
})

// edge: an empty/failed preview (0 tokens) is NOT a vocab mismatch
test('empty preview payload → not a mismatch, no warn', () => {
  const mismatch = checkPreviewVocabulary({
    tokens: {},
    expectPrefixes: ['bs-'],
    previewId: 'empty',
  })
  assert.equal(mismatch, false)
  assert.equal(warnings.length, 0)
})

test('countMatchingPrefixes counts keys under any prefix', () => {
  assert.equal(
    countMatchingPrefixes({ 'bs-a': 1, 'bs-b': 2, 'color-c': 3 }, ['bs-']),
    2,
  )
  assert.equal(countMatchingPrefixes({ 'a': 1 }, ['x-', 'a']), 1)
  assert.equal(countMatchingPrefixes({}, ['bs-']), 0)
})
