import React, { useCallback, useEffect, useRef, useState } from 'react'
import { TokenContext } from './context'
import { applyTokens } from './apply'
import { shouldLoadPreview } from './previewGuard'
import { checkPreviewVocabulary } from './previewVocab'
import { bridgeHeaders } from './bridgeAuth'
import { shouldResolveOrgConnection, getOrgKey, resolveOrgConnection, buildEffectiveConfig } from './connection'
import { buildSubscribeUrl, createPreviewSubscription } from './sse'

// EventSource only exists in browsers (and some polyfilled envs) — never
// reference the bare global at module scope so this file stays node:test-safe.
const EventSourceCtor = typeof EventSource !== 'undefined' ? EventSource : null

/**
 * Dev-only warning that never throws in a browser (no `process` global there).
 * @param {string} msg
 * @returns {void}
 */
const devWarn = (msg) => {
  try {
    if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn(`[sorb] ${msg}`)
    }
  } catch (e) {
    void e
  }
}

// Tracks which deprecated token ids have already been warned this session.
export const warnedDeprecations = new Set()

function warnDeprecated(resolved) {
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') return
  for (let i = 0; i < resolved.length; i++) {
    const token = resolved[i]
    if (!token.deprecated) continue
    if (warnedDeprecations.has(token.id)) continue
    warnedDeprecations.add(token.id)
    const replacedBy =
      token.replacedBy ||
      (token.$extensions && token.$extensions.sorb && token.$extensions.sorb.replacedBy) ||
      null
    if (replacedBy) {
      console.warn('[@sorb/leaf] Deprecated token: ' + token.id + ' — use ' + replacedBy + ' instead')
    } else {
      console.warn('[@sorb/leaf] Deprecated token: ' + token.id + ' is deprecated')
    }
  }
}

/**
 * @param {{ config: import('./types').SorbConfig, children: React.ReactNode }} props
 */
