import { Trash2, Pencil, ArrowLeftRight, Share2, Share, CheckCircle2 } from 'lucide-react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { useState } from 'react'

/**
 * Display a single personal transaction.
 * Supports US-8: shows share status + provides share/unshare toggle.
 *
 * Props:
 * - tx
 * - onDelete
 * - onEdit
 * - onShare(tx) — called when user wants to share
 * - onUnshare(tx) — called when user wants to unshare
 * - isHouseholdMember: boolean — if true, show share buttons
 */
export default function TransactionItem({ tx, onDelete, onEdit, onShare, onUnshare, isHouseholdMember }) {
  const [busy, setBusy] = useState(false)
  const isTransfer = tx.__type === 'transfer'

  if (isTransfer) {
    const from = tx._raw?.from_wallet
    const to = tx._raw?.to_wallet
    const toHh = tx._raw?.to_household_wallet
    return (
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
          <button
            onClick={async () => {
              if (busy) return
              setBusy(true)
              try { await onDelete?.(tx._raw?.id, true) } finally { setBusy(false) }
            }}
            disabled={busy}
            className="p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    )
  }

  const isIncome = tx.type === 'pemasukan'
  const catName = tx.categories?.name || 'Tanpa Kategori'
  const walletName = tx.wallets?.name
  const walletIcon = tx.wallets?.icon || '💳'
  const isShared = Boolean(tx.shared_to_household_id)

  return (
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
          {isShared && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium bg-purple-50 text-purple-600 flex items-center gap-0.5">
              <CheckCircle2 size={9} /> Shared
            </span>
          )}
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
        <div className="flex flex-col gap-0.5 ml-1">
          <button
            onClick={() => onEdit?.(tx)}
            className="p-1 text-gray-300 hover:text-indigo-500 transition-colors rounded-lg hover:bg-indigo-50"
          >
            <Pencil size={12} />
          </button>
          {isHouseholdMember && (
            isShared ? (
              <button
                onClick={async () => {
                  if (busy) return
                  setBusy(true)
                  try { await onUnshare?.(tx) } finally { setBusy(false) }
                }}
                disabled={busy}
                className="p-1 text-purple-400 hover:text-purple-600 transition-colors rounded-lg hover:bg-purple-50 disabled:opacity-50"
                title="Batalkan share ke household"
              >
                <Share2 size={12} />
              </button>
            ) : (
              <button
                onClick={async () => {
                  if (busy) return
                  setBusy(true)
                  try { await onShare?.(tx) } finally { setBusy(false) }
                }}
                disabled={busy}
                className="p-1 text-gray-300 hover:text-purple-500 transition-colors rounded-lg hover:bg-purple-50 disabled:opacity-50"
                title="Bagikan ke household"
              >
                <Share size={12} />
              </button>
            )
          )}
          <button
            onClick={async () => {
              if (busy) return
              setBusy(true)
              try { await onDelete?.(tx.id, false) } finally { setBusy(false) }
            }}
            disabled={busy}
            className="p-1 text-gray-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}
