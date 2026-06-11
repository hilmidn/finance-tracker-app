import { Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

export default function TransactionItem({ tx, onDelete }) {
  const isIncome = tx.type === 'pemasukan'
  const catName = tx.categories?.name || 'Tanpa Kategori'

  return (
    <div className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-medium ${
        isIncome ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
      }`}>
        {catName[0]}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-gray-900 truncate">{catName}</p>
        <p className="text-xs text-gray-500 truncate">{tx.note || '—'}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {format(new Date(tx.date), 'dd MMM', { locale: id })}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <span className={`font-semibold text-sm ${isIncome ? 'text-green-600' : 'text-red-500'}`}>
          {isIncome ? '+' : '-'}Rp {tx.amount.toLocaleString('id-ID')}
        </span>
        <button
          onClick={() => onDelete?.(tx.id)}
          className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  )
}
