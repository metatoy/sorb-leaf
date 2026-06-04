# @sorb/leaf

React provider for [Sorb](https://github.com/nhunsaker/sorb) design
tokens. Ships in your app bundle — zero runtime dependencies beyond React.

```bash
npm install @sorb/leaf
```

## Usage

```jsx
import { SorbProvider, PreviewBanner } from '@sorb/leaf'
import { tokens } from './tokens/generated/tokens'

const config = {
  namespace: 'my-app',
  tokens,
  preview: {
    enabled: import.meta.env.MODE !== 'production',
    origin: 'http://localhost:7777',
  },
}

<SorbProvider config={config}>
  <App />
  <PreviewBanner />   {/* renders nothing in production */}
</SorbProvider>
```

> `tokens` is your committed token set — a flat `name → value` object you
> provide (e.g. `src/tokens/generated/tokens.js` exporting
> `export const tokens = { 'color-primary': '#3B5BDB', … }`). It's bundled
> at build time and used in production. See the
> [main README](https://github.com/nhunsaker/sorb#readme) for generating
> it with Style Dictionary.

When the app is opened with `?preview=<id>`, the provider fetches the
proposed token set from the local Sorb server, applies it as CSS custom
properties on `:root`, and polls for live updates. If the server isn't
running it falls back silently to the committed tokens — preview never
breaks production.

## Hooks

```jsx
import { useToken, useTokens, useIsPreview, usePreviewState } from '@sorb/leaf'

const primary = useToken('color-primary')          // single token value
const tokens = useTokens()                          // full active token set
const isPreviewing = useIsPreview()                 // boolean
const { isPreview, previewId, clearPreview } = usePreviewState()
```

See the [main README](https://github.com/nhunsaker/sorb#readme) for the
full workflow.
