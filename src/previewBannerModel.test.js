import { test } from 'node:test'
import assert from 'node:assert/strict'
import { previewBannerModel } from './previewBannerModel.js'

test('hidden when there is neither a live preview nor a preview error', () => {
  assert.equal(previewBannerModel({ isPreview: false, previewError: null }).visible, false)
  assert.equal(previewBannerModel({ isPreview: false }).visible, false)
})

test('ERROR variant renders even though isPreview is false (the silent-404 fix)', () => {
  const m = previewBannerModel({
    isPreview: false,
    previewMismatch: false,
    previewError: { id: 'DXw1DDaJ', outcome: 'not_found' },
    previewId: null,
  })
  assert.equal(m.visible, true)
  assert.equal(m.variant, 'error')
  assert.equal(m.id, 'DXw1DDaJ')
  assert.match(m.message, /belong to another project/)
  assert.equal(m.buttonLabel, 'Dismiss')
  assert.match(m.background, /--sorb-preview-error-bg/)
})

test('error variant wins over an active preview if somehow both are set', () => {
  const m = previewBannerModel({
    isPreview: true,
    previewError: { id: 'X', outcome: 'unauthorized' },
    previewId: 'Y',
  })
  assert.equal(m.variant, 'error')
  assert.equal(m.id, 'X')
})

test('mismatch variant (amber) when preview is active but vocabulary mismatched', () => {
  const m = previewBannerModel({ isPreview: true, previewMismatch: true, previewId: 'p1' })
  assert.equal(m.visible, true)
  assert.equal(m.variant, 'mismatch')
  assert.equal(m.id, 'p1')
  assert.equal(m.buttonLabel, 'Exit preview')
  assert.match(m.background, /--sorb-preview-warning-bg/)
})

test('active variant (blue) for a healthy live preview', () => {
  const m = previewBannerModel({ isPreview: true, previewMismatch: false, previewId: 'p1' })
  assert.equal(m.visible, true)
  assert.equal(m.variant, 'active')
  assert.equal(m.background, '#3B5BDB')
  assert.equal(m.buttonLabel, 'Exit preview')
})
