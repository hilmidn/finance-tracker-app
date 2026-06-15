import { Trash2, Pencil, ArrowLeftRight } from 'lucide-react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { useState } from 'react'
import ConfirmModal from '../modals/ConfirmModal'

/**
 * Display a single personal transaction (income/expense/transfer).
 * Read-only mode is supported via the `readOnly` prop: hides edit +
 * delete buttons (used by the Shared tab to view other members' tx).
 *
 * Props:
 * - tx
 * - onDelete(id, isTransfer)
 * - onEdit(tx)
 * - readOnly: boolean — when true, no action buttons are shown
 */
export default function TransactionItem({ tx, onDelete, onEdit, readOnly }) {
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState(null)
  const isTransfer = tx.__type === 'transfer'

  // Common handler for the actual delete after confirm
  const handleDelete = async () => {
    setError(null)
    try {
      const isTr = isTransfer
      await onDelete?.(isTr ? tx._raw?.id : tx.id, isTr)
      setConfirmDelete(false)
    } catch (err) {
      setError(err.message || 'Gagal menghapus')
      throw err  // keep modal open
    }
  }

  if (isTransfer) {
    const from = tx._raw?.from_wallet
    const to = tx._raw?.to_wallet
    const toHh = tx._raw?.to_household_wallet
    return (
      <>
        <div className="flex items-center gap-3 bg-white rounded-xl px-4 py-3.5 shadow-sm border border-gray-100 active:bg-gray-50 transition-colors relative">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-100 text-blue-600 shrink-0 relative">
            <ArrowLeftRight size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="font-semibold text-sm text-gray-900 truncate">Transfer</p>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium bg-blue-50 text-blue-600">
                Transfer
              </span>
              {toHh && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium bg-purple-50 text-purple-600">
                  → Household
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 truncate mt-0.5">
              {(from?.icon || '💳')} {from?.name || '?'} →{' '}
              {toHh ? `${toHh.icon || '💳'} ${toHh.name} (Household)` : `${(to?.icon || '💳')} ${to?.name || '?'}`}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {format(new Date(tx.date), 'dd MMM', { locale: id })}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-sm text-blue-600">
              Rp {tx.amount.toLocaleString('id-ID')}
            </span>
            {!readOnly && (
              <button
                onClick={() => { setError(null); setConfirmDelete(true) }}
                disabled={busy}
                aria-label="Hapus transfer"
                className="p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        {!readOnly && (
          <ConfirmModal
            isOpen={confirmDelete}
            onClose={() => { if (!busy) { setConfirmDelete(false); setError(null) } }}
            onConfirm={async () => { setBusy(true); try { await handleDelete() } finally { setBusy(false) } }}
            title={error ? 'Gagal menghapus transfer' : 'Hapus transfer?'}
            message={error || `Transfer Rp ${tx.amount.toLocaleString('id-ID')} dari ${from?.name || '?'} akan dihapus. Saldo dompet akan di-restore.`}
            confirmText={error ? 'Tutup' : 'Hapus'}
            cancelText="Batal"
            variant="danger"
            loading={busy}
          />
        )}
      </>
    )
  }

  const isIncome = tx.type === 'pemasukan'
  const catName = tx.categories?.name || 'Tanpa Kategori'
  const walletName = tx.wallets?.name
  const walletIcon = tx.wallets?.icon || '💳'

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
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold shrink-0 relative ${
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
          {tx.note && <p className="text-xs text-gray-500 truncate mt-0.5">{tx.note}</p>}
          <p className="text-[11px] text-gray-400 mt-0.5">
            {format(new Date(tx.date), 'dd MMM', { locale: id })}
            {walletName && <> · {walletIcon} {walletName}</>}
          </p>
        </div>

        {/* Amount + actions */}
        <div className="flex items-center gap-1">
          <span className={`font-bold text-sm ${isIncome ? 'text-green-600' : 'text-red-500'}`}>
            {isIncome ? '+' : '-'}Rp {tx.amount.toLocaleString('id-ID')}
          </span>
          {!readOnly && (
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
                aria-label="Hapus transaksi"
                className="p-1 text-gray-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 size={12} />
              </button>
            </div>
          )}
        </div>
      </div>

      {!readOnly && (
        <ConfirmModal
          isOpen={confirmDelete}
          onClose={() => { if (!busy) { setConfirmDelete(false); setError(null) } }}
          onConfirm={async () => { setBusy(true); try { await handleDelete() } finally { setBusy(false) } }}
          title={error ? 'Gagal menghapus' : 'Hapus transaksi?'}
          message={error || `Transaksi ${catName} sebesar Rp ${tx.amount.toLocaleString('id-ID')} akan dihapus. Saldo dompet akan di-restore.`}
          confirmText={error ? 'Tutup' : 'Hapus'}
          cancelText="Batal"
          variant="danger"
          loading={busy}
        />
      )}
    </>
  )
}
