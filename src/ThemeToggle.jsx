import React from 'react'
import { useTheme } from './hooks'

const OPTIONS = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'auto', label: 'Auto' },
]

/**
 * Drop-in Light / Dark / Auto mode toggle (real-dark-mode spec D3).
 *
 * Purely a thin `useTheme()` view — three buttons that call `setMode`, with
 * the active one highlighted. Renders unconditionally (safe even in a
 * single-mode app, where `setMode` still works but has nothing to visibly
 * toggle since there's no injected dark stylesheet).
 *
 * Unstyled beyond minimal inline layout — bring your own CSS/className to
 * match your app, same philosophy as `PreviewBanner`.
 *
 * @param {{ className?: string }} [props]
 * @example
 * // In your app root, alongside <PreviewBanner>
 * <ThemeToggle />
 */
export const ThemeToggle = ({ className } = {}) => {
  const { mode, setMode } = useTheme()

  return (
    <div
      role="radiogroup"
      aria-label="Color mode"
      className={className}
      style={{
        display: 'inline-flex',
        gap: '4px',
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        fontSize: '13px',
      }}
    >
      {OPTIONS.map(({ value, label }) => {
        const active = mode === value
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setMode(value)}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              border: '1px solid rgba(0,0,0,0.15)',
              background: active ? 'var(--sorb-theme-toggle-active-bg, #3B5BDB)' : 'transparent',
              color: active ? '#fff' : 'inherit',
              cursor: 'pointer',
              fontWeight: active ? 600 : 400,
            }}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
