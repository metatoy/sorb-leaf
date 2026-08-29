/**
 * Reference `darkMode` conventions (real-dark-mode spec P2a) for
 * TargetAdapters beyond `react-bootstrap`. The connectors roadmap builds the
 * full adapters (Tailwind, a generic `data-theme` host, …) later — this file
 * only defines the *convention* shape so `buildModeStylesheet`
 * (`modeStylesheet.js`) and `SorbProvider`'s `setMode` (`TokenProvider.jsx`)
 * already know how to drive them once those adapters land and pass one of
 * these (or an equivalent) as `config.darkModeConvention` /
 * `TargetAdapter.darkMode`.
 *
 * Not wired into the `@sorb/core` connector registry — these are plain data,
 * exported for adapters to import/spread, not registered TargetAdapters
 * themselves (this repo owns react-bootstrap's registration only).
 */

/**
 * Tailwind's `darkMode: 'class'` convention — a `.dark` class toggled on
 * `documentElement` (typically `<html>`). Tailwind has no canonical "light"
 * class (light is just the absence of `.dark`), so `lightSelector` is
 * omitted: a manual "light" choice cannot out-rank an OS dark preference
 * under this convention (see `modeAction.js`'s `resolveModeAction`) — a
 * known limitation of class-only theming without a light marker.
 *
 * @type {import('@sorb/core').DarkModeConvention}
 */
export const tailwindDarkMode = {
  strategy: 'class',
  darkSelector: '.dark',
}

/**
 * A generic `[data-theme="..."]` attribute convention — the same shape as
 * `react-bootstrap`'s `data-bs-theme` but under the more common
 * `data-theme` attribute name, for hosts that don't use Bootstrap's specific
 * convention.
 *
 * @type {import('@sorb/core').DarkModeConvention}
 */
export const dataThemeDarkMode = {
  strategy: 'attribute',
  attribute: 'data-theme',
  darkSelector: '[data-theme="dark"]',
  lightSelector: '[data-theme="light"]',
}
