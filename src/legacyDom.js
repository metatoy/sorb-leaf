// DOM-applying wrapper for the legacy-map shim. Thin by design: all matching
// decisions defer to `computeLegacyOverride` (pure, in legacyMap.js); this file
// only walks the tree, reads computed style, and writes/restores inline styles.

import { computeLegacyOverride, indexLegacyMap, normalizeProp } from './legacyMap.js'

/**
 * @typedef {import('./types').LegacyMapRow} LegacyMapRow
 * @typedef {import('./types').LegacyMapHandle} LegacyMapHandle
 */

/**
 * Walk `root` (and its descendants), and for every element whose computed value
 * for a mapped property equals a `raw` in the legacyMap, override that element's
 * INLINE style for that property to `var(--<cssVar>, <raw>)`. Returns a handle
 * that `clearLegacyMap` uses to restore the original inline values.
 *
 * Non-destructive: only inline `element.style[prop]` is touched, and the prior
 * inline value (often empty) is captured so it can be restored exactly.
 *
 * @param {Element|Document|null} [root=document.body]  subtree to remap
 * @param {LegacyMapRow[]} legacyMap                    the report's `auto` rows
 * @returns {LegacyMapHandle}
 */
export const applyLegacyMap = (root, legacyMap) => {
  /** @type {Array<{ el: HTMLElement, prop: string, prev: string }>} */
  const restores = []
  const handle = { restores }

  if (typeof document === 'undefined') return handle
  const start = root ?? document.body
  if (!start || !Array.isArray(legacyMap) || legacyMap.length === 0) return handle

  const idx = indexLegacyMap(legacyMap)
  if (idx.size === 0) return handle

  // Properties we care about, kebab-cased — used both to read computed style and
  // to write inline style (kebab works with CSSStyleDeclaration.setProperty).
  const props = Array.from(idx.keys())

  const getView = () => {
    const doc = start.ownerDocument || (start.nodeType === 9 ? start : document)
    return (doc.defaultView || (typeof window !== 'undefined' ? window : null))
  }
  const view = getView()
  if (!view || typeof view.getComputedStyle !== 'function') return handle

  /** @param {Element} el */
  const visit = (el) => {
    if (!el || el.nodeType !== 1) return
    const cs = view.getComputedStyle(el)
    for (const prop of props) {
      const computed = cs.getPropertyValue(prop)
      const override = computeLegacyOverride(prop, computed, idx)
      if (override == null) continue
      // capture prior inline value (kebab-safe) so restore is exact
      const prev = el.style.getPropertyValue(prop)
      restores.push({ el: /** @type {HTMLElement} */ (el), prop, prev })
      el.style.setProperty(prop, override)
    }
  }

  // include `start` itself if it's an element, plus all descendant elements
  if (start.nodeType === 1) visit(/** @type {Element} */ (start))
  const all = start.querySelectorAll ? start.querySelectorAll('*') : []
  for (const el of all) visit(el)

  return handle
}

/**
 * Restore every inline style override recorded by `applyLegacyMap`, returning
 * each element to its original (usually empty) inline value.
 * @param {LegacyMapHandle|null} handle
 * @returns {void}
 */
export const clearLegacyMap = (handle) => {
  if (!handle || !Array.isArray(handle.restores)) return
  for (const { el, prop, prev } of handle.restores) {
    if (!el || !el.style) continue
    if (prev === '' || prev == null) el.style.removeProperty(prop)
    else el.style.setProperty(prop, prev)
  }
  handle.restores = []
}

export { normalizeProp }
