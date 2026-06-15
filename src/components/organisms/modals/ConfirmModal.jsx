import { AlertTriangle, X, Trash2, LogOut } from 'lucide-react'

/**
 * Reusable confirmation modal — replaces native `confirm()` and `alert()`.
 *
 * Usage:
 *   <ConfirmModal
 *     isOpen={open}
 *     onClose={() => setOpen(false)}
 *     onConfirm={handleDelete}
 *     title="Hapus kategori"
 *     message="Kategori Pakaian akan dihapus..."
 *     variant="danger"
 *     confirmText="Hapus"
 *     loading={mutation.isPending}
 *   />
 *
 * Variants:
 *   - "default" → neutral, indigo confirm button
 *   - "danger"  → red, with warning icon. Use for destructive actions.
 */
export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Konfirmasi',
  cancelText = 'Batal',
  variant = 'default',
  loading = false,
}) {
  if (!isOpen) return null

  const isDanger = variant === 'danger'
  const Icon = isDanger ? Trash2 : LogOut
  const confirmColor = isDanger
    ? 'bg-red-600 hover:bg-red-700'
    : 'bg-indigo-600 hover:bg-indigo-700'
  const iconBg = isDanger ? 'bg-red-50' : 'bg-indigo-50'
  const iconColor = isDanger ? 'text-red-600' : 'text-indigo-600'

  const handleConfirm = async () => {
    if (loading) return
    try {
      await onConfirm()
      onClose()
    } catch (err) {
      // If onConfirm throws, keep modal open so the caller can show
      // an inline error or re-throw. Caller is responsible for UX.
      console.error('[ConfirmModal] onConfirm threw', err)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
              {isDanger ? (
                <AlertTriangle size={20} className={iconColor} />
              ) : (
                <Icon size={20} className={iconColor} />
              )}
            </div>
            <h2 className="text-base font-bold text-gray-900 pt-1.5">{title}</h2>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="text-sm text-gray-600 leading-relaxed mb-6 pl-13">
          {typeof message === 'string' ? (
            <p>{message}</p>
          ) : (
            message
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-3 rounded-xl text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={`flex-1 px-4 py-3 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50 ${confirmColor}`}
          >
            {loading ? 'Memproses...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
