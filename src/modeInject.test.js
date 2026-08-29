import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

// Minimal DOM stub for the <style id="sorb-tokens"> upsert path — no jsdom.
// Tracks elements by id in a Map so getElementById/createElement/appendChild
// behave enough like the real DOM for injectModeStylesheet's lifecycle.
const elementsById = new Map()

function makeStyleEl() {
  return { tagName: 'STYLE', id: '', textContent: '', parentNode: null }
}

globalThis.document = {
  getElementById: (id) => elementsById.get(id) || null,
  createElement: (tag) => {
    if (tag !== 'style') throw new Error(`unexpected createElement(${tag})`)
    return makeStyleEl()
  },
  head: {
    appendChild: (el) => {
      el.parentNode = globalThis.document.head
      if (el.id) elementsById.set(el.id, el)
    },
    removeChild: (el) => {
      el.parentNode = null
      if (el.id) elementsById.delete(el.id)
    },
  },
}

const { injectModeStylesheet, clearModeStylesheet, MODE_STYLESHEET_ID } = await import('./apply.js')

beforeEach(() => {
  elementsById.clear()
})

test('MODE_STYLESHEET_ID is the documented tag id', () => {
  assert.equal(MODE_STYLESHEET_ID, 'sorb-tokens')
})

test('creates the <style id="sorb-tokens"> tag on first call', () => {
  injectModeStylesheet(':root { --a: 1; }')
  const tag = elementsById.get('sorb-tokens')
  assert.ok(tag)
  assert.equal(tag.textContent, ':root { --a: 1; }')
})

test('upserts (replaces textContent) on subsequent calls — no duplicate tag', () => {
  injectModeStylesheet(':root { --a: 1; }')
  injectModeStylesheet(':root { --a: 2; }')
  assert.equal(elementsById.size, 1)
  assert.equal(elementsById.get('sorb-tokens').textContent, ':root { --a: 2; }')
})

test('clearModeStylesheet removes the tag', () => {
  injectModeStylesheet(':root { --a: 1; }')
  clearModeStylesheet()
  assert.equal(elementsById.get('sorb-tokens'), undefined)
})

test('clearModeStylesheet is a no-op when nothing was injected', () => {
  assert.doesNotThrow(() => clearModeStylesheet())
})
