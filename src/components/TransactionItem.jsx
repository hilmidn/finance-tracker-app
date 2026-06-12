import { Trash2, Pencil, ArrowLeftRight } from 'lucide-react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

export default function TransactionItem({ tx, onDelete, onEdit }) {
  const isTransfer = tx.__type === 'transfer'

  if (isTransfer) {
    const from = tx._raw?.from_wallet
    const to = tx._raw?.to_wallet
    return (
      <div className="flex items-center gap-3 bg-white rounded-xl px-4 py-3.5 shadow-sm border border-gray-100 active:bg-gray-50 transition-colors relative">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-100 text-blue-600 shrink-0 relative">
          <ArrowLeftRight size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-semibold text-sm text-gray-900 truncate">Transfer</p>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium bg-blue-50 text-blue-600">
              Transfer
            </span>
          </div>
          <p className="text-xs text-gray-500 truncate mt-0.5">
            {(from?.icon || '💳')} {from?.name || '?'} → {(to?.icon || '💳')} {to?.name || '?'}
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
            onClick={() => onDelete?.(tx._raw?.id, true)}
            className="p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
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

  return (
    <div className="flex items-center gap-3 bg-white rounded-xl px-4 py-3.5 shadow-sm border border-gray-100 active:bg-gray-50 transition-colors relative">
      {/* Pending badge */}
      {tx._pending && (
        <div className="absolute -top-1 -right-1 z-10 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center shadow-sm">
          <span className="text-[8px] text-white font-bold">!</span>
        </div>
      )}

      {/* Category icon circle */}
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold shrink-0 relative ${
        isIncome ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-500'
      }`}>
        {catName[0]}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
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
        <div className="flex flex-col gap-0.5 ml-1">
          <button
            onClick={() => onEdit?.(tx)}
            className="p-1 text-gray-300 hover:text-indigo-500 transition-colors rounded-lg hover:bg-indigo-50"
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={() => onDelete?.(tx.id, false)}
            className="p-1 text-gray-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}
