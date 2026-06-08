import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  computeLegacyOverride,
  indexLegacyMap,
  normalizeProp,
  normalizeValue,
} from '../src/legacyMap.js'

// ─── normalizeProp ───────────────────────────────────────────────────────────
test('normalizeProp: camelCase → kebab', () => {
  assert.equal(normalizeProp('borderRadius'), 'border-radius')
  assert.equal(normalizeProp('backgroundColor'), 'background-color')
})
test('normalizeProp: already kebab is unchanged', () => {
  assert.equal(normalizeProp('background-color'), 'background-color')
  assert.equal(normalizeProp('background'), 'background')
})
test('normalizeProp: trims, lowercases, snake → kebab', () => {
  assert.equal(normalizeProp('  Background  '), 'background')
  assert.equal(normalizeProp('border_radius'), 'border-radius')
})
test('normalizeProp: non-string → empty', () => {
  assert.equal(normalizeProp(null), '')
  assert.equal(normalizeProp(undefined), '')
  assert.equal(normalizeProp(4), '')
})

// ─── normalizeValue ──────────────────────────────────────────────────────────
// Colors canonicalize to rgb()/rgba() — this is what makes an authored hex `raw`
// match the *computed* value, which browsers/jsdom always report as rgb().
test('normalizeValue: hex → rgb(), case-insensitive', () => {
  assert.equal(normalizeValue('#0F65EF'), 'rgb(15, 101, 239)')
  assert.equal(normalizeValue('#0f65ef'), 'rgb(15, 101, 239)')
})
test('normalizeValue: 3-digit hex expands then → rgb()', () => {
  assert.equal(normalizeValue('#FFF'), 'rgb(255, 255, 255)')
  assert.equal(normalizeValue('#abc'), 'rgb(170, 187, 204)')
})
test('normalizeValue: 8-digit hex → rgba()', () => {
  assert.equal(normalizeValue('#0F65EFFF'), 'rgba(15, 101, 239, 1)')
  assert.equal(normalizeValue('#00000080'), 'rgba(0, 0, 0, 0.502)')
})
test('normalizeValue: hex matches its own rgb() computed form', () => {
  assert.equal(normalizeValue('#0F65EF'), normalizeValue('rgb(15, 101, 239)'))
})
test('normalizeValue: bare number → px (4 vs 4px)', () => {
  assert.equal(normalizeValue(4), '4px')
  assert.equal(normalizeValue('4'), '4px')
  assert.equal(normalizeValue('4px'), '4px')
  assert.equal(normalizeValue('0.5'), '0.5px')
})
test('normalizeValue: canonicalizes whitespace/commas in rgb()', () => {
  assert.equal(normalizeValue('rgb( 15 , 101 , 239 )'), 'rgb(15, 101, 239)')
  assert.equal(normalizeValue('rgb(15, 101, 239)'), 'rgb(15, 101, 239)')
})
test('normalizeValue: null/empty → empty string', () => {
  assert.equal(normalizeValue(null), '')
  assert.equal(normalizeValue(undefined), '')
  assert.equal(normalizeValue('   '), '')
})

// ─── indexLegacyMap ──────────────────────────────────────────────────────────
test('indexLegacyMap: groups by normalized prop, strips leading --', () => {
  const idx = indexLegacyMap([
    { prop: 'background', raw: '#0F65EF', cssVar: '--button-primary-bg-default' },
    { prop: 'borderRadius', raw: '4px', cssVar: 'button-radius' },
  ])
  assert.ok(idx.has('background'))
  assert.ok(idx.has('border-radius'))
  assert.equal(idx.get('background')[0].cssVar, 'button-primary-bg-default')
  assert.equal(idx.get('background')[0].normValue, 'rgb(15, 101, 239)')
})
test('indexLegacyMap: skips malformed rows, tolerates non-arrays', () => {
  const idx = indexLegacyMap([
    null,
    { prop: 'background' }, // missing raw + cssVar
    { raw: '#fff', cssVar: 'x' }, // missing prop
    { prop: 'color', raw: '#fff', cssVar: 'text' },
  ])
  assert.equal(idx.size, 1)
  assert.ok(idx.has('color'))
  assert.equal(indexLegacyMap(null).size, 0)
  assert.equal(indexLegacyMap(undefined).size, 0)
})

// ─── computeLegacyOverride (the proof) ───────────────────────────────────────
const MAP = [
  { prop: 'background', raw: '#0F65EF', cssVar: 'button-primary-bg-default' },
  { prop: 'borderRadius', raw: '4px', cssVar: 'button-radius' },
  { prop: 'color', raw: '#FFFFFF', cssVar: 'button-primary-text-default' },
]

test('exact hex match → var(--cssVar, raw)', () => {
  assert.equal(
    computeLegacyOverride('background', '#0F65EF', MAP),
    'var(--button-primary-bg-default, #0F65EF)',
  )
})
test('hex match is case-insensitive (computed lowercase)', () => {
  assert.equal(
    computeLegacyOverride('background', '#0f65ef', MAP),
    'var(--button-primary-bg-default, #0F65EF)',
  )
})
test('raw preserved verbatim as the fallback (not the normalized form)', () => {
  // fallback keeps original `#0F65EF`, not `#0f65ef`
  const out = computeLegacyOverride('background', '#0f65ef', MAP)
  assert.match(out, /#0F65EF\)$/)
})
test('dimension match: computed 4px against raw 4px', () => {
  assert.equal(
    computeLegacyOverride('borderRadius', '4px', MAP),
    'var(--button-radius, 4px)',
  )
})
test('dimension match: prop camelCase vs computed kebab both resolve', () => {
  assert.equal(
    computeLegacyOverride('border-radius', '4px', MAP),
    'var(--button-radius, 4px)',
  )
})
test('white text match', () => {
  assert.equal(
    computeLegacyOverride('color', '#ffffff', MAP),
    'var(--button-primary-text-default, #FFFFFF)',
  )
})
test('white text: 3-digit #fff computed matches 6-digit #FFFFFF raw', () => {
  assert.equal(
    computeLegacyOverride('color', '#fff', MAP),
    'var(--button-primary-text-default, #FFFFFF)',
  )
})
test('no-match value → null', () => {
  assert.equal(computeLegacyOverride('background', '#123456', MAP), null)
})
test('no-match prop → null', () => {
  assert.equal(computeLegacyOverride('margin', '#0F65EF', MAP), null)
})
test('empty computed value → null', () => {
  assert.equal(computeLegacyOverride('background', '', MAP), null)
  assert.equal(computeLegacyOverride('background', null, MAP), null)
})
test('accepts a pre-built index (Map) as legacyMap arg', () => {
  const idx = indexLegacyMap(MAP)
  assert.equal(
    computeLegacyOverride('background', '#0F65EF', idx),
    'var(--button-primary-bg-default, #0F65EF)',
  )
})
test('empty / non-array legacyMap → null (never throws)', () => {
  assert.equal(computeLegacyOverride('background', '#0F65EF', []), null)
  assert.equal(computeLegacyOverride('background', '#0F65EF', null), null)
})
test('first matching row wins when multiple rows share a prop', () => {
  const map = [
    { prop: 'background', raw: '#000000', cssVar: 'first' },
    { prop: 'background', raw: '#000000', cssVar: 'second' },
  ]
  assert.equal(
    computeLegacyOverride('background', '#000000', map),
    'var(--first, #000000)',
  )
})
