// verify.js — RUNNING-APP token verification (e2e-fix W2).
//
// Reports the values the running app ACTUALLY resolved for a set of tokens (read
// off `:root` — where SorbProvider's applyTokens wrote the committed/preview
// values) to the bridge's `POST /verify/app`, which diffs them against the
// committed resolved map. This is what makes "verify-before-merge in your running
// app" true in code: it asserts the live DOM resolves to the bound token values,
// not Figma-side geometry.
//
// SSR-safe: no DOM → returns a clear `{ ok:false, reason:'no-dom' }` rather than
// throwing (safe to call from a server-rendered component's effect). `fetch` is
// injectable for tests.

/** Normalize a token name to a `--cssVar`. */
const toCssVar = (name) => {
  const s = String(name).trim()
  return s.startsWith('--') ? s : `--${s}`
}

/**
 * Read each token's resolved value off `:root` and ask the bridge whether the
 * running app matches the committed resolved map.
 *
 * Precondition: call from inside a mounted `<SorbProvider>` — it applies the
 * resolved token literals onto `:root`. Without it, custom props read back as
 * `var(...)` refs (outputReferences css) and the result is `{ ok:false,
 * reason:'provider-not-applied' }` rather than a misleading mismatch.
 *
 * @param {string[]} tokens  Token names or `--cssVar`s to check (e.g. `'button-primary-bg-default'`).
 * @param {{ origin?: string, fetch?: typeof globalThis.fetch }} [opts]
 * @returns {Promise<{ok:boolean, reason?:string, checked?:number, matched?:number, mismatches?:Array<{cssVar:string,expected:any,got:any}>, unknown?:string[], error?:string}>}
 */
export const verifyResolved = async (tokens, { origin = 'http://localhost:7777', fetch: fetchImpl } = {}) => {
  if (typeof document === 'undefined' || !document.documentElement) {
    return { ok: false, reason: 'no-dom' }
  }
  if (!Array.isArray(tokens) || tokens.length === 0) {
    return { ok: false, reason: 'no-tokens' }
  }
  const cs = getComputedStyle(document.documentElement)
  /** @type {Record<string,string>} */
  const values = {}
  for (const t of tokens) {
    const cssVar = toCssVar(t)
    values[cssVar] = cs.getPropertyValue(cssVar).trim()
  }
  // Precondition: SorbProvider must have applied the resolved literals onto :root.
  // `variables.css` is built with outputReferences, so an un-applied custom prop
  // reads back as a `var(--…)` reference, not a value — verifying that is
  // meaningless. Detect it and say so plainly instead of reporting false mismatches.
  const unapplied = Object.entries(values)
    .filter(([, v]) => v.startsWith('var('))
    .map(([k]) => k)
  if (unapplied.length) return { ok: false, reason: 'provider-not-applied', unapplied }
  const f = fetchImpl || (typeof fetch !== 'undefined' ? fetch : globalThis.fetch)
  if (typeof f !== 'function') return { ok: false, reason: 'no-fetch' }
  const base = String(origin).replace(/\/+$/, '')
  try {
    const res = await f(`${base}/verify/app`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values }),
    })
    if (!res.ok) {
      let detail = ''
      try {
        const b = await res.json()
        detail = b && b.error ? b.error : ''
      } catch (e) {
        void e
      }
      return { ok: false, reason: 'bridge-error', error: `${res.status}${detail ? ` — ${detail}` : ''}` }
    }
    return await res.json()
  } catch (e) {
    // Bridge not running / network error — never throw into the app.
    return { ok: false, reason: 'bridge-unreachable', error: e && e.message }
  }
}
