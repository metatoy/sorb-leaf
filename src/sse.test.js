import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildSubscribeUrl, parsePreviewFrame, createPreviewSubscription } from './sse.js'

// ─── buildSubscribeUrl ─────────────────────────────────────────────────────

test('buildSubscribeUrl: builds the assumed hosted-relay subscribe path', () => {
  assert.equal(
    buildSubscribeUrl('https://bridge.sorbcloud.com', 'org_123', 'prev_1'),
    'https://bridge.sorbcloud.com/orgs/org_123/preview/prev_1/subscribe',
  )
})

test('buildSubscribeUrl: strips a trailing slash on bridgeUrl', () => {
  assert.equal(
    buildSubscribeUrl('https://bridge.sorbcloud.com/', 'org_123', 'prev_1'),
    'https://bridge.sorbcloud.com/orgs/org_123/preview/prev_1/subscribe',
  )
})

test('buildSubscribeUrl: URL-encodes org/preview ids', () => {
  assert.equal(
    buildSubscribeUrl('https://bridge.sorbcloud.com', 'org 1/2', 'prev?1'),
    'https://bridge.sorbcloud.com/orgs/org%201%2F2/preview/prev%3F1/subscribe',
  )
})

test('buildSubscribeUrl: appends ?key= when a bearer key is given', () => {
  assert.equal(
    buildSubscribeUrl('https://bridge.sorbcloud.com', 'org_123', 'prev_1', 'sorb_pk_abc'),
    'https://bridge.sorbcloud.com/orgs/org_123/preview/prev_1/subscribe?key=sorb_pk_abc',
  )
})

test('buildSubscribeUrl: blank/whitespace key omits the query param', () => {
  assert.equal(
    buildSubscribeUrl('https://bridge.sorbcloud.com', 'org_123', 'prev_1', '   '),
    'https://bridge.sorbcloud.com/orgs/org_123/preview/prev_1/subscribe',
  )
})

// ─── parsePreviewFrame ──────────────────────────────────────────────────────

test('parsePreviewFrame: parses a snapshot frame', () => {
  const frame = parsePreviewFrame(JSON.stringify({ type: 'snapshot', tokens: { 'bs-primary': '#fff' } }))
  assert.deepEqual(frame, { type: 'snapshot', tokens: { 'bs-primary': '#fff' } })
})

test('parsePreviewFrame: parses an update frame', () => {
  const frame = parsePreviewFrame(JSON.stringify({ type: 'update', tokens: { x: 1 } }))
  assert.deepEqual(frame, { type: 'update', tokens: { x: 1 } })
})

test('parsePreviewFrame: parses a ping frame with no tokens field required', () => {
  assert.deepEqual(parsePreviewFrame(JSON.stringify({ type: 'ping' })), { type: 'ping' })
})

test('parsePreviewFrame: unknown type → null', () => {
  assert.equal(parsePreviewFrame(JSON.stringify({ type: 'mystery' })), null)
})

test('parsePreviewFrame: snapshot/update missing tokens → null', () => {
  assert.equal(parsePreviewFrame(JSON.stringify({ type: 'snapshot' })), null)
})

test('parsePreviewFrame: malformed JSON → null, never throws', () => {
  assert.equal(parsePreviewFrame('not json'), null)
})

test('parsePreviewFrame: non-object JSON → null', () => {
  assert.equal(parsePreviewFrame('42'), null)
  assert.equal(parsePreviewFrame('null'), null)
})

// ─── createPreviewSubscription ──────────────────────────────────────────────

class FakeEventSource {
  constructor(url) {
    this.url = url
    this.closed = false
    this.listeners = {}
    FakeEventSource.instances.push(this)
  }
  addEventListener(type, fn) {
    this.listeners[type] = fn
  }
  close() {
    this.closed = true
  }
  emit(data) {
    this.onmessage({ data })
  }
  emitError(evt) {
    if (this.listeners.error) this.listeners.error(evt)
  }
}
FakeEventSource.instances = []

test('createPreviewSubscription: null when no EventSource constructor given (poll fallback)', () => {
  assert.equal(createPreviewSubscription({ url: 'https://x', onTokens: () => {} }), null)
})

test('createPreviewSubscription: applies snapshot/update frames via onTokens, ignores ping', () => {
  FakeEventSource.instances = []
  const received = []
  const unsubscribe = createPreviewSubscription({
    EventSourceImpl: FakeEventSource,
    url: 'https://bridge.sorbcloud.com/orgs/o/preview/p/subscribe',
    onTokens: (tokens) => received.push(tokens),
  })
  const es = FakeEventSource.instances[0]
  assert.equal(es.url, 'https://bridge.sorbcloud.com/orgs/o/preview/p/subscribe')

  es.emit(JSON.stringify({ type: 'snapshot', tokens: { a: 1 } }))
  es.emit(JSON.stringify({ type: 'ping' }))
  es.emit(JSON.stringify({ type: 'update', tokens: { a: 2 } }))
  es.emit('garbage')

  assert.deepEqual(received, [{ a: 1 }, { a: 2 }])

  unsubscribe()
  assert.equal(es.closed, true)
})

test('createPreviewSubscription: wires onError to the error event', () => {
  FakeEventSource.instances = []
  let errored = false
  createPreviewSubscription({
    EventSourceImpl: FakeEventSource,
    url: 'https://x',
    onTokens: () => {},
    onError: () => {
      errored = true
    },
  })
  FakeEventSource.instances[0].emitError({ message: 'boom' })
  assert.equal(errored, true)
})

test('createPreviewSubscription: unsubscribe never throws even if close() throws', () => {
  class ThrowingClose extends FakeEventSource {
    close() {
      throw new Error('already closed')
    }
  }
  const unsubscribe = createPreviewSubscription({
    EventSourceImpl: ThrowingClose,
    url: 'https://x',
    onTokens: () => {},
  })
  assert.doesNotThrow(() => unsubscribe())
})
