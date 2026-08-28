export { SorbProvider } from './TokenProvider'
export { PreviewBanner } from './PreviewBanner'
export { useTokens, useToken, useIsPreview, usePreviewState } from './hooks'
export { sanitizeCssValue } from './sanitize'
export { verifyResolved } from './verify'

// Side-effect import: registers the `react-bootstrap` TargetAdapter (the
// default connector — spec/sorb/connectors-architecture.md §3.3/§4 C3) into
// the `@sorb/core` connector registry as soon as `@sorb/leaf` loads. Also
// re-exported for consumers that want to inspect the adapter directly. This
// does NOT change `SorbProvider`'s or `applyTokens`' runtime behavior — both
// still read `expectPrefixes` from `config`, not from the registry.
export { reactBootstrapTarget } from './targets/reactBootstrap'
