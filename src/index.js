export { SorbProvider } from './TokenProvider'

// The framework-free injector (component-compat-roadmap P0) — the same
// entry `@sorb/leaf/core` re-exports for non-React hosts. Re-exported from
// the main entry too so a consumer that only needs `sorbInit` (e.g. to
// drive a preview outside React, or to share one instance across a mixed
// tree) doesn't need the subpath import.
export { sorbInit } from './core'
export { PreviewBanner } from './PreviewBanner'
export { useTokens, useToken, useIsPreview, usePreviewState, useTheme } from './hooks'
export { ThemeToggle } from './ThemeToggle'
export { sanitizeCssValue } from './sanitize'
export { verifyResolved } from './verify'

// Real-dark-mode (spec D3) — the mode-aware <style>-tag stylesheet builder +
// its injector. Exported so the demo/cloud emit side can build/verify the
// same CSS shape SorbProvider injects internally.
export { buildModeStylesheet } from './modeStylesheet'
export { injectModeStylesheet, clearModeStylesheet, MODE_STYLESHEET_ID } from './apply'

// Reference darkMode conventions (real-dark-mode spec P2a) for adapters
// beyond react-bootstrap — Tailwind's `.dark` class + a generic
// `data-theme` attribute. Plain data (not registered TargetAdapters); export
// them so a future Tailwind/data-theme connector (or a consumer building one
// early) can pass one straight into `config.darkModeConvention`.
export { tailwindDarkMode, dataThemeDarkMode } from './darkModeConventions'

// Legacy-React adapter shim (roadmap §6) — the runtime DOM overlay that remaps
// hardcoded literals to `var(--cssVar, raw)` using an adapt-report's `auto`
// rows. `SorbProvider` wires these internally via its `legacyMap` prop; also
// exported for consumers driving the shim directly.
export { applyLegacyMap, clearLegacyMap } from './legacyDom'
export { computeLegacyOverride, indexLegacyMap, normalizeProp, normalizeValue } from './legacyMap'

// Side-effect import: registers the `react-bootstrap` TargetAdapter (the
// default connector — spec/sorb/connectors-architecture.md §3.3/§4 C3) into
// the `@sorb/core` connector registry as soon as `@sorb/leaf` loads. Also
// re-exported for consumers that want to inspect the adapter directly. This
// does NOT change `SorbProvider`'s or `applyTokens`' runtime behavior — both
// still read `expectPrefixes` from `config`, not from the registry.
export { reactBootstrapTarget } from './targets/reactBootstrap'

// Side-effect import: registers the `mantine` TargetAdapter
// (framework-targets-productization T2) into the `@sorb/core` connector
// registry. Same feature-detect posture as react-bootstrap above; also
// re-exported for consumers that want to inspect the adapter directly.
export { mantineTarget } from './targets/mantine'
