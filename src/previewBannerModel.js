// previewBannerModel.js — the pure view-model behind <PreviewBanner>.
// (Named `…Model` not `previewBanner` to avoid a case-collision with
// `PreviewBanner.jsx` on case-insensitive filesystems.)
//
// Extracted so the banner's decision logic (which of the three states to show,
// and critically that the RED error state renders even when `isPreview` is
// false) is node:test-able without a React renderer — `@sorb/leaf`'s test
// harness has no react-dom. `PreviewBanner.jsx` is a thin presentational shell
// over this.

/**
 * @typedef {Object} PreviewBannerModel
 * @property {boolean} visible          Render the banner at all?
 * @property {'active'|'mismatch'|'error'} [variant]
 * @property {string|null} [id]         The preview id to show in the chip.
 * @property {string} [title]           Bold headline.
 * @property {string} [message]         Secondary explanatory line.
 * @property {string} [buttonLabel]     Action-button label.
 * @property {string} [background]      Banner background (token-bindable var()).
 * @property {string} [accent]          Top-border accent colour.
 */

/**
 * Derive the banner's view-model from preview state.
 *
 * Three states, in priority order:
 *  - `error`    — a deliberately-requested `?preview=` fetch failed; we fell
 *                 back to committed tokens so `isPreview` is FALSE, but the red
 *                 banner still renders (spec D2 — kill the silent-404).
 *  - `mismatch` — preview active but its tokens matched none of the app's
 *                 `expectPrefixes` (amber; B4).
 *  - `active`   — a healthy live preview (blue).
 *
 * @param {{ isPreview: boolean, previewMismatch?: boolean, previewError?: ({ id: string, outcome: string }|null), previewId?: (string|null) }} state
 * @returns {PreviewBannerModel}
 */
export const previewBannerModel = ({ isPreview, previewMismatch, previewError, previewId }) => {
  // The error banner MUST survive `!isPreview` (failed preview → silent commit
  // fallback). Only hide when there is neither a live preview nor an error.
  if (!isPreview && !previewError) return { visible: false }

  const variant = previewError ? 'error' : previewMismatch ? 'mismatch' : 'active'
  const id = (previewError ? previewError.id : previewId) || null

  if (variant === 'error') {
    return {
      visible: true,
      variant,
      id,
      title: 'Sorb preview unavailable',
      message: 'Not available to this app — it may belong to another project',
      buttonLabel: 'Dismiss',
      background: 'var(--sorb-preview-error-bg, #B42318)',
      accent: 'var(--sorb-preview-error-accent, #F04438)',
    }
  }
  if (variant === 'mismatch') {
    return {
      visible: true,
      variant,
      id,
      title: 'Sorb preview active — may not re-skin',
      message: 'No matching tokens for this app — colours may be unchanged',
      buttonLabel: 'Exit preview',
      background: 'var(--sorb-preview-warning-bg, #B54708)',
      accent: 'var(--sorb-preview-warning-accent, #F59E0B)',
    }
  }
  return {
    visible: true,
    variant,
    id,
    title: 'Sorb preview active',
    message: 'Token changes from Figma are live',
    buttonLabel: 'Exit preview',
    background: '#3B5BDB',
    accent: 'transparent',
  }
}
