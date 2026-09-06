# @sorb/leaf

Sorb™'s React SDK — live-preview proposed tokens as CSS custom properties in
your running app. (Leaf: the foliage rendered in your app.)

Ships in your app bundle. One runtime dependency (`@sorb/core`) and one peer
dependency (`react@^18`) — React is only needed for the components and hooks;
`sorbInit`, the sanitizer, the legacy map, and the target adapters all run
without it.

Full docs: **[sorbcloud.com/docs/packages/leaf](https://www.sorbcloud.com/docs/packages/leaf)**
(reference) and **[sorbcloud.com/docs/react-sdk](https://www.sorbcloud.com/docs/react-sdk)**
(step-by-step setup guide).

```bash
npm install @sorb/leaf
```

## Wrap your app

`SorbProvider` takes one required prop, `config`. It applies your committed
token values as CSS custom properties on `document.documentElement`, and
swaps them for a proposed set while a preview is active. Import the generated
`variables.css` too — the provider overrides those variables, it does not
create them.

```jsx
import React from "react";
import { createRoot } from "react-dom/client";
import { SorbProvider, PreviewBanner } from "@sorb/leaf";
import { tokens } from "./src/tokens/generated/tokens";
import "./src/tokens/generated/variables.css";
import { App } from "./src/App";

const sorbConfig = {
  namespace: "my-app",
  tokens,
  preview: {
    enabled: import.meta.env.MODE !== "production",
    origin: "http://localhost:7777",
    pollInterval: 1500,
    expectPrefixes: ["bs-"],
  },
};

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <SorbProvider config={sorbConfig}>
      <App />
      <PreviewBanner />
    </SorbProvider>
  </React.StrictMode>,
);
```

Rendering `SorbProvider` without `config` throws
`Cannot read properties of undefined (reading 'tokens')` at mount.
`PreviewBanner` is safe to render unconditionally — it renders nothing when
there is no preview, and otherwise shows blue (preview live), amber (loaded
but matched none of your `expectPrefixes`), or red (a requested `?preview=`
could not be loaded — falls back to committed tokens, so production is never
broken).

## The 30 exports, in eight groups

Most apps only ever touch the first group. Full descriptions, signatures, and
typedefs for every export: **[the reference page](https://www.sorbcloud.com/docs/packages/leaf)**.

| Group | Exports | You need it when |
|---|---|---|
| Provider, hooks, banner | `SorbProvider`, `useTokens`, `useToken`, `useIsPreview`, `usePreviewState`, `PreviewBanner` | You have a React app. This is the whole setup. |
| Framework-free | `sorbInit` | You are not on React, or you drive Sorb from a plain script. |
| Dark mode | `useTheme`, `ThemeToggle`, `buildModeStylesheet`, `injectModeStylesheet`, `clearModeStylesheet`, `MODE_STYLESHEET_ID`, `tailwindDarkMode`, `dataThemeDarkMode` | Your token set ships light and dark values. |
| Target adapters | `reactBootstrapTarget`, `mantineTarget`, `tailwindV4Target`, `shadcnTarget`, `primevueTarget`, `muiTarget`, `angularMaterialTarget` | You want to see which UI kit a build targets, or register your own. |
| Legacy map | `applyLegacyMap`, `clearLegacyMap`, `computeLegacyOverride`, `indexLegacyMap`, `normalizeProp`, `normalizeValue` | Your app has hardcoded literals you have not tokenized yet. |
| Security | `sanitizeCssValue` | You inject token values yourself instead of through the provider. |
| Verification | `verifyResolved` | You want to assert the running DOM matches the committed resolved map. |
| Diagnostics | *(config only — `diagnostics.allowedOrigins`)* | You are debugging which project an app is bound to. |

Read the active values with the hooks:

```jsx
import { useToken, useTokens, useIsPreview, usePreviewState } from "@sorb/leaf";

function Swatch() {
  const primary = useToken("color-primary"); // → '#3B5BDB'
  const all = useTokens(); // the whole active TokenSet
  const isPreview = useIsPreview();
  const { previewId, previewMismatch, previewError, clearPreview } = usePreviewState();
  return <div style={{ background: primary }}>{isPreview ? previewId : "committed"}</div>;
}
```

All five hooks must be called inside a mounted `SorbProvider`.

## Framework-free: `sorbInit`

`sorbInit(config)` is the same runtime without React — connection resolution,
committed and preview loading, mode-aware injection, polling or SSE. It
returns a small store, so you can drive it from a plain module script, a Vue
or Svelte app, or a legacy page.

```html
<script type="module">
  import { sorbInit } from "@sorb/leaf";
  import { tokens } from "./tokens/generated/tokens.js";

  const sorb = sorbInit({
    namespace: "my-app",
    tokens,
    preview: { enabled: true, origin: "http://localhost:7777" },
  });

  sorb.subscribe(() => {
    const { isPreview, previewId } = sorb.getState();
    document.title = isPreview ? `preview ${previewId}` : "my app";
  });
</script>
```

`SorbProvider` is a thin React shell over exactly this object, so the DOM
behavior is identical either way.

## Dark mode

Dark mode activates when your config carries a `darkTokens` set alongside
`tokens`. Without `darkTokens`, `setMode` still works but has nothing to
switch.

```jsx
import { SorbProvider, ThemeToggle, useTheme } from "@sorb/leaf";
import { tokens } from "./tokens/generated/tokens";
import { tokens as darkTokens } from "./tokens/generated/tokens.dark";

const config = { namespace: "my-app", tokens, darkTokens };

function Header() {
  const { mode, setMode, resolvedScheme } = useTheme();
  // mode: 'auto' | 'light' | 'dark' — the manual selection
  // resolvedScheme: 'light' | 'dark' — what is actually on screen right now
  return <ThemeToggle />;
}
```

The convention used to express dark mode defaults to the `react-bootstrap`
adapter's `data-bs-theme` attribute. Override it with `darkModeConvention`
for a different kit — `tailwindDarkMode` is Tailwind's `.dark` class,
`dataThemeDarkMode` is the generic `[data-theme]` attribute.

## Target adapters

Importing `@sorb/leaf` registers seven `TargetAdapter` records into the
`@sorb/core` connector registry as a side effect — each names the Style
Dictionary format a build should emit for that UI kit, the custom-property
prefixes the vocabulary guard expects, and the kit's dark-mode convention.

| Export | Connector id | Emits | Dark mode |
|---|---|---|---|
| `reactBootstrapTarget` | `react-bootstrap` | `sorb/tokenset-esm` | `data-bs-theme` |
| `mantineTarget` | `mantine` | `sorb/mantine-vars` | Mantine color scheme |
| `tailwindV4Target` | `tailwind-v4` | `sorb/tailwind-theme` | `.dark` class |
| `shadcnTarget` | `shadcn` | `sorb/shadcn-theme` | `.dark` class |
| `primevueTarget` | `primevue` | `sorb/primevue-preset` | PrimeVue preset |
| `muiTarget` | `mui` | `sorb/mui-vars` | MUI color scheme |
| `angularMaterialTarget` | `angular-material` | `sorb/mat-sys-vars` | `--mat-sys-*` |

```js
import { mantineTarget } from "@sorb/leaf";
import { getTarget } from "@sorb/core";

console.log(mantineTarget.expectPrefixes); // feed into config.preview.expectPrefixes
console.log(getTarget("tailwind-v4"));     // same record, from the registry
```

The registry itself — `registerTarget`, `getTarget`, `resolveConnectorIds` —
lives in [`@sorb/core`](https://www.sorbcloud.com/docs/packages/core).

## Legacy map

An app that still has hardcoded colors can be re-skinned before it is
tokenized. `sorb-seed adapt` writes `.sorb/adapt-report.json`; its `auto` rows
are a legacy map. Pass them to the provider and every element whose computed
value equals a row's `raw` gets an inline `var(--<cssVar>, <raw>)` override —
additive, and restored on unmount.

```jsx
import report from "./.sorb/adapt-report.json";

const legacyMap = report.rows.filter((r) => r.status === "auto");

<SorbProvider config={sorbConfig} legacyMap={legacyMap}>
  <App />
</SorbProvider>;
```

Drive it yourself outside React with `applyLegacyMap(root, legacyMap)` and
`clearLegacyMap(handle)`. `computeLegacyOverride`, `indexLegacyMap`,
`normalizeProp` and `normalizeValue` are the pure decision helpers underneath.

## Security

Sorb injects externally-authored token values into your running app, so the
SDK treats every value and preview origin as untrusted input.

- **Value sanitization.** Every token value goes through `sanitizeCssValue`
  before it's written to `:root`. It's deny-by-default: it rejects control
  characters, the context-break characters `{`, `}` and `;`, `@import`,
  `javascript:` and `</`, and any CSS function outside its allowlist — which
  is what stops `url(`, `image-set(` and `expression(`.

  ```js
  import { sanitizeCssValue } from "@sorb/leaf";

  sanitizeCssValue("#f26722"); // { ok: true, value: '#f26722' }
  sanitizeCssValue("url(https://evil.example/x.png)"); // { ok: false, reason: ... }
  ```

- **Preview is off by default and origin-allowlisted.** `?preview=` is
  honored only when `preview.enabled === true` **and** the resolved
  `preview.origin` is localhost / `127.0.0.1` / `[::1]` (any port) or is
  listed in `preview.allowedOrigins`. **Never enable preview in production
  against an untrusted bridge origin.**

  ```jsx
  preview: {
    enabled: import.meta.env.MODE !== 'production',
    origin: 'http://localhost:7777',
    allowedOrigins: ['https://your-self-hosted-bridge.example.com'],
  }
  ```

`preview.expectPrefixes` is a third guard, not a security one: it declares
the custom-property vocabulary your app actually reads, so a preview that
would change nothing is flagged instead of failing silently.

## Verification

`verifyResolved` reads each token's value back off `:root` and asks the
bridge whether the running app matches the committed resolved map.

```js
import { verifyResolved } from "@sorb/leaf";

const result = await verifyResolved(["button-primary-bg-default"], {
  origin: "http://localhost:7777",
});
// { ok: true, checked: 1, matched: 1 }
```

Call it from inside a mounted provider. Without one, custom properties read
back as unresolved `var(...)` references and the result is
`{ ok: false, reason: 'provider-not-applied' }` rather than a misleading
mismatch. Omit `key` for the local bridge; pass `config.preview.key` for a
hosted one.

## Diagnostics

The SDK answers a `sorb-ping` `postMessage` with a `sorb-hello` fingerprint —
namespace, the last four characters of the key, the SDK version, the bridge
origin, and the outcome of the last preview attempt. It never posts
unsolicited, it replies only to the exact origin that pinged, and it never
sends a full key. Only allowlisted origins get an answer — the Sorb Cloud
dashboard is allowlisted by default; extend the list for a self-hosted one:

```js
const config = {
  namespace: "my-app",
  tokens,
  diagnostics: { allowedOrigins: ["https://dashboard.example.com"] },
};
```

Nothing about authorization, entitlement or routing may be derived from a
`sorb-hello`. It exists so you can tell which project an app is bound to when
a preview does not appear.

## Failure semantics

`usePreviewState()` (or `sorbInit(...).getState()`) exposes `previewError`:
`{ id, outcome }` where `outcome` is `'not_found'` (the id was expired,
consumed, or wrong), `'unauthorized'` (your key doesn't cover this preview),
or `'network'` (the bridge is unreachable). The banner's error state renders
even when `isPreview` is `false`, because a failed preview falls back to
committed tokens rather than blocking the app. See
[Troubleshooting](https://www.sorbcloud.com/docs/troubleshooting) for what
each outcome means and how to fix it.

---

## Related packages

- [`@sorb/core`](https://www.sorbcloud.com/docs/packages/core) — the shared contract; the connector registry this package registers into
- [`@sorb/seed`](https://www.sorbcloud.com/docs/packages/seed) — builds the resolved map and the legacy-map adapt report
- [`@sorb/juice`](https://www.sorbcloud.com/docs/packages/juice) — the bridge server this SDK talks to

Full docs: [sorbcloud.com/docs/packages/leaf](https://www.sorbcloud.com/docs/packages/leaf)
(reference) · [sorbcloud.com/docs/react-sdk](https://www.sorbcloud.com/docs/react-sdk) (guide).

**Sorb™** is a trademark of Metatoy LLC.
