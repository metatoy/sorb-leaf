import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isModeAwarePreviewBody, resolvePreviewBody } from './previewMode.js'

const darkMode = {
  strategy: 'attribute',
  attribute: 'data-bs-theme',
  darkSelector: '[data-bs-theme="dark"]',
  lightSelector: '[data-bs-theme="light"]',
}

test('isModeAwarePreviewBody: legacy flat map ⇒ false', () => {
  assert.equal(isModeAwarePreviewBody({ '--primary': '#000' }), false)
})

test('isModeAwarePreviewBody: mode-aware wrapper ⇒ true', () => {
  assert.equal(isModeAwarePreviewBody({ tokens: { primary: '#000' } }), true)
})

test('isModeAwarePreviewBody: null/undefined/non-object ⇒ false (never throws)', () => {
  assert.equal(isModeAwarePreviewBody(null), false)
  assert.equal(isModeAwarePreviewBody(undefined), false)
  assert.equal(isModeAwarePreviewBody('nope'), false)
  assert.equal(isModeAwarePreviewBody(42), false)
})

test('isModeAwarePreviewBody: array ⇒ false ("tokens" in [] would false-positive on typeof alone)', () => {
  assert.equal(isModeAwarePreviewBody([]), false)
})

test('resolvePreviewBody: legacy flat body ⇒ kind flat, same object', () => {
  const body = { '--primary': '#000', '--spacing': '4px' }
  const resolved = resolvePreviewBody(body, darkMode)
  assert.deepEqual(resolved, { kind: 'flat', tokens: body })
})

test('resolvePreviewBody: mode-aware body with darkTokens ⇒ kind mode-aware, resolves darkMode from body', () => {
  const body = {
    tokens: { primary: '#fff' },
    darkTokens: { primary: '#000' },
    darkMode: { strategy: 'class', darkSelector: '.dark' },
  }
  const resolved = resolvePreviewBody(body, darkMode)
  assert.equal(resolved.kind, 'mode-aware')
  assert.deepEqual(resolved.lightTokens, { primary: '#fff' })
  assert.deepEqual(resolved.darkTokens, { primary: '#000' })
  assert.deepEqual(resolved.darkMode, { strategy: 'class', darkSelector: '.dark' })
})

test('resolvePreviewBody: mode-aware body with darkTokens but no body.darkMode ⇒ falls back to fallbackDarkMode', () => {
  const body = { tokens: { primary: '#fff' }, darkTokens: { primary: '#000' } }
  const resolved = resolvePreviewBody(body, darkMode)
  assert.equal(resolved.kind, 'mode-aware')
  assert.deepEqual(resolved.darkMode, darkMode)
})

test('resolvePreviewBody: mode-aware body with NO darkTokens ⇒ kind flat using body.tokens', () => {
  const body = { tokens: { primary: '#fff' } }
  const resolved = resolvePreviewBody(body, darkMode)
  assert.deepEqual(resolved, { kind: 'flat', tokens: { primary: '#fff' } })
})

test('resolvePreviewBody: mode-aware body with EMPTY darkTokens ⇒ kind flat using body.tokens', () => {
  const body = { tokens: { primary: '#fff' }, darkTokens: {} }
  const resolved = resolvePreviewBody(body, darkMode)
  assert.deepEqual(resolved, { kind: 'flat', tokens: { primary: '#fff' } })
})
