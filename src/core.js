// @sorb/leaf-core — the framework-free injector (component-compat-roadmap P0).
//
// Everything `SorbProvider` (`TokenProvider.jsx`) does at runtime, minus
// React: resolve the bridge connection, load committed/preview tokens, apply
// them via the mode-aware `<style>` injector or the legacy inline
// `applyTokens` path, and expose `setMode`/mode state through a tiny
// pub-sub store. `sorbInit(config)` is the ONE entry a non-React host needs.
//
// This module is pure JS with no React import — that's the whole point (the
// P0 acceptance test: a plain-HTML page can drive it with zero React in the
// bundle). `TokenProvider.jsx` is now a thin wrapper that subscribes to the
// instance this returns instead of re-implementing the logic below.
import { applyTokens, clearTokenOverrides, injectModeStylesheet, clearModeStylesheet } from './apply.js'
import { buildModeStylesheet } from './modeStylesheet.js'
import { reactBootstrapTarget } from './targets/reactBootstrap.js'
import { shouldLoadPreview } from './previewGuard.js'
import { checkPreviewVocabulary } from './previewVocab.js'
import { bridgeHeaders } from './bridgeAuth.js'
import { shouldResolveOrgConnection, getOrgKey, resolveOrgConnection, buildEffectiveConfig } from './connection.js'
import { buildSubscribeUrl, createPreviewSubscription } from './sse.js'
import { resolvePreviewBody } from './previewMode.js'
import { resolveModeAction } from './modeAction.js'
import {
  LEAF_VERSION,
  keyLast4,
  resolveDiagnosticsOrigins,
  createDiagnosticsResponder,
} from './diagnostics.js'

// EventSource/matchMedia only exist in browsers (and some polyfilled envs) —
// never reference the bare global at module scope so this file stays
// node:test-safe (identical guard to the one TokenProvider.jsx used).
const EventSourceCtor = typeof EventSource !== 'undefined' ? EventSource : null
const matchMediaFn = typeof matchMedia !== 'undefined' ? matchMedia : null
const DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)'

/**
 * Dev-only warning that never throws outside a Node-like env.
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
 * Classify a failed preview fetch into a coarse outcome for `previewError` and
 * the `sorb-hello` payload. Distinguishes tenant-scoping/expiry (`not_found`,
 * the DXw1DDaJ case) from an auth problem (`unauthorized`) from a
 * server-unreachable/parse failure (`network`). `res` is undefined when
 * `fetch` itself rejected (no response arrived).
 *
 * NOTE (invariant 5): a cross-tenant id and a genuinely-expired id both read
 * `not_found` here — identical to what the bridge reports (404-not-403) — so
 * this reveals nothing about other tenants' preview existence.
 *
 * @param {Response|undefined} res
 * @returns {'not_found'|'unauthorized'|'network'}
 */
export const classifyPreviewFailure = (res) => {
  if (!res || typeof res.status !== 'number') return 'network'
  if (res.status === 404) return 'not_found'
  if (res.status === 401 || res.status === 403) return 'unauthorized'
  return 'network'
}

// Tracks which deprecated token ids have already been warned this session.
// Single module-level set — shared by every `sorbInit` call (and, via
// TokenProvider.jsx's re-export, every `SorbProvider` too) so a page mixing
// both entry points still only warns once per token id.
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
 * @typedef {{
 *   tokens: import('./types').TokenSet,
 *   isPreview: boolean,
 *   previewId: string|null,
 *   previewMismatch: boolean,
 *   previewError: { id: string, outcome: 'not_found'|'unauthorized'|'network' }|null,
 *   mode: 'auto'|'light'|'dark',
 *   resolvedScheme: 'light'|'dark',
 * }} SorbState
 *
 * @typedef {{
 *   getState: () => SorbState,
 *   subscribe: (listener: (state: SorbState) => void) => (() => void),
 *   setMode: (next: 'auto'|'light'|'dark') => void,
 *   clearPreview: () => void,
 *   destroy: () => void,
 * }} SorbInstance
 */

/**
 * Framework-free Sorb entry point. Resolves the connection, loads
 * committed/preview tokens onto `document.documentElement`, and returns a
 * small store (`getState`/`subscribe`) plus `setMode`/`clearPreview`. No
 * React, no JSX — safe to call from a plain `<script type="module">`.
 *
 * Byte-identical DOM behavior to `SorbProvider`: same guard/vocab/mode-aware
 * injection logic, just driven by a manual pub-sub store instead of React
 * state.
 *
 * @param {import('./types').SorbConfig} config
 * @returns {SorbInstance}
 */
