import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildModeStylesheet } from './modeStylesheet.js'

const darkMode = {
  strategy: 'attribute',
  attribute: 'data-bs-theme',
  darkSelector: '[data-bs-theme="dark"]',
  lightSelector: '[data-bs-theme="light"]',
}

test('single-mode: no darkMode ⇒ flat :root only, no color-scheme/media/attrs', () => {
  const css = buildModeStylesheet({ primary: '#000', spacing: '4px' }, null, undefined)
  assert.match(css, /:root \{/)
  assert.match(css, /--primary: #000;/)
  assert.match(css, /--spacing: 4px;/)
  assert.doesNotMatch(css, /color-scheme/)
  assert.doesNotMatch(css, /@media/)
  assert.doesNotMatch(css, /data-bs-theme/)
  // exactly one rule block
  assert.equal((css.match(/\{/g) || []).length, 1)
})

test('single-mode: darkMode present but no darkVars ⇒ still flat :root only', () => {
  const css = buildModeStylesheet({ primary: '#000' }, {}, darkMode)
  assert.doesNotMatch(css, /@media/)
  assert.doesNotMatch(css, /data-bs-theme/)
})

test('single-mode: bare (non --prefixed) keys are normalized to --prefixed', () => {
  const css = buildModeStylesheet({ primary: '#000' }, null, undefined)
  assert.match(css, /--primary: #000;/)
})

test('dual-mode: emits :root, @media block, and both attribute overrides', () => {
  const css = buildModeStylesheet(
    { primary: '#fff', spacing: '4px' },
    { primary: '#000', spacing: '4px' },
    darkMode,
  )

  // base :root carries light + color-scheme: light
  assert.match(css, /:root \{\s*--primary: #fff;\s*--spacing: 4px;\s*color-scheme: light;\s*\}/)

  // OS-auto media block carries dark values, scoped to NOT the light override
  assert.match(
    css,
    /@media \(prefers-color-scheme: dark\) \{\s*:root:not\(\[data-bs-theme="light"\]\) \{\s*--primary: #000;\s*--spacing: 4px;\s*color-scheme: dark;\s*\}\s*\}/,
  )

  // manual dark override
  assert.match(
    css,
    /\[data-bs-theme="dark"\] \{\s*--primary: #000;\s*--spacing: 4px;\s*color-scheme: dark;\s*\}/,
  )

  // manual light override (beats OS dark)
  assert.match(
    css,
    /\[data-bs-theme="light"\] \{\s*--primary: #fff;\s*--spacing: 4px;\s*color-scheme: light;\s*\}/,
  )
})

test('dual-mode: manual light override precedence — the :not() clause names the lightSelector', () => {
  const css = buildModeStylesheet({ a: '1' }, { a: '2' }, darkMode)
  const mediaBlockStart = css.indexOf('@media')
  const mediaBlock = css.slice(mediaBlockStart, css.indexOf('}', css.indexOf('}', mediaBlockStart) + 1) + 1)
  assert.match(mediaBlock, /:not\(\[data-bs-theme="light"\]\)/)
})

test('dual-mode: no lightSelector ⇒ media scope is bare :root, no manual light-override block', () => {
  const css = buildModeStylesheet(
    { a: '1' },
    { a: '2' },
    { strategy: 'attribute', attribute: 'data-bs-theme', darkSelector: '[data-bs-theme="dark"]' },
  )
  assert.match(css, /@media \(prefers-color-scheme: dark\) \{\s*:root \{/)
  // exactly one attribute rule (dark only) — no light-selector block appended
  const attrBlocks = css.match(/\[data-bs-theme="[a-z]+"\]/g) || []
  assert.deepEqual(attrBlocks, ['[data-bs-theme="dark"]'])
})

test('hostile values are skipped (fail-safe), safe ones still emitted', () => {
  const css = buildModeStylesheet(
    { safe: 'red', evil: 'url(https://evil.com/x.png)' },
    { safe: 'blue', evil: 'javascript:alert(1)' },
    darkMode,
  )
  assert.match(css, /--safe: red;/)
  assert.match(css, /--safe: blue;/)
  assert.doesNotMatch(css, /--evil/)
})

test('empty lightVars still produces a valid (empty-bodied) :root block', () => {
  const css = buildModeStylesheet({}, null, undefined)
  assert.match(css, /:root \{\s*\}/)
})
