import { useEffect, useState, useCallback, useRef } from 'react'
import { X, Download } from 'lucide-react'

const STORAGE_KEY = 'install-banner-dismissed-v2'

/**
 * Kecil-kecil banner install PWA.
 * - Kalo udah diinstal (standalone mode) → ga muncul
 * - Kalo udah pernah dismiss → ga muncul
 * - Android/Chrome pake beforeinstallprompt → tombol Install beneran
 * - iOS Safari → cuma instruksi singkat, ga ada tombol
 * - Muncul 2 detik setelah load biar ga kaget
 */
export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [visible, setVisible] = useState(false)
  const [show, setShow] = useState(false)
  const dismissed = localStorage.getItem(STORAGE_KEY) === 'true'
  const timerRef = useRef(null)

  useEffect(() => {
    // Cek apakah udah diinstall (standalone)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone

    if (isStandalone || dismissed) {
      setVisible(false)
      return
    }

    // Delay 2 detik biar ga langsung muncul
    timerRef.current = setTimeout(() => setVisible(true), 2000)

    // Tangkap beforeinstallprompt (Android/Chrome desktop)
    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)

    return () => {
      clearTimeout(timerRef.current)
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [dismissed])

  useEffect(() => {
    if (visible) {
      // trigger CSS transition
      requestAnimationFrame(() => setShow(true))
    } else {
      setShow(false)
    }
  }, [visible])

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const result = await deferredPrompt.userChoice
    if (result.outcome === 'accepted') {
      setDeferredPrompt(null)
      setVisible(false)
      localStorage.setItem(STORAGE_KEY, 'true')
    }
  }, [deferredPrompt])

  const handleDismiss = useCallback(() => {
    setVisible(false)
    localStorage.setItem(STORAGE_KEY, 'true')
  }, [])

  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !window.MSStream

  // Pake beforeinstallprompt (Android/Chrome) atau iOS
  const hasPrompt = !!deferredPrompt
  const isDesktop = !isIOS && !hasPrompt
  const showBanner = visible && (isIOS || hasPrompt)

  if (!showBanner) return null

  return (
    <div
      className={`fixed bottom-22 left-3 right-3 z-50 transition-all duration-500 ease-out ${
        show
          ? 'translate-y-0 opacity-100'
          : 'translate-y-6 opacity-0'
      }`}
    >
      <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-lg border border-gray-200 px-4 py-3 flex items-center gap-3">
        {/* Icon */}
        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="4" ry="4" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          {isIOS ? (
            <>
              <p className="text-sm font-medium text-gray-900 leading-tight">
                Pasang di layar utama
              </p>
              <p className="text-[11px] text-gray-500 leading-tight mt-0.5">
                Buka menu Safari • Bagikan • Add to Home Screen
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-gray-900 leading-tight">
                Install aplikasi
              </p>
              <p className="text-[11px] text-gray-500 leading-tight mt-0.5">
                Akses lebih cepat, langsung dari layar utama
              </p>
            </>
          )}
        </div>

        {/* Install button (non-iOS only) */}
        {!isIOS && (
          <button
            onClick={handleInstall}
            className="shrink-0 bg-indigo-600 text-white text-xs font-semibold px-4 py-2 rounded-xl active:scale-95 transition-all hover:bg-indigo-700 flex items-center gap-1.5"
          >
            <Download size={14} />
            Install
          </button>
        )}

        {/* Close */}
        <button
          onClick={handleDismiss}
          className="shrink-0 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Tutup"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
