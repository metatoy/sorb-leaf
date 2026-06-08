import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

// Minimal DOM stub so applyTokens' `document.documentElement.style.setProperty`
// path is exercised without pulling in jsdom. Records what actually got set.
const setProps = new Map()
const removedProps = []
globalThis.document = {
  documentElement: {
    style: {
      setProperty: (name, value) => setProps.set(name, value),
      removeProperty: (name) => removedProps.push(name),
    },
  },
}

// Import AFTER the stub is in place.
const { applyTokens, clearTokenOverrides } = await import('./apply.js')

beforeEach(() => {
  setProps.clear()
  removedProps.length = 0
})

test('applies safe tokens and SKIPS the hostile one (fail safe)', () => {
  applyTokens({
    primary: '#0F65EF',
    spacing: '4px',
    radius: 8,
    evil: 'url(https://evil.com/x.png)',
    safe2: 'rgba(0,0,0,.5)',
  })

  // safe values present
  assert.equal(setProps.get('--primary'), '#0F65EF')
  assert.equal(setProps.get('--spacing'), '4px')
  assert.equal(setProps.get('--radius'), '8')
  assert.equal(setProps.get('--safe2'), 'rgba(0,0,0,.5)')

  // hostile value skipped — never written
  assert.equal(setProps.has('--evil'), false)
  assert.equal(setProps.size, 4)
})

test('a context-break value is skipped, others still apply', () => {
  applyTokens({
    a: 'red',
    b: 'red; } body{ background:url(//evil) }',
    c: 'bold',
  })
  assert.equal(setProps.has('--b'), false)
  assert.equal(setProps.get('--a'), 'red')
  assert.equal(setProps.get('--c'), 'bold')
})

test('clearTokenOverrides removes every key', () => {
  clearTokenOverrides({ a: '1', b: '2' })
  assert.deepEqual(removedProps.sort(), ['--a', '--b'])
})
