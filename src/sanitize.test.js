import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sanitizeCssValue } from './sanitize.js'

// ─── CSS-exfil / injection corpus — ALL must be rejected ────────────────────
const HOSTILE = [
  ['url exfil', 'url(https://evil.com/x.png)'],
  ['url with spaces', 'url( https://evil.com/x.png )'],
  ['image-set', "image-set('https://evil.com/a.png' 1x)"],
  ['-webkit-image-set', "-webkit-image-set(url(a.png) 1x)"],
  ['cross-fade', 'cross-fade(url(a.png), url(b.png))'],
  ['expression', 'expression(alert(1))'],
  ['paint', 'paint(evil)'],
  ['element', 'element(#evil)'],
  ['attr', 'attr(data-x)'],
  ['context break via ;}', 'red; } body{ background:url(//evil) }'],
  ['trailing semicolon', 'red;'],
  ['brace', 'red }'],
  ['@import', "@import 'evil.css'"],
  ['@import spaced', "@ import 'evil.css'"],
  ['javascript scheme', 'javascript:alert(1)'],
  ['javascript scheme cased', 'JavaScript:alert(1)'],
  ['url after var', 'var(--x); background:url(//evil)'],
  ['markup break', '</style><script>alert(1)</script>'],
  ['nul byte', 'red\x00'],
  ['newline smuggle', 'red\n@import url(//evil)'],
  ['non-string number', 1234],
  ['non-string object', {}],
  ['empty', ''],
]

for (const [name, value] of HOSTILE) {
  test(`rejects hostile: ${name}`, () => {
    const r = sanitizeCssValue(value)
    assert.equal(r.ok, false, `expected reject for ${name}`)
    assert.ok(r.reason, 'reject should carry a reason')
  })
}

// ─── Legit values — ALL must pass ───────────────────────────────────────────
const LEGIT = [
  '#0F65EF',
  '4px',
  '1.5rem',
  '0',
  '50%',
  'bold',
  'Inter, sans-serif',
  'rgba(0,0,0,.5)',
  'rgb(0 0 0 / 50%)',
  'calc(100% - 8px)',
  'var(--x, red)',
  'hsl(210 100% 50%)',
  'oklch(0.7 0.15 250)',
  'clamp(1rem, 2vw, 3rem)',
  'min(10px, 2vw)',
  'color(display-p3 1 0 0)',
  'lab(50% 40 59.5)',
  'env(safe-area-inset-top)',
]

for (const value of LEGIT) {
  test(`allows legit: ${JSON.stringify(value)}`, () => {
    const r = sanitizeCssValue(value)
    assert.equal(r.ok, true, `expected allow for ${value}: ${r.reason}`)
    assert.equal(r.value, value)
  })
}

test('disallowed-function reason names the offending function', () => {
  const r = sanitizeCssValue('url(//evil)')
  assert.match(r.reason, /^disallowed-function:url$/)
})

test('allowlist is case-insensitive (RGBA passes)', () => {
  assert.equal(sanitizeCssValue('RGBA(0,0,0,1)').ok, true)
})
