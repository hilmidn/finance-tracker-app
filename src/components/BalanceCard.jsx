import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'

export default function BalanceCard({ pemasukan, pengeluaran, saldo, month, loading }) {
  const [visible, setVisible] = useState(true)

  const formatIdr = (n) => {
    if (n === undefined || n === null) return '0'
    return n.toLocaleString('id-ID')
  }

  return (
    <div className="balance-gradient rounded-2xl p-5 text-white shadow-xl shadow-indigo-200/50">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-indigo-200 font-medium">Total Saldo</p>
          <p className="text-xs text-indigo-300/70 mt-0.5">{month}</p>
        </div>
        <button
          onClick={() => setVisible(!visible)}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>

      {/* Balance */}
      {loading ? (
        <div className="h-10 w-48 bg-white/20 rounded-lg animate-pulse mb-4" />
      ) : (
        <p className={`text-3xl font-bold tracking-tight mb-4 transition-all ${visible ? 'blur-0' : 'blur-md select-none'}`}>
          Rp {formatIdr(saldo)}
        </p>
      )}

      {/* Income / Expense row */}
      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/15">
        <div>
          <p className="text-xs text-indigo-200">Pemasukan</p>
          {loading ? (
            <div className="h-5 w-20 bg-white/20 rounded mt-1 animate-pulse" />
          ) : (
            <p className={`font-semibold text-sm text-green-300 transition-all ${visible ? '' : 'blur-sm'}`}>
              +Rp {formatIdr(pemasukan)}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-indigo-200">Pengeluaran</p>
          {loading ? (
            <div className="h-5 w-20 bg-white/20 rounded mt-1 animate-pulse ml-auto" />
          ) : (
            <p className={`font-semibold text-sm text-red-300 transition-all ${visible ? '' : 'blur-sm'}`}>
              -Rp {formatIdr(pengeluaran)}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
