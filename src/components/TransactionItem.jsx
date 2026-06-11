import { Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

export default function TransactionItem({ tx, onDelete }) {
  const isIncome = tx.type === 'pemasukan'
  const catName = tx.categories?.name || 'Tanpa Kategori'
  const walletName = tx.wallets?.name
  const walletIcon = tx.wallets?.icon || '💳'

  return (
    <div className="flex items-center gap-3 bg-white rounded-xl px-4 py-3.5 shadow-sm border border-gray-100 active:bg-gray-50 transition-colors">
      {/* Category icon circle */}
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold shrink-0 ${
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

      {/* Amount + delete */}
      <div className="flex items-center gap-1.5">
        <span className={`font-bold text-sm ${isIncome ? 'text-green-600' : 'text-red-500'}`}>
          {isIncome ? '+' : '-'}Rp {tx.amount.toLocaleString('id-ID')}
        </span>
        <button
          onClick={() => onDelete?.(tx.id)}
          className="p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}
