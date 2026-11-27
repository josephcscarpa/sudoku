const TOAST_LIFETIME_MS = 4200

export type ToastTone = 'error' | 'success'

function getToastRegion(): HTMLDivElement {
  const existing = document.querySelector<HTMLDivElement>('[data-error-toast-region]')
  if (existing) return existing

  const region = document.createElement('div')
  region.dataset.errorToastRegion = 'true'
  region.setAttribute('role', 'region')
  region.setAttribute('aria-label', 'Game messages')
  Object.assign(region.style, {
    position: 'fixed',
    right: '20px',
    bottom: '20px',
    zIndex: '10000',
    display: 'grid',
    gap: '10px',
    width: 'min(360px, calc(100vw - 40px))',
    pointerEvents: 'none',
  })
  document.body.append(region)
  return region
}

export function showGameToast(
  message: string,
  tone: ToastTone,
): () => void {
  if (typeof document === 'undefined') return () => undefined

  const toast = document.createElement('div')
  toast.dataset.toastTone = tone
  toast.setAttribute('role', tone === 'error' ? 'alert' : 'status')
  toast.textContent = message
  const palette =
    tone === 'success'
      ? { border: '#3f7d44', background: '#286238' }
      : { border: '#b42318', background: '#7a271a' }
  Object.assign(toast.style, {
    padding: '12px 14px',
    border: `1px solid ${palette.border}`,
    borderRadius: '8px',
    background: palette.background,
    color: '#fff',
    boxShadow: '0 12px 30px rgba(16, 24, 40, 0.24)',
    fontSize: '0.9rem',
    fontWeight: '650',
    lineHeight: '1.35',
    pointerEvents: 'auto',
  })

  const region = getToastRegion()
  region.append(toast)
  const dismiss = () => {
    window.clearTimeout(timeout)
    toast.remove()
    if (region.childElementCount === 0) region.remove()
  }
  const timeout = window.setTimeout(dismiss, TOAST_LIFETIME_MS)
  return dismiss
}

export function showErrorToast(message: string): () => void {
  return showGameToast(message, 'error')
}
