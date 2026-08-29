export { SorbProvider } from './TokenProvider'
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

// Side-effect import: registers the `react-bootstrap` TargetAdapter (the
// default connector — spec/sorb/connectors-architecture.md §3.3/§4 C3) into
// the `@sorb/core` connector registry as soon as `@sorb/leaf` loads. Also
// re-exported for consumers that want to inspect the adapter directly. This
// does NOT change `SorbProvider`'s or `applyTokens`' runtime behavior — both
// still read `expectPrefixes` from `config`, not from the registry.
export { reactBootstrapTarget } from './targets/reactBootstrap'
