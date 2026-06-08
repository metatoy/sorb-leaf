// Runtime shim for the Legacy-React adapter (roadmap §6, Phase 2).
//
// A hardcoded literal in a legacy app (e.g. `background: #0F65EF`) does NOT
// reference a CSS custom property, so `applyTokens` alone can never re-theme it.
// This shim closes that gap NON-DESTRUCTIVELY: at render it finds elements whose
// computed style for a mapped property equals a `raw` value in the legacyMap and
// overrides that element's *inline* style to `var(--<cssVar>, <raw>)`.
//
//   - non-destructive : no source edit; only inline style is set at runtime.
//   - reversible      : `clearLegacyMap(handle)` restores the original inline value.
//   - live-re-themeable: the `var(--cssVar, raw)` re-resolves whenever the token
//                        flips (via `applyTokens`), with `raw` as the fallback.
//
// The decision logic lives in the pure `computeLegacyOverride` so it can be
// unit-tested without a real browser; the DOM walker is a thin wrapper.

/**
 * Map a CSS property name (camelCase from JS style objects, or kebab-case from
 * computed style) to a canonical kebab-case form for comparison.
 * @param {string} prop
 * @returns {string}
 */
export const normalizeProp = (prop) => {
  if (typeof prop !== 'string') return ''
  return prop
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/_/g, '-')
    .toLowerCase()
}

/**
 * Canonicalize a color literal to its `rgb(r, g, b)` / `rgba(r, g, b, a)` form.
 * This is the key to matching an authored hex `raw` (`#0F65EF`) against the
 * *computed* value — browsers (and jsdom) always report computed colors as
 * `rgb()`/`rgba()`, never hex. Handles #rgb / #rrggbb / #rrggbbaa and existing
 * rgb()/rgba() (whitespace-collapsed). Returns null if it isn't a color literal.
 * @param {string} v lowercased, whitespace-collapsed value
 * @returns {string|null}
 */
const canonicalizeColor = (v) => {
  // #rgb, #rrggbb, #rrggbbaa (and #rgba)
  const hex = v.match(/^#([0-9a-f]{3,8})$/)
  if (hex) {
    let h = hex[1]
    if (h.length === 3 || h.length === 4) {
      h = h.split('').map((c) => c + c).join('')
    }
    if (h.length !== 6 && h.length !== 8) return null
    const r = parseInt(h.slice(0, 2), 16)
    const g = parseInt(h.slice(2, 4), 16)
    const b = parseInt(h.slice(4, 6), 16)
    if (h.length === 8) {
      const a = parseInt(h.slice(6, 8), 16) / 255
      // round alpha to 3 dp, strip trailing zeros, to match rgba() printing
      const as = String(Math.round(a * 1000) / 1000)
      return `rgba(${r}, ${g}, ${b}, ${as})`
    }
    return `rgb(${r}, ${g}, ${b})`
  }
  // existing rgb()/rgba() → normalize spacing/commas
  const fn = v.match(/^(rgba?)\(([^)]*)\)$/)
  if (fn) {
    const parts = fn[2].split(',').map((p) => p.trim()).filter((p) => p !== '')
    if (parts.length === 3) return `rgb(${parts[0]}, ${parts[1]}, ${parts[2]})`
    if (parts.length === 4) return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${parts[3]})`
  }
  return null
}

/**
 * Normalize a style *value* so an authored literal (`"#0F65EF"`, `"4"`, `"4px"`)
 * compares equal to its computed-style form. Trims, lowercases, collapses
 * whitespace, canonicalizes colors to `rgb()/rgba()` (so hex `raw` matches the
 * computed `rgb()`), and treats a bare unitless number as its `px` form (covers
 * `borderRadius: 4` → `"4px"`).
 * @param {string|number} value
 * @returns {string}
 */
export const normalizeValue = (value) => {
  if (value == null) return ''
  let v = String(value).trim().toLowerCase()
  if (v === '') return ''

  // collapse internal whitespace (e.g. "rgb( 15 , 101 , 239 )")
  v = v.replace(/\s+/g, ' ')

  // colors → canonical rgb()/rgba() so hex and rgb compare equal
  const color = canonicalizeColor(v)
  if (color) return color

  // bare unitless number → px (React style numbers, `borderRadius: 4`)
  if (/^-?\d*\.?\d+$/.test(v)) v = `${v}px`

  return v
}

/**
 * @typedef {import('./types').LegacyMapRow} LegacyMapRow
 */

/**
 * Index a legacyMap into a `prop → [{ normValue, cssVar, raw }]` lookup so the
 * decision function is O(1)-per-prop instead of scanning the whole array.
 * @param {LegacyMapRow[]} legacyMap
 * @returns {Map<string, Array<{ normValue: string, cssVar: string, raw: string }>>}
 */
export const indexLegacyMap = (legacyMap) => {
  /** @type {Map<string, Array<{ normValue: string, cssVar: string, raw: string }>>} */
  const idx = new Map()
  if (!Array.isArray(legacyMap)) return idx
  for (const row of legacyMap) {
    if (!row || row.cssVar == null || row.raw == null || row.prop == null) continue
    const p = normalizeProp(row.prop)
    const entry = {
      normValue: normalizeValue(row.raw),
      cssVar: String(row.cssVar).replace(/^--/, ''),
      raw: String(row.raw),
    }
    const list = idx.get(p)
    if (list) list.push(entry)
    else idx.set(p, [entry])
  }
  return idx
}

/**
 * PURE decision logic. Given a property, the element's *computed* value for that
 * property, and the legacyMap (array or pre-built index), return the override
 * string `var(--<cssVar>, <raw>)` when the value matches a mapped `raw`, else
 * null. This is the unit-tested core of the shim.
 *
 * @param {string} prop                CSS property (camelCase or kebab-case)
 * @param {string|number} computedValue the element's computed value for `prop`
 * @param {LegacyMapRow[]|Map<string, any[]>} legacyMap  rows, or an index from `indexLegacyMap`
 * @returns {string|null}
 */
export const computeLegacyOverride = (prop, computedValue, legacyMap) => {
  const idx = legacyMap instanceof Map ? legacyMap : indexLegacyMap(legacyMap)
  const list = idx.get(normalizeProp(prop))
  if (!list || list.length === 0) return null
  const target = normalizeValue(computedValue)
  if (target === '') return null
  for (const entry of list) {
    if (entry.normValue === target) {
      return `var(--${entry.cssVar}, ${entry.raw})`
    }
  }
  return null
}

export {}
