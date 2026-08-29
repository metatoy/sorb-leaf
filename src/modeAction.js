/**
 * Pure (no-DOM) resolution of what `setMode` (`TokenProvider.jsx`) should do
 * to the document for a given `darkMode` convention + requested mode — P2a
 * multi-framework `setMode` support. Kept separate from `TokenProvider.jsx`
 * (which owns the actual DOM writes) so the strategy dispatch is
 * unit-testable without a DOM stub or a React render harness.
 */

/**
 * Derives the class name a `strategy: 'class'` convention's `darkSelector`
 * names (e.g. `'.dark'` → `'dark'`). Falls back to `'dark'` if the selector
 * isn't a bare single-class selector (defensive; every shipped convention
 * names one).
 * @param {import('@sorb/core').DarkModeConvention | undefined} darkModeConvention
 * @returns {string}
 */
export const darkClassName = (darkModeConvention) => {
  const selector = String(darkModeConvention?.darkSelector || '').trim()
  const match = /^\.([a-zA-Z0-9_-]+)$/.exec(selector)
  return match ? match[1] : 'dark'
}

/**
 * @typedef {{ type: 'none' }} NoneAction
 * @typedef {{ type: 'attr-set', attribute: string, value: 'light'|'dark' }} AttrSetAction
 * @typedef {{ type: 'attr-remove', attribute: string }} AttrRemoveAction
 * @typedef {{ type: 'class-add', className: string }} ClassAddAction
 * @typedef {{ type: 'class-remove', className: string }} ClassRemoveAction
 */

/**
 * Resolves the DOM action `setMode(next)` should perform for the given
 * convention, without touching the DOM.
 *
 * - `strategy: 'media'` ⇒ `{ type: 'none' }` — pure OS, no manual override.
 * - `strategy: 'class'` ⇒ `next === 'dark'` adds the class; `'light'` AND
 *   `'auto'` both remove it (no separate "light" class in e.g. Tailwind's
 *   convention).
 * - `strategy: 'attribute'` (default, incl. undefined convention) ⇒
 *   `next === 'auto'` removes the attribute (media governs); `'light'`/
 *   `'dark'` set it.
 *
 * @param {import('@sorb/core').DarkModeConvention | undefined} darkModeConvention
 * @param {'auto'|'light'|'dark'} next
 * @returns {NoneAction | AttrSetAction | AttrRemoveAction | ClassAddAction | ClassRemoveAction}
 */
export const resolveModeAction = (darkModeConvention, next) => {
  const strategy = darkModeConvention?.strategy || 'attribute'

  if (strategy === 'media') {
    return { type: 'none' }
  }

  if (strategy === 'class') {
    const className = darkClassName(darkModeConvention)
    return next === 'dark' ? { type: 'class-add', className } : { type: 'class-remove', className }
  }

  const attribute = darkModeConvention?.attribute || 'data-bs-theme'
  return next === 'auto' ? { type: 'attr-remove', attribute } : { type: 'attr-set', attribute, value: next }
}
