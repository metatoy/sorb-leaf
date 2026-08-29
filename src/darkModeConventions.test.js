import { test } from 'node:test'
import assert from 'node:assert/strict'
import { tailwindDarkMode, dataThemeDarkMode } from './darkModeConventions.js'
import { buildModeStylesheet } from './modeStylesheet.js'
import { resolveModeAction } from './modeAction.js'

test('tailwindDarkMode: class strategy, ".dark", no lightSelector', () => {
  assert.equal(tailwindDarkMode.strategy, 'class')
  assert.equal(tailwindDarkMode.darkSelector, '.dark')
  assert.equal(tailwindDarkMode.lightSelector, undefined)
})

test('dataThemeDarkMode: attribute strategy, data-theme, both selectors', () => {
  assert.equal(dataThemeDarkMode.strategy, 'attribute')
  assert.equal(dataThemeDarkMode.attribute, 'data-theme')
  assert.equal(dataThemeDarkMode.darkSelector, '[data-theme="dark"]')
  assert.equal(dataThemeDarkMode.lightSelector, '[data-theme="light"]')
})

test('tailwindDarkMode drives buildModeStylesheet to a .dark { ... } rule', () => {
  const css = buildModeStylesheet({ primary: '#fff' }, { primary: '#000' }, tailwindDarkMode)
  assert.match(css, /\.dark \{\s*--primary: #000;/)
})

test('tailwindDarkMode drives resolveModeAction to class-add/class-remove', () => {
  assert.deepEqual(resolveModeAction(tailwindDarkMode, 'dark'), { type: 'class-add', className: 'dark' })
  assert.deepEqual(resolveModeAction(tailwindDarkMode, 'light'), { type: 'class-remove', className: 'dark' })
})

test('dataThemeDarkMode drives resolveModeAction to attr-set/attr-remove on data-theme', () => {
  assert.deepEqual(resolveModeAction(dataThemeDarkMode, 'dark'), {
    type: 'attr-set',
    attribute: 'data-theme',
    value: 'dark',
  })
  assert.deepEqual(resolveModeAction(dataThemeDarkMode, 'auto'), {
    type: 'attr-remove',
    attribute: 'data-theme',
  })
})
