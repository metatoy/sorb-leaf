import { test } from 'node:test'
import assert from 'node:assert/strict'
import { shouldLoadPreview } from './previewGuard.js'

test('enabled + default localhost origin → allowed', () => {
  const r = shouldLoadPreview({ preview: { enabled: true } })
  assert.equal(r.allowed, true)
  assert.equal(r.origin, 'http://localhost:7777')
})

test('enabled + explicit localhost origin (custom port) → allowed', () => {
  const r = shouldLoadPreview({ preview: { enabled: true, origin: 'http://localhost:9000' } })
  assert.equal(r.allowed, true)
})

test('enabled + 127.0.0.1 origin → allowed', () => {
  const r = shouldLoadPreview({ preview: { enabled: true, origin: 'http://127.0.0.1:7777' } })
  assert.equal(r.allowed, true)
})

test('enabled + non-allowlisted https origin → blocked', () => {
  const r = shouldLoadPreview({ preview: { enabled: true, origin: 'https://evil.com' } })
  assert.equal(r.allowed, false)
  assert.equal(r.reason, 'origin-not-allowlisted')
})

test('disabled → blocked', () => {
  const r = shouldLoadPreview({ preview: { enabled: false, origin: 'http://localhost:7777' } })
  assert.equal(r.allowed, false)
  assert.equal(r.reason, 'preview-disabled')
})

test('missing preview config → blocked', () => {
  assert.equal(shouldLoadPreview({}).allowed, false)
  assert.equal(shouldLoadPreview(undefined).allowed, false)
})

test('enabled non-strict (truthy but not === true) → blocked', () => {
  const r = shouldLoadPreview({ preview: { enabled: 'yes' } })
  assert.equal(r.allowed, false)
})

test('enabled + explicitly allowlisted custom origin → allowed', () => {
  const r = shouldLoadPreview({
    preview: {
      enabled: true,
      origin: 'https://staging-bridge.example.com',
      allowedOrigins: ['https://staging-bridge.example.com'],
    },
  })
  assert.equal(r.allowed, true)
})

test('allowlist match ignores trailing path/slash differences', () => {
  const r = shouldLoadPreview({
    preview: {
      enabled: true,
      origin: 'https://bridge.example.com',
      allowedOrigins: ['https://bridge.example.com/'],
    },
  })
  assert.equal(r.allowed, true)
})

test('allowlisted origin does NOT match a different host', () => {
  const r = shouldLoadPreview({
    preview: {
      enabled: true,
      origin: 'https://evil.com',
      allowedOrigins: ['https://bridge.example.com'],
    },
  })
  assert.equal(r.allowed, false)
})

test('malformed origin → blocked', () => {
  const r = shouldLoadPreview({ preview: { enabled: true, origin: 'not a url' } })
  assert.equal(r.allowed, false)
  assert.equal(r.reason, 'malformed-origin')
})
