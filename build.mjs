import { build, context } from 'esbuild'

// @sorb/leaf ships both ESM and CJS. React stays external so the
// provider has zero bundled runtime deps beyond React itself.
const shared = {
  bundle: true,
  external: ['react'],
  sourcemap: true,
  target: 'es2020',
  jsx: 'automatic',
}

// The main entry (React SDK — SorbProvider/hooks/etc).
const mainBuild = { ...shared, entryPoints: ['src/index.js'] }

// `@sorb/leaf/core` — the framework-free injector (component-compat-roadmap
// P0). Pure JS, no JSX, no React import — bundled as its own entry so a
// non-React host's bundle never pulls React in. `external: ['react']` above
// is a no-op here (core.js doesn't import it) but harmless to share.
const coreBuild = { ...shared, entryPoints: ['src/core.js'] }

const builds = [
  { ...mainBuild, format: 'esm', outfile: 'dist/index.mjs' },
  { ...mainBuild, format: 'cjs', outfile: 'dist/index.js' },
  { ...coreBuild, format: 'esm', outfile: 'dist/core.mjs' },
  { ...coreBuild, format: 'cjs', outfile: 'dist/core.js' },
]

if (process.argv.includes('--watch')) {
  const ctxs = await Promise.all(builds.map((b) => context(b)))
  await Promise.all(ctxs.map((c) => c.watch()))
  console.log('@sorb/leaf — watching for changes...')
} else {
  await Promise.all(builds.map((b) => build(b)))
  console.log('@sorb/leaf — built dist/index.{js,mjs} + dist/core.{js,mjs}')
}
