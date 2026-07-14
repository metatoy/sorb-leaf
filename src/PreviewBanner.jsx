import React from 'react'
import { usePreviewState } from './hooks'

/**
 * Drop-in banner that appears at the bottom of the screen when a
 * Sorb preview is active. Includes an "Exit preview" button.
 *
 * Only renders when preview.enabled is true AND a preview is loaded.
 * Safe to include unconditionally — renders nothing in production.
 *
 * @example
 * // In your app root, after <SorbProvider>
 * <PreviewBanner />
 */
export const PreviewBanner = () => {
  const { isPreview, previewId, previewMismatch, clearPreview } = usePreviewState()
  if (!isPreview) return null

  // B4: on a vocabulary mismatch the preview is active but likely re-skins
  // nothing — warn the viewer instead of showing a normal "live" banner. The
  // warning colours are token-bindable (`--sorb-preview-warning-*`) with amber
  // fallbacks so a consumer can theme them (e.g. to its own --bs-warning).
  const background = previewMismatch
    ? 'var(--sorb-preview-warning-bg, #B54708)'
    : '#3B5BDB'
  const accent = previewMismatch
    ? 'var(--sorb-preview-warning-accent, #F59E0B)'
    : 'transparent'

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background,
        borderTop: `3px solid ${accent}`,
        color: '#fff',
        padding: '10px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        fontSize: '13px',
        lineHeight: '1.4',
        zIndex: 99999,
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        boxShadow: '0 -2px 12px rgba(0,0,0,0.15)',
      }}
    >
      <span>
        <strong style={{ fontWeight: 600 }}>
          {previewMismatch ? 'Sorb preview active — may not re-skin' : 'Sorb preview active'}
        </strong>
        {previewId && (
          <code
            style={{
              marginLeft: '8px',
              opacity: 0.75,
              fontSize: '11px',
              background: 'rgba(255,255,255,0.15)',
              padding: '2px 6px',
              borderRadius: '4px',
            }}
          >
            {previewId}
          </code>
        )}
        <span style={{ marginLeft: '8px', opacity: 0.75, fontSize: '12px' }}>
          {previewMismatch
            ? 'No matching tokens for this app — colours may be unchanged'
            : 'Token changes from Figma are live'}
        </span>
      </span>
      <button
        onClick={clearPreview}
        style={{
          flexShrink: 0,
          background: 'rgba(255,255,255,0.2)',
          border: '1px solid rgba(255,255,255,0.3)',
          color: '#fff',
          padding: '5px 14px',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 500,
          transition: 'background 0.15s',
        }}
        onMouseEnter={(e) =>
          (e.target.style.background = 'rgba(255,255,255,0.3)')
        }
        onMouseLeave={(e) =>
          (e.target.style.background = 'rgba(255,255,255,0.2)')
        }
      >
        Exit preview
      </button>
    </div>
  )
}
