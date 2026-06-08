import React, { useCallback, useEffect, useRef, useState } from 'react'
import { TokenContext } from './context'
import { applyTokens } from './apply'
import { shouldLoadPreview } from './previewGuard'
import { checkPreviewVocabulary } from './previewVocab'
import { bridgeHeaders } from './bridgeAuth'

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

  // ─── preview token loader ─────────────────────────────────────────────────
  const loadPreview = useCallback(
    async (id) => {
      // Re-check the guard here too: loadPreview must never fetch an
      // untrusted origin even if called directly. Use the guard-resolved
      // origin, not the raw config, so the trust decision is single-sourced.
      const guard = shouldLoadPreview(config)
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
          headers: bridgeHeaders(config.preview?.key),
        })
        if (!res.ok) throw new Error('preview not found')
        const tokens = await res.json()
        applyTokens(tokens)
        setActiveTokens(tokens)
        setIsPreview(true)
        setPreviewId(id)
        // B4: warn (and flag) if the preview's keys don't intersect the
        // namespace this app consumes — otherwise the banner lights but nothing
        // on screen moves. No-op unless config.preview.expectPrefixes is set.
        setPreviewMismatch(
          checkPreviewVocabulary({
            tokens,
            expectPrefixes: config.preview?.expectPrefixes,
            previewId: id,
          }),
        )
        return true
      } catch (e) {
        // local server not running, preview expired, or network error
        // fall back silently — never break the app
        void e
        loadCommitted()
        return false
      }
    },
    [config, loadCommitted],
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

    const guard = shouldLoadPreview(config)
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

    // load the preview, then start polling so Figma changes reflect live
    loadPreview(id).then((ok) => {
      if (!ok) return
      const interval = config.preview?.pollInterval ?? 1500
      pollRef.current = setInterval(() => loadPreview(id), interval)
    })

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
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
