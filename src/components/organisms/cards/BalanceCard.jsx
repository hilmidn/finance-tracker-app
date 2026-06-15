import { Eye, EyeOff, Wallet, PiggyBank, TrendingUp, TrendingDown } from 'lucide-react'
import { useState } from 'react'

/**
 * Unified balance card — satu card dengan 3 section dipisah divider:
 * 1. Total Saldo (Rp utama) + bulan + eye toggle
 * 2. Saldo Operasional | Tabungan (space-between)
 * 3. Pemasukan | Pengeluaran (space-between)
 *
 * Semua data opsional jadi card bisa render dengan partial data.
 */
export default function BalanceCard({
  // Section 1: total
  saldo,
  month,
  loading,
  // Section 2: wallet split
  operasionalBalance,
  savingsBalance,
  // Section 3: cashflow
  pemasukan,
  pengeluaran,
}) {
  const [visible, setVisible] = useState(true)

  const formatIdr = (n) => {
    if (n === undefined || n === null) return '0'
    return n.toLocaleString('id-ID')
  }

  const hasWalletSplit =
    operasionalBalance !== undefined || savingsBalance !== undefined

  return (
    <div className="balance-gradient rounded-2xl p-5 text-white shadow-xl shadow-indigo-200/50">
      {/* Section 1: Total saldo */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-indigo-200 font-medium">Total Saldo</p>
          {month && <p className="text-xs text-indigo-300/70 mt-0.5">{month}</p>}
        </div>
        <button
          onClick={() => setVisible(!visible)}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
          aria-label={visible ? 'Sembunyikan saldo' : 'Tampilkan saldo'}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>

      {loading ? (
        <div className="h-10 w-48 bg-white/20 rounded-lg animate-pulse" />
      ) : (
        <p className={`text-3xl font-bold tracking-tight transition-all ${visible ? 'blur-0' : 'blur-md select-none'}`}>
          Rp {formatIdr(saldo)}
        </p>
      )}

      {/* Section 2: Operasional + Tabungan */}
      {hasWalletSplit && (
        <>
          <div className="border-t border-white/15 my-4" />
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-indigo-200 text-xs mb-1">
                <Wallet size={13} /> Saldo Operasional
              </div>
              {loading ? (
                <div className="h-5 w-24 bg-white/20 rounded animate-pulse" />
              ) : (
                <p className={`text-sm font-semibold text-white transition-all ${visible ? '' : 'blur-sm'}`}>
                  Rp {formatIdr(operasionalBalance)}
                </p>
              )}
            </div>
            <div className="flex-1 min-w-0 text-right">
              <div className="flex items-center justify-end gap-1.5 text-amber-200 text-xs mb-1">
                <PiggyBank size={13} /> Tabungan
              </div>
              {loading ? (
                <div className="h-5 w-24 bg-white/20 rounded animate-pulse ml-auto" />
              ) : (
                <p className={`text-sm font-semibold text-amber-200 transition-all ${visible ? '' : 'blur-sm'}`}>
                  Rp {formatIdr(savingsBalance)}
                </p>
              )}
            </div>
          </div>
        </>
      )}

      {/* Section 3: Pemasukan + Pengeluaran */}
      {(pemasukan !== undefined || pengeluaran !== undefined) && (
        <>
          <div className="border-t border-white/15 my-4" />
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-indigo-200 text-xs mb-1">
                <TrendingUp size={13} /> Pemasukan
              </div>
              {loading ? (
                <div className="h-5 w-20 bg-white/20 rounded mt-1 animate-pulse" />
              ) : (
                <p className={`text-sm font-semibold text-green-300 transition-all ${visible ? '' : 'blur-sm'}`}>
                  +Rp {formatIdr(pemasukan)}
                </p>
              )}
            </div>
            <div className="flex-1 min-w-0 text-right">
              <div className="flex items-center justify-end gap-1.5 text-indigo-200 text-xs mb-1">
                <TrendingDown size={13} /> Pengeluaran
              </div>
              {loading ? (
                <div className="h-5 w-20 bg-white/20 rounded mt-1 animate-pulse ml-auto" />
              ) : (
                <p className={`text-sm font-semibold text-red-300 transition-all ${visible ? '' : 'blur-sm'}`}>
                  -Rp {formatIdr(pengeluaran)}
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
