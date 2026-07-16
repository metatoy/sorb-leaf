# @sorb/leaf

React SDK for Sorb™, the design-token bridge for your running app — live-preview
proposed tokens as CSS custom properties. (Leaf: the foliage in your app.)

Ships in your app bundle — zero runtime dependencies beyond React.

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

## Security

Sorb injects externally-authored token values into your running app, so the
SDK treats every value and preview origin as untrusted input.

- **Value sanitization.** Every token value is validated before it is written
  to `:root`. Values containing `url(...)`, `image-set(...)`, `expression(...)`,
  `@import`, `javascript:`, raw `;`/`{`/`}`, or any non-allowlisted CSS function
  are **skipped** (the rest still apply). This neutralizes CSS-exfil and
  defacement via a hostile token. The check is exported as `sanitizeCssValue`.
- **Preview is off by default and origin-allowlisted.** `?preview=` is honored
  only when `preview.enabled === true` **and** the resolved `preview.origin` is
  localhost / `127.0.0.1` / `[::1]` (any port) or is listed in
  `preview.allowedOrigins`. A stray `?preview=` on a production deploy against an
  untrusted bridge is ignored. **Never enable preview in production against an
  untrusted bridge origin.**

```jsx
preview: {
  enabled: import.meta.env.MODE !== 'production',
  origin: 'http://localhost:7777',
  // optional: trust an additional exact origin (e.g. a staging bridge)
  allowedOrigins: ['https://staging-bridge.example.com'],
}
```

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

---

**Sorb™** is a trademark of Metatoy LLC.
