import { Trash2, Pencil } from 'lucide-react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { useState } from 'react'
import ConfirmModal from '../modals/ConfirmModal'

/**
 * Display a single household transaction (household-ledger only).
 * Personal transactions shared by a member are now visible via the
 * Shared tab in TransactionsPage — they're not mixed into the
 * household ledger anymore.
 *
 * Props:
 * - tx
 * - onDelete(id) — deletes the household transaction
 * - onEdit(tx)
 * - currentUserId
 */
export default function HouseholdTransactionItem({ tx, onDelete, onEdit, currentUserId }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const txData = tx._raw || tx
  const isIncome = txData.type === 'pemasukan'
  const catName = txData.household_categories?.name || 'Tanpa Kategori'
  const walletName = txData.household_wallets?.name
  const walletIcon = txData.household_wallets?.icon || '💳'

  const handleConfirmDelete = async () => {
    setError(null)
    try {
      await onDelete?.(txData.id)
      setConfirmDelete(false)
    } catch (err) {
      setError(err.message || 'Gagal menghapus')
      throw err  // keep modal open
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
    </>
  )
}
