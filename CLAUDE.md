# CLAUDE.md — sorb-leaf

Part of the **Sorb** polyrepo under the **Metatoy** org (local base
`workspace/metatoy/`). Siblings: `sorb-core`, `sorb-seed`, `sorb-juice`,
`sorb-canopy`, `sorb-demo`, `sorb-cloud`.

## What this is

`@metatoy/sorb-leaf` — the React SDK: `SorbProvider`, `PreviewBanner`, and the
token hooks. The foliage rendered in your running app (dev-side view; the Figma
view is `sorb-canopy`). Consumes tokens via CSS custom properties
(`var(--token, fallback)`) and live previews from the `sorb-juice` bridge.

## Hard rules

- **JavaScript only — never TypeScript.** JSDoc typedefs in `src/types.js`; shared
  contract shapes come from `@metatoy/sorb-core`.
- **Build = esbuild** (`build.mjs`) → `dist/` (gitignored). Never add `tsup`/`.ts`.
- **Per-repo lockfile is correct** (polyrepo).
- **Public API name is `SorbProvider`** (was `FigtreeProvider`). Renaming the
  export is a breaking change for consumers — flag it.
- **Commit/push only when asked.** If on the default branch, branch first.
