import React, { useCallback, useEffect, useRef, useState } from 'react'
import { TokenContext } from './context'
import { applyTokens } from './apply'
import { shouldLoadPreview } from './previewGuard'

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

/**
 * @param {{ config: import('./types').SorbConfig, children: React.ReactNode }} props
 */
export const SorbProvider = ({ config, children }) => {
  const [activeTokens, setActiveTokens] = useState(config.tokens)
  const [isPreview, setIsPreview] = useState(false)
  const [previewId, setPreviewId] = useState(null)
  const pollRef = useRef(null)

  // ─── committed token loader ───────────────────────────────────────────────
  const loadCommitted = useCallback(() => {
    applyTokens(config.tokens)
    setActiveTokens(config.tokens)
    setIsPreview(false)
    setPreviewId(null)
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
        const res = await fetch(`${origin}/preview/${id}`)
        if (!res.ok) throw new Error('preview not found')
        const tokens = await res.json()
        applyTokens(tokens)
        setActiveTokens(tokens)
        setIsPreview(true)
        setPreviewId(id)
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
    <TokenContext.Provider value={{ tokens: activeTokens, isPreview, previewId, clearPreview }}>
      {children}
    </TokenContext.Provider>
  )
}
