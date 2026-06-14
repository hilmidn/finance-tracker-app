import { Trash2, Pencil, Share2 } from 'lucide-react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { useState } from 'react'
import ConfirmModal from './ConfirmModal'

/**
 * Display a single household transaction.
 *
 * Two flavors:
 * - __type === 'household': created directly in household ledger
 * - __type === 'shared_personal': personal tx that was shared to household
 *
 * Delete / unshare both go through ConfirmModal — no silent destructive
 * actions. The parent passes `onDelete(id, isShared)`. When isShared is
 * true the parent is expected to clear shared_to_household_id rather
 * than delete the row (since the underlying row lives in the personal
 * transactions table).
 */
export default function HouseholdTransactionItem({ tx, onDelete, onEdit, currentUserId }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmUnshare, setConfirmUnshare] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const isShared = tx.__type === 'shared_personal'
  const txData = tx._raw || tx

  const isIncome = txData.type === 'pemasukan'
  const catName = isShared
    ? (txData.household_categories?.name || 'Shared')
    : (txData.household_categories?.name || 'Tanpa Kategori')
  const walletName = txData.household_wallets?.name
  const walletIcon = txData.household_wallets?.icon || '💳'

  // For shared: show the user who shared it
  const sharedBy = isShared ? (txData.user_id || txData.userId) : null
  const isOwnShared = sharedBy === currentUserId
  const sharedByLabel = isOwnShared
    ? 'Dari saya'
    : sharedBy
      ? `Shared dari ${(sharedBy || '').substring(0, 4)}...`
      : 'Shared'

  const handleConfirmDelete = async () => {
    setError(null)
    try {
      await onDelete?.(txData.id, false)
      setConfirmDelete(false)
    } catch (err) {
      setError(err.message || 'Gagal menghapus')
      throw err  // keep modal open
    }
  }

  const handleConfirmUnshare = async () => {
    setError(null)
    try {
      await onDelete?.(txData.id, true)
      setConfirmUnshare(false)
    } catch (err) {
      setError(err.message || 'Gagal membatalkan share')
      throw err
    }
  }

  return (
    <>
      <div className="flex items-center gap-3 bg-white rounded-xl px-4 py-3.5 shadow-sm border border-gray-100 active:bg-gray-50 transition-colors relative">
        {/* Pending badge */}
        {tx._pending && (
          <div className="absolute -top-1 -right-1 z-10 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center shadow-sm">
            <span className="text-[8px] text-white font-bold">!</span>
          </div>
        )}

        {/* Category icon */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold shrink-0 ${
          isIncome ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-500'
        }`}>
          {catName[0]}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-semibold text-sm text-gray-900 truncate">{catName}</p>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
              isIncome ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-400'
            }`}>
              {isIncome ? 'Masuk' : 'Keluar'}
            </span>
            {isShared && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium bg-purple-50 text-purple-600 flex items-center gap-0.5">
                <Share2 size={9} /> {sharedByLabel}
              </span>
            )}
          </div>
          {txData.note && <p className="text-xs text-gray-500 truncate mt-0.5">{txData.note}</p>}
          <p className="text-[11px] text-gray-400 mt-0.5">
            {format(new Date(txData.date), 'dd MMM', { locale: id })}
            {walletName && <> · {walletIcon} {walletName}</>}
          </p>
        </div>

        {/* Amount + actions */}
        <div className="flex items-center gap-1">
          <span className={`font-bold text-sm ${isIncome ? 'text-green-600' : 'text-red-500'}`}>
            {isIncome ? '+' : '-'}Rp {txData.amount.toLocaleString('id-ID')}
          </span>
          {!isShared && (
            <div className="flex flex-col gap-0.5 ml-1">
              <button
                onClick={() => onEdit?.(tx)}
                aria-label="Edit transaksi"
                className="p-1 text-gray-300 hover:text-indigo-500 transition-colors rounded-lg hover:bg-indigo-50"
              >
                <Pencil size={12} />
              </button>
              <button
                onClick={() => { setError(null); setConfirmDelete(true) }}
                disabled={busy}
                aria-label="Hapus transaksi household"
                className="p-1 text-gray-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 size={12} />
              </button>
            </div>
          )}
          {isShared && isOwnShared && (
            <button
              onClick={() => { setError(null); setConfirmUnshare(true) }}
              disabled={busy}
              aria-label="Batalkan share"
              title="Batalkan share"
              className="p-1 text-gray-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 ml-1 disabled:opacity-50"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmDelete}
        onClose={() => { if (!busy) { setConfirmDelete(false); setError(null) } }}
        onConfirm={async () => { setBusy(true); try { await handleConfirmDelete() } finally { setBusy(false) } }}
        title={error ? 'Gagal menghapus' : 'Hapus transaksi household?'}
        message={error || `Transaksi ${catName} sebesar Rp ${txData.amount.toLocaleString('id-ID')} akan dihapus. Saldo dompet household akan di-restore. Aksi ini tidak bisa di-undo.`}
        confirmText={error ? 'Tutup' : 'Hapus'}
        cancelText="Batal"
        variant="danger"
        loading={busy}
      />

      <ConfirmModal
        isOpen={confirmUnshare}
        onClose={() => { if (!busy) { setConfirmUnshare(false); setError(null) } }}
        onConfirm={async () => { setBusy(true); try { await handleConfirmUnshare() } finally { setBusy(false) } }}
        title={error ? 'Gagal' : 'Batalkan share ke household?'}
        message={error || `Transaksi ini tidak akan muncul lagi di household ledger. Catatan: transaksi personal kamu tetap ada, hanya share-nya yang dicabut.`}
        confirmText={error ? 'Tutup' : 'Batalkan Share'}
        cancelText="Kembali"
        variant="default"
        loading={busy}
      />
    </>
  )
}
