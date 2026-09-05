import React from 'react'
import { usePreviewState } from './hooks'
import { previewBannerModel } from './previewBannerModel'

/**
 * Drop-in banner that appears at the bottom of the screen for a Sorb preview.
 *
 * Renders in three states (see `previewBannerModel`):
 *  - blue "active" — a healthy live preview,
 *  - amber "mismatch" — preview active but likely re-skins nothing (B4),
 *  - red "error" — a deliberately-requested `?preview=` couldn't be loaded (it
 *    may belong to a different project). The error state renders even though
 *    `isPreview` is false, since a failed preview falls back to committed
 *    tokens (spec jj-demo-rebind-and-diagnosis D2 — kill the silent-404).
 *
 * Safe to include unconditionally — renders nothing when there's no preview and
 * no preview error.
 *
 * @example
 * // In your app root, after <SorbProvider>
 * <PreviewBanner />
 */
export const PreviewBanner = () => {
  const { isPreview, previewId, previewMismatch, previewError, clearPreview } = usePreviewState()
  const model = previewBannerModel({ isPreview, previewMismatch, previewError, previewId })
  if (!model.visible) return null

  // Colours are token-bindable (`--sorb-preview-warning-*` / `--sorb-preview-error-*`)
  // with fallbacks so a consumer can theme them (e.g. to its own --bs-warning).
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: model.background,
        borderTop: `3px solid ${model.accent}`,
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
        <strong style={{ fontWeight: 600 }}>{model.title}</strong>
        {model.id && (
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
            {model.id}
          </code>
        )}
        <span style={{ marginLeft: '8px', opacity: 0.75, fontSize: '12px' }}>
          {model.message}
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
        {model.buttonLabel}
      </button>
    </div>
  )
}
