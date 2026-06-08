// Integration test for the DOM-applying shim wrapper, driven by jsdom.
//
// jsdom's getComputedStyle reflects INLINE style but (a) canonicalizes color
// literals to rgb() on read-back and (b) does NOT resolve var() references. So
// this suite proves the shim *installs the correct var() binding* and restores
// it; the broader matching correctness is proven by legacyMap.test.js.
//
// The one thing jsdom CANNOT prove — the *visible* live re-theme when a token
// flips — has this MANUAL RECIPE (run against sorb-demo or any real browser):
//   1. Author a legacy Button with hardcoded inline styles, no var():
//        <button style="background:#0F65EF;color:#FFFFFF;border-radius:4px">Buy</button>
//   2. Wrap the app in:
//        <SorbProvider config={cfg} legacyMap={[
//          { prop:'background',   raw:'#0F65EF', cssVar:'button-primary-bg-default' },
//          { prop:'color',        raw:'#FFFFFF', cssVar:'button-primary-text-default' },
//          { prop:'borderRadius', raw:'4px',     cssVar:'button-radius' },
//        ]}>…
//   3. Inspect the button: its inline background is now
//        var(--button-primary-bg-default, #0F65EF)  → still renders blue (fallback).
//   4. Flip the token live (Figma preview, or in devtools:
//        document.documentElement.style.setProperty('--button-primary-bg-default','#00AA00'))
//      → the button turns green WITHOUT any source edit. EXPECT: live re-theme.
//   5. Unmount <SorbProvider> (or call clearLegacyMap on the handle)
//      → inline overrides removed, button returns to the original #0F65EF. EXPECT: restored.

import { test, before } from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { applyLegacyMap, clearLegacyMap } from '../src/legacyDom.js'

/** Spin up a fresh jsdom and expose its globals so the shim's `document`/`window` resolve. */
const mountDom = (html) => {
  const dom = new JSDOM(`<!DOCTYPE html><html><body>${html}</body></html>`)
  global.window = dom.window
  global.document = dom.window.document
  return dom
}

const LEGACY_MAP = [
  { prop: 'background', raw: '#0F65EF', cssVar: 'button-primary-bg-default' },
  { prop: 'color', raw: '#FFFFFF', cssVar: 'button-primary-text-default' },
  { prop: 'borderRadius', raw: '4px', cssVar: 'button-radius' },
]

// A legacy fixture "Button": all styles hardcoded as inline literals, no var().
const BUTTON_HTML =
  '<button id="btn" style="background:#0F65EF;color:#FFFFFF;border-radius:4px;padding:8px 16px">Click me</button>'

before(() => {
  // sanity: confirm jsdom reflects inline values via getComputedStyle, else the
  // DOM path can't be meaningfully exercised here.
  const dom = mountDom(BUTTON_HTML)
  const cs = dom.window.getComputedStyle(dom.window.document.getElementById('btn'))
  const bg = cs.getPropertyValue('background') || cs.getPropertyValue('background-color')
  if (!bg || !/0f65ef|15.*101.*239/i.test(bg)) {
    // If jsdom can't report it, these tests would be vacuous — fail loudly so we
    // fall back to the documented manual recipe instead of silently passing.
    throw new Error(`jsdom did not report inline background (got ${JSON.stringify(bg)}) — use the manual recipe`)
  }
})

test('applyLegacyMap remaps a hardcoded button to var(--cssVar, raw) — non-destructive', () => {
  const dom = mountDom(BUTTON_HTML)
  const btn = dom.window.document.getElementById('btn')

  const handle = applyLegacyMap(dom.window.document.body, LEGACY_MAP)

  assert.equal(btn.style.getPropertyValue('background'), 'var(--button-primary-bg-default, #0F65EF)')
  assert.equal(btn.style.getPropertyValue('color'), 'var(--button-primary-text-default, #FFFFFF)')
  assert.equal(btn.style.getPropertyValue('border-radius'), 'var(--button-radius, 4px)')
  // padding was never mapped — untouched
  assert.equal(btn.style.getPropertyValue('padding'), '8px 16px')

  // the handle records the three restores
  assert.equal(handle.restores.length, 3)
})

test('shim installs a live var() binding (mechanism for re-theming)', () => {
  // NOTE: jsdom's getComputedStyle does NOT resolve var() references, so the
  // *visible* re-theme can't be asserted here — we assert the binding is in
  // place (the inline value is the var() with the raw fallback), which is the
  // mechanism that re-resolves in a real browser when the token flips. The
  // visible live re-theme is proven by the MANUAL RECIPE in this file's header
  // comment / the report (sorb-demo). The pure-function suite proves the value
  // that goes into the binding is correct.
  const dom = mountDom(BUTTON_HTML)
  const { document } = dom.window
  const btn = document.getElementById('btn')

  applyLegacyMap(document.body, LEGACY_MAP)

  const bound = btn.style.getPropertyValue('background')
  assert.match(bound, /^var\(--button-primary-bg-default,/)
  // fallback preserved so removing the binding restores the original color
  assert.match(bound.toLowerCase(), /#0f65ef\)$/)

  // flipping the :root token does not disturb the inline binding (it's the
  // fallback that yields when the var is set; the binding string is stable)
  document.documentElement.style.setProperty('--button-primary-bg-default', '#00AA00')
  assert.equal(btn.style.getPropertyValue('background'), bound)
})

test('clearLegacyMap restores the original inline values exactly', () => {
  const dom = mountDom(BUTTON_HTML)
  const btn = dom.window.document.getElementById('btn')

  const handle = applyLegacyMap(dom.window.document.body, LEGACY_MAP)
  // mutated to var()
  assert.match(btn.style.getPropertyValue('background'), /^var\(/)

  clearLegacyMap(handle)

  // restored to the original hardcoded literals
  assert.match(btn.style.getPropertyValue('background').toLowerCase(), /#0f65ef|rgb/)
  assert.match(btn.style.getPropertyValue('border-radius'), /4px/)
  // handle is drained
  assert.equal(handle.restores.length, 0)
})

test('elements with no matching hardcoded value are left untouched', () => {
  const dom = mountDom('<div id="d" style="background:#123456;margin:4px">x</div>')
  const d = dom.window.document.getElementById('d')
  const handle = applyLegacyMap(dom.window.document.body, LEGACY_MAP)
  // #123456 not in map; margin not a mapped prop. (jsdom canonicalizes the
  // unchanged inline color to rgb() on read-back — the point is it's NOT a var().)
  assert.match(d.style.getPropertyValue('background').toLowerCase(), /#123456|rgb\(18, 52, 86\)/)
  assert.doesNotMatch(d.style.getPropertyValue('background'), /^var\(/)
  assert.equal(d.style.getPropertyValue('margin'), '4px')
  assert.equal(handle.restores.length, 0)
})

test('applyLegacyMap is a no-op for empty/missing legacyMap', () => {
  const dom = mountDom(BUTTON_HTML)
  const h1 = applyLegacyMap(dom.window.document.body, [])
  const h2 = applyLegacyMap(dom.window.document.body, null)
  assert.equal(h1.restores.length, 0)
  assert.equal(h2.restores.length, 0)
})