export function sorbInit(config) {
  let activeTokens = config.tokens
  let isPreview = false
  let previewId = null
  let previewMismatch = false
  let previewError = null
  let pollId = null
  let cancelled = false
  let unsubscribeSSE = null

  // Diagnostics-channel state (spec D2). Hoisted to sorbInit scope so the
  // `sorb-hello` snapshot can read the live effective config / bridge origin /
  // requested preview id even though they're assigned inside async `init()`.
  let effectiveConfig = config
  let bridgeOrigin = null
  let requestedPreviewId = null
  let messageHandler = null

  const hasDarkMode = !!(config.darkTokens && Object.keys(config.darkTokens).length > 0)
  const darkModeConvention = config.darkModeConvention || reactBootstrapTarget.darkMode

  let mode = 'auto'
  let systemScheme = matchMediaFn ? (matchMediaFn(DARK_MEDIA_QUERY).matches ? 'dark' : 'light') : 'light'

  const listeners = new Set()
  const getState = () => ({
    tokens: activeTokens,
    isPreview,
    previewId,
    previewMismatch,
    previewError,
    mode,
    resolvedScheme: mode === 'auto' ? systemScheme : mode,
  })
  const notify = () => {
    const state = getState()
    listeners.forEach((listener) => listener(state))
  }
  const subscribe = (listener) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  let mql = null
  const onSchemeChange = (e) => {
    systemScheme = e.matches ? 'dark' : 'light'
    notify()
  }
  if (matchMediaFn) {
    mql = matchMediaFn(DARK_MEDIA_QUERY)
    if (typeof mql.addEventListener === 'function') mql.addEventListener('change', onSchemeChange)
    else if (typeof mql.addListener === 'function') mql.addListener(onSchemeChange)
  }

  // Tracks the token map currently written as INLINE `--x` custom properties
  // (flat path) so switching TO the mode-aware `<style>` path can clear
  // those stale inline overrides first — same reasoning as TokenProvider.jsx.
  let inlineTokens = null

  const applyFlat = (tokens) => {
    clearModeStylesheet()
    applyTokens(tokens)
    inlineTokens = tokens
  }

  const applyModeAware = (lightTokens, darkTokens, convention) => {
    if (inlineTokens) {
      clearTokenOverrides(inlineTokens)
      inlineTokens = null
    }
    injectModeStylesheet(buildModeStylesheet(lightTokens, darkTokens, convention))
  }

  const loadCommitted = () => {
    if (hasDarkMode) {
      applyModeAware(config.tokens, config.darkTokens, darkModeConvention)
    } else {
      applyFlat(config.tokens)
    }
    activeTokens = config.tokens
    isPreview = false
    previewId = null
    previewMismatch = false
    previewError = null
    notify()
  }

  const applyPreviewTokens = (body, id, effectiveConfig) => {
    const resolved = resolvePreviewBody(body, darkModeConvention)
    let flatTokens
    if (resolved.kind === 'mode-aware') {
      applyModeAware(resolved.lightTokens, resolved.darkTokens, resolved.darkMode)
      flatTokens = resolved.lightTokens
    } else {
      applyFlat(resolved.tokens)
      flatTokens = resolved.tokens
    }
    activeTokens = flatTokens
    isPreview = true
    previewId = id
    previewError = null
    previewMismatch = checkPreviewVocabulary({
      tokens: flatTokens,
      expectPrefixes: effectiveConfig.preview?.expectPrefixes,
      previewId: id,
    })
    notify()
  }

  const loadPreview = async (id, effectiveConfig) => {
    const cfg = effectiveConfig || config
    const guard = shouldLoadPreview(cfg)
    if (!guard.allowed) {
      loadCommitted()
      return false
    }
    const origin = guard.origin
    let res
    try {
      res = await fetch(`${origin}/preview/${id}`, {
        headers: bridgeHeaders(cfg.preview?.key),
      })
      if (!res.ok) throw new Error('preview not found')
      const tokens = await res.json()
      applyPreviewTokens(tokens, id, cfg)
      return true
    } catch (e) {
      // local server not running, preview expired, cross-tenant id, or network
      // error — fall back silently to committed (never break the page), but
      // record WHY so the banner + `sorb-hello` channel can surface it.
      void e
      const outcome = classifyPreviewFailure(res)
      loadCommitted() // silent fallback (clears previewError) …
      previewError = { id, outcome } // … then stamp the failure and re-notify.
      // Always-on (NOT dev-stripped) — fires only on a deliberate `?preview=`
      // request, so the prod noise budget is one line per deliberate action.
      // eslint-disable-next-line no-console
      console.warn(
        `[@sorb/leaf] preview "${id}" could not be loaded (${outcome}) — it may not be ` +
          "visible to this app's key; it may belong to a different project. " +
          'Falling back to committed tokens.',
      )
      notify()
      return false
    }
  }

  const clearPreview = () => {
    if (pollId) {
      clearInterval(pollId)
      pollId = null
    }
    if (typeof location !== 'undefined' && typeof history !== 'undefined') {
      const params = new URLSearchParams(location.search)
      params.delete('preview')
      const qs = params.toString()
      history.replaceState(null, '', qs ? `?${qs}` : location.pathname)
    }
    loadCommitted()
  }

  const setMode = (next) => {
    mode = next
    if (typeof document !== 'undefined') {
      const action = resolveModeAction(darkModeConvention, next)
      switch (action.type) {
        case 'attr-set':
          document.documentElement.setAttribute(action.attribute, action.value)
          break
        case 'attr-remove':
          document.documentElement.removeAttribute(action.attribute)
          break
        case 'class-add':
          document.documentElement.classList.add(action.className)
          break
        case 'class-remove':
          document.documentElement.classList.remove(action.className)
          break
        case 'none':
        default:
          break
      }
    }
    notify()
  }

  // ─── diagnostics channel (spec D2 — ping-only `sorb-hello`) ───────────────
  // The live snapshot answered to an allowlisted `sorb-ping`. Reads current
  // state so a ping that arrives after a failed preview still reports the real
  // outcome. keyLast4 ONLY — never the full pk (invariant 3).
  const previewOutcome = () => {
    if (previewError) return previewError.outcome
    if (isPreview) return 'ok'
    return 'none'
  }
  const diagnosticsSnapshot = () => ({
    namespace: config.namespace,
    keyLast4: keyLast4(effectiveConfig.preview?.key || getOrgKey(config)),
    leafVersion: LEAF_VERSION,
    bridgeOrigin,
    preview: { requestedId: requestedPreviewId, outcome: previewOutcome() },
  })

  // Register the message listener EARLY and UNCONDITIONALLY so a failed preview
  // still answers pings. We never broadcast, so registering outside an iframe
  // is harmless. Answers only allowlisted-origin `sorb-ping`s (see diagnostics.js).
  const registerDiagnostics = () => {
    if (messageHandler) return
    if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return
    messageHandler = createDiagnosticsResponder({
      getSnapshot: diagnosticsSnapshot,
      getAllowedOrigins: () => resolveDiagnosticsOrigins(config),
    })
    window.addEventListener('message', messageHandler)
  }

  const destroy = () => {
    cancelled = true
    if (pollId) clearInterval(pollId)
    if (unsubscribeSSE) unsubscribeSSE()
    if (messageHandler && typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
      window.removeEventListener('message', messageHandler)
      messageHandler = null
    }
    if (mql) {
      if (typeof mql.removeEventListener === 'function') mql.removeEventListener('change', onSchemeChange)
      else if (typeof mql.removeListener === 'function') mql.removeListener(onSchemeChange)
    }
    listeners.clear()
  }

  const init = async () => {
    if (config.resolved && config.resolved.length) warnDeprecated(config.resolved)

    // Answer diagnostics pings from the very start — before any async work —
    // so a slow/failed connection resolve or preview fetch never leaves the
    // listener unregistered (spec: "on both the success and failure paths").
    registerDiagnostics()

    let resolvedConnection = null
    if (shouldResolveOrgConnection(config)) {
      resolvedConnection = await resolveOrgConnection(getOrgKey(config), {
        cloudBase: config.cloudBase,
      })
      if (cancelled) return
      effectiveConfig = buildEffectiveConfig(config, resolvedConnection)
    }

    const guard = shouldLoadPreview(effectiveConfig)
    bridgeOrigin = guard.origin || effectiveConfig.preview?.origin || null
    const id = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('preview') : null
    requestedPreviewId = id

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
        onDelete: () => loadCommitted(),
        onError: () => devWarn('SSE preview subscription error — preview may be stale'),
      })
    }

    if (!unsubscribeSSE) {
      const interval = effectiveConfig.preview?.pollInterval ?? 1500
      pollId = setInterval(() => loadPreview(id, effectiveConfig), interval)
    }
  }

  init()

  return { getState, subscribe, setMode, clearPreview, destroy }
}