export const SorbProvider = ({ config, children }) => {
  const [activeTokens, setActiveTokens] = useState(config.tokens)
  const [isPreview, setIsPreview] = useState(false)
  const [previewId, setPreviewId] = useState(null)
  // B4 vocab guard: true when a loaded preview applied tokens but none matched
  // the app's expected prefixes (`config.preview.expectPrefixes`). Always false
  // when the guard is not opted into.
  const [previewMismatch, setPreviewMismatch] = useState(false)
  const pollRef = useRef(null)

  // ─── committed token loader ───────────────────────────────────────────────
  const loadCommitted = useCallback(() => {
    applyTokens(config.tokens)
    setActiveTokens(config.tokens)
    setIsPreview(false)
    setPreviewId(null)
    setPreviewMismatch(false)
  }, [config.tokens])

  // Shared by the fetch-based loader and the SSE push path — applies a
  // received token set as the active preview and runs the B4 vocab guard.
  const applyPreviewTokens = useCallback(
    (tokens, id, effectiveConfig) => {
      applyTokens(tokens)
      setActiveTokens(tokens)
      setIsPreview(true)
      setPreviewId(id)
      setPreviewMismatch(
        checkPreviewVocabulary({
          tokens,
          expectPrefixes: effectiveConfig.preview?.expectPrefixes,
          previewId: id,
        }),
      )
    },
    [],
  )

  // ─── preview token loader ─────────────────────────────────────────────────
  const loadPreview = useCallback(
    async (id, effectiveConfig) => {
      // effectiveConfig lets the mount effect pass in the org-key-resolved
      // connection (E1); default to the raw config so every existing caller
      // (including PreviewBanner's manual re-fetch) is unaffected.
      const cfg = effectiveConfig || config

      // Re-check the guard here too: loadPreview must never fetch an
      // untrusted origin even if called directly. Use the guard-resolved
      // origin, not the raw config, so the trust decision is single-sourced.
      const guard = shouldLoadPreview(cfg)
      if (!guard.allowed) {
        loadCommitted()
        return false
      }
      const origin = guard.origin
      try {
        // Hosted bridge needs `Authorization: Bearer <config.preview.key>`;
        // when no key is configured (localhost `sorb dev`) NO header is sent
        // and this call is unchanged.
        const res = await fetch(`${origin}/preview/${id}`, {
          headers: bridgeHeaders(cfg.preview?.key),
        })
        if (!res.ok) throw new Error('preview not found')
        const tokens = await res.json()
        applyPreviewTokens(tokens, id, cfg)
        return true
      } catch (e) {
        // local server not running, preview expired, or network error
        // fall back silently — never break the app
        void e
        loadCommitted()
        return false
      }
    },
    [config, loadCommitted, applyPreviewTokens],
  )

  // ─── clear preview + remove query param ──────────────────────────────────
  const clearPreview = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    const params = new URLSearchParams(location.search)
    params.delete('preview')
    const qs = params.toString()
    history.replaceState(null, '', qs ? `?${qs}` : location.pathname)
    loadCommitted()
  }, [loadCommitted])

  // ─── initialise on mount ──────────────────────────────────────────────────
  useEffect(() => {
    if (config.resolved && config.resolved.length) warnDeprecated(config.resolved)

    let cancelled = false
    let unsubscribeSSE = null

    const init = async () => {
      // E1: org-key mode — resolve bridge mode/url/persistence from
      // sorb-cloud instead of requiring a local sorb.config.json. Purely
      // additive: consumers who never set config.orgKey/publishableKey (or
      // who already pin an explicit config.preview.origin — file-mode /
      // Mode C) skip this entirely and behave byte-for-byte as before.
      let effectiveConfig = config
      let resolvedConnection = null
      if (shouldResolveOrgConnection(config)) {
        resolvedConnection = await resolveOrgConnection(getOrgKey(config), {
          cloudBase: config.cloudBase,
        })
        if (cancelled) return
        // On failure (bad key, network error, cloud down) resolvedConnection
        // is null and effectiveConfig stays the raw config — the guard below
        // then blocks (no local origin configured) and we fall back to
        // committed tokens, same shape as today's "server not running" path.
        effectiveConfig = buildEffectiveConfig(config, resolvedConnection)
      }

      const guard = shouldLoadPreview(effectiveConfig)
      const id = new URLSearchParams(location.search).get('preview')

      // Preview only runs when the origin-allowlist guard says so (C3). A stray
      // `?preview=` on a production deploy against an untrusted origin is ignored
      // — we load committed tokens and dev-warn instead.
      if (!guard.allowed || !id) {
        if (id && !guard.allowed) {
          devWarn(
            `ignoring ?preview= — preview not permitted (${guard.reason ?? 'blocked'}); ` +
              'loading committed tokens',
          )
        }
        loadCommitted()
        return
      }

      const ok = await loadPreview(id, effectiveConfig)
      if (!ok || cancelled) return

      // Hosted-relay connections (Mode A) push updates over SSE instead of
      // being polled. Falls back to the poll loop when the resolved
      // connection isn't SSE-capable, or in plain file-mode (Mode C) where
      // there's no resolved connection at all — unchanged from today.
      const useSSE =
        resolvedConnection &&
        resolvedConnection.transport === 'sse' &&
        resolvedConnection.orgId &&
        EventSourceCtor

      if (useSSE) {
        const url = buildSubscribeUrl(
          resolvedConnection.bridgeUrl,
          resolvedConnection.orgId,
          id,
          effectiveConfig.preview?.key,
        )
        unsubscribeSSE = createPreviewSubscription({
          EventSourceImpl: EventSourceCtor,
          url,
          onTokens: (tokens) => applyPreviewTokens(tokens, id, effectiveConfig),
          onError: () => devWarn('SSE preview subscription error — preview may be stale'),
        })
      }

      // Poll fallback: always used in file-mode (Mode C) / non-SSE bridges;
      // also used if SSE subscription setup failed to return an unsubscribe.
      if (!unsubscribeSSE) {
        const interval = effectiveConfig.preview?.pollInterval ?? 1500
        pollRef.current = setInterval(() => loadPreview(id, effectiveConfig), interval)
      }
    }

    init()

    return () => {
      cancelled = true
      if (pollRef.current) clearInterval(pollRef.current)
      if (unsubscribeSSE) unsubscribeSSE()
    }
  }, []) // intentionally empty — only runs on mount

  return (
    <TokenContext.Provider
      value={{ tokens: activeTokens, isPreview, previewId, previewMismatch, clearPreview }}
    >
      {children}
    </TokenContext.Provider>
  )
}
