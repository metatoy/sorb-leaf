import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { TokenContext } from './context'
import { sorbInit, warnedDeprecations } from './core'
import { applyLegacyMap, clearLegacyMap } from './legacyDom'

// Re-exported for back-compat — `warnedDeprecations` isn't part of the
// public `@sorb/leaf` surface (not in `src/index.js`) but lived on this
// module before the P0 leaf-core extraction moved the dedupe `Set` itself
// into `./core.js`. Kept here so any existing deep import
// (`sorb-leaf/src/TokenProvider`) still resolves the same object identity.
export { warnedDeprecations }

// matchMedia only exists in browsers — same node:test-safety concern
// `./core.js` guards against; used here only to seed the FIRST render's
// `resolvedScheme` (a read, no DOM mutation) so it's correct before the
// mount effect below has run, matching the pre-extraction component.
const matchMediaFn = typeof matchMedia !== 'undefined' ? matchMedia : null
const DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)'

/**
 * `SorbProvider` — the React shell over `sorbInit` (`./core.js`, the
 * framework-free injector; component-compat-roadmap P0). ALL runtime logic
 * (connection resolution, committed/preview loading, mode-aware injection,
 * SSE/poll, dark-mode state) now lives in `sorbInit`; this component's only
 * job is to bridge that instance's pub-sub store into React state and
 * expose the same `TokenContext` shape as before — non-breaking, byte-
 * identical behavior to the pre-extraction implementation. `sorbInit` is
 * created in the mount `useEffect` (not during render) so timing — and
 * StrictMode double-invoke safety — matches the original implementation,
 * which did all its DOM work in a mount-only effect too.
 *
 * The optional `legacyMap` (Legacy-React adapter, roadmap §6) is an ADDITIVE,
 * non-destructive DOM overlay layered on top of the shell — it never touches
 * `sorbInit`. When present, after tokens apply it remaps any element whose
 * hardcoded literal matches a row's `raw` to `var(--<cssVar>, <raw>)`, and
 * restores the originals on unmount.
 *
 * @param {{
 *   config: import('./types').SorbConfig,
 *   legacyMap?: import('./types').LegacyMapRow[],
 *   children: React.ReactNode,
 * }} props
 */
export const SorbProvider = ({ config, legacyMap, children }) => {
  const instanceRef = useRef(null)
  const legacyHandleRef = useRef(null)
  const [state, setState] = React.useState(() => ({
    tokens: config.tokens,
    isPreview: false,
    previewId: null,
    previewMismatch: false,
    mode: 'auto',
    resolvedScheme: matchMediaFn ? (matchMediaFn(DARK_MEDIA_QUERY).matches ? 'dark' : 'light') : 'light',
  }))

  // legacyMap prop wins over config.legacyMap; either enables the shim.
  const resolvedLegacyMap = legacyMap ?? config.legacyMap ?? null

  useEffect(() => {
    const instance = sorbInit(config)
    instanceRef.current = instance
    setState(instance.getState())
    const unsubscribe = instance.subscribe(setState)
    return () => {
      unsubscribe()
      instance.destroy()
      instanceRef.current = null
    }
    // Intentionally empty — only runs on mount, mirroring the original
    // component's contract (a changed `config` prop identity does not
    // reinitialize the connection).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ─── legacy-map shim (roadmap §6) ─────────────────────────────────────────
  // Additive overlay on top of the sorbInit shell: after tokens are applied
  // (and on every token change, so previews remap too), walk the DOM and remap
  // any hardcoded literal that matches a legacyMap row to `var(--cssVar, raw)`.
  // Restore on cleanup so removing the provider — or unmounting — returns the
  // original inline values.
  useEffect(() => {
    if (!resolvedLegacyMap || resolvedLegacyMap.length === 0) return undefined
    if (typeof document === 'undefined') return undefined
    // restore any prior overrides before re-applying against the new tokens
    if (legacyHandleRef.current) clearLegacyMap(legacyHandleRef.current)
    legacyHandleRef.current = applyLegacyMap(document.body, resolvedLegacyMap)
    return () => {
      if (legacyHandleRef.current) {
        clearLegacyMap(legacyHandleRef.current)
        legacyHandleRef.current = null
      }
    }
  }, [resolvedLegacyMap, state.tokens])

  const setMode = useCallback((next) => {
    if (instanceRef.current) instanceRef.current.setMode(next)
  }, [])
  const clearPreview = useCallback(() => {
    if (instanceRef.current) instanceRef.current.clearPreview()
  }, [])

  const value = useMemo(
    () => ({
      tokens: state.tokens,
      isPreview: state.isPreview,
      previewId: state.previewId,
      previewMismatch: state.previewMismatch,
      clearPreview,
      mode: state.mode,
      setMode,
      resolvedScheme: state.resolvedScheme,
    }),
    [state, clearPreview, setMode],
  )

  return <TokenContext.Provider value={value}>{children}</TokenContext.Provider>
}
