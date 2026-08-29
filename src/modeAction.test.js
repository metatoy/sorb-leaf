import { test } from 'node:test'
import assert from 'node:assert/strict'
import { darkClassName, resolveModeAction } from './modeAction.js'

const attributeConvention = {
  strategy: 'attribute',
  attribute: 'data-bs-theme',
  darkSelector: '[data-bs-theme="dark"]',
  lightSelector: '[data-bs-theme="light"]',
}

const classConvention = { strategy: 'class', darkSelector: '.dark' }
const mediaConvention = { strategy: 'media', darkSelector: '@media (prefers-color-scheme: dark)' }

test('darkClassName: derives the bare class name from a "." selector', () => {
  assert.equal(darkClassName({ darkSelector: '.dark' }), 'dark')
  assert.equal(darkClassName({ darkSelector: '.theme-dark' }), 'theme-dark')
})

test('darkClassName: falls back to "dark" for a non-bare-class selector', () => {
  assert.equal(darkClassName({ darkSelector: '[data-theme="dark"]' }), 'dark')
  assert.equal(darkClassName({}), 'dark')
  assert.equal(darkClassName(undefined), 'dark')
})

// ─── attribute strategy (v1 / react-bootstrap default) ─────────────────────

test('attribute strategy: "light"/"dark" ⇒ attr-set', () => {
  assert.deepEqual(resolveModeAction(attributeConvention, 'dark'), {
    type: 'attr-set',
    attribute: 'data-bs-theme',
    value: 'dark',
  })
  assert.deepEqual(resolveModeAction(attributeConvention, 'light'), {
    type: 'attr-set',
    attribute: 'data-bs-theme',
    value: 'light',
  })
})

test('attribute strategy: "auto" ⇒ attr-remove', () => {
  assert.deepEqual(resolveModeAction(attributeConvention, 'auto'), {
    type: 'attr-remove',
    attribute: 'data-bs-theme',
  })
})

test('undefined convention ⇒ defaults to attribute strategy, data-bs-theme', () => {
  assert.deepEqual(resolveModeAction(undefined, 'dark'), {
    type: 'attr-set',
    attribute: 'data-bs-theme',
    value: 'dark',
  })
})

// ─── class strategy (P2a — Tailwind) ────────────────────────────────────────

test('class strategy: "dark" ⇒ class-add', () => {
  assert.deepEqual(resolveModeAction(classConvention, 'dark'), { type: 'class-add', className: 'dark' })
})

test('class strategy: "light" ⇒ class-remove', () => {
  assert.deepEqual(resolveModeAction(classConvention, 'light'), { type: 'class-remove', className: 'dark' })
})

test('class strategy: "auto" ⇒ class-remove (media governs once the class is absent)', () => {
  assert.deepEqual(resolveModeAction(classConvention, 'auto'), { type: 'class-remove', className: 'dark' })
})

// ─── media strategy (pure OS, no override) ─────────────────────────────────

test('media strategy: any mode ⇒ none (no DOM mutation possible)', () => {
  assert.deepEqual(resolveModeAction(mediaConvention, 'dark'), { type: 'none' })
  assert.deepEqual(resolveModeAction(mediaConvention, 'light'), { type: 'none' })
  assert.deepEqual(resolveModeAction(mediaConvention, 'auto'), { type: 'none' })
})
