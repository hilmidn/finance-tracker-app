import { useState, useEffect } from 'react'
import { BarChart3, Lightbulb, TrendingUp, TrendingDown, PiggyBank, ChartPie } from 'lucide-react'
import MonthPicker from '../components/MonthPicker'
import { useTransactions } from '../hooks/useTransactions'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

export default function AnalysisPage({ userId }) {
  const [month, setMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [summary, setSummary] = useState(null)
  const [breakdown, setBreakdown] = useState([])
  const [loading, setLoading] = useState(true)
  const [tips, setTips] = useState([])
  const [savingsHistory, setSavingsHistory] = useState([])
  const [savingsLoading, setSavingsLoading] = useState(true)
  const [monthlySavings, setMonthlySavings] = useState(0)

  const { getSummary, getCategoryBreakdown, getMonthlySavings, getSavingsHistory } = useTransactions(userId)

  const monthLabel = format(new Date(month + '-01'), 'MMMM yyyy', { locale: id })

  useEffect(() => {
    loadData()
    loadSavings()
  }, [month])

  const loadData = async () => {
    setLoading(true)
    const [s, b] = await Promise.all([
      getSummary(month),
      getCategoryBreakdown(month),
    ])
    setSummary(s)
    setBreakdown(b)
    setLoading(false)

    if (s && b.length > 0) {
      const newTips = []
      const totalPengeluaran = s.pengeluaran
      const topCat = b[0]
      if (topCat && totalPengeluaran > 0) {
        const pct = (topCat.total / totalPengeluaran) * 100
        if (pct > 40) {
          newTips.push(`⚠️ Pengeluaran untuk **${topCat.name}** mencapai ${Math.round(pct)}% dari total. Perlu dievaluasi.`)
        } else if (pct > 25) {
          newTips.push(`📊 **${topCat.name}** pengeluaran terbesar (${Math.round(pct)}%). Masih wajar, pantau terus.`)
        }
      }
      if (s.pemasukan > 0) {
        const savingRate = ((s.pemasukan - s.pengeluaran) / s.pemasukan) * 100
        if (savingRate < 0) {
          newTips.push(`🔴 Defisit! Pengeluaran lebih besar dari pemasukan. Coba kurangi pengeluaran yang tidak prioritas.`)
        } else if (savingRate < 10) {
          newTips.push(`💡 Saving rate cuma ${Math.round(savingRate)}%. Idealnya minimal 10-20%.`)
        } else if (savingRate >= 20) {
          newTips.push(`👍 Saving rate ${Math.round(savingRate)}%. Bagus! Pertahankan.`)
        }
      }
      setTips(newTips)
    }
  }

  const loadSavings = async () => {
    setSavingsLoading(true)
    const [history, curSavings] = await Promise.all([
      getSavingsHistory(),
      getMonthlySavings(month),
    ])
    setSavingsHistory(history)
    setMonthlySavings(curSavings)
    setSavingsLoading(false)
  }

  const maxSavings = savingsHistory.length > 0 ? Math.max(...savingsHistory.map(s => s.total), 1) : 1

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">Analisis</h1>
      <MonthPicker value={month} onChange={setMonth} />

      {loading ? (
        <div className="space-y-3">
          <div className="h-28 bg-gray-200 rounded-xl animate-pulse" />
          <div className="h-52 bg-gray-200 rounded-xl animate-pulse" />
        </div>
      ) : breakdown.length === 0 && savingsHistory.length === 0 ? (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gray-100 rounded-2xl mb-3">
            <ChartPie size={24} className="text-gray-400" />
          </div>
          <p className="text-gray-400 text-sm">Belum ada data</p>
          <p className="text-gray-300 text-xs mt-1">Catat transaksi dulu ya</p>
        </div>
      ) : (
        <>
          {/* Summary mini */}
          {summary && (
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
                <div className="flex items-center gap-1 text-green-600 text-xs mb-1">
                  <TrendingUp size={13} />
                </div>
                <p className="text-[10px] text-gray-500">Pemasukan</p>
                <p className="text-xs font-bold text-green-700 mt-0.5">Rp {summary.pemasukan.toLocaleString('id-ID')}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
                <div className="flex items-center gap-1 text-red-500 text-xs mb-1">
                  <TrendingDown size={13} />
                </div>
                <p className="text-[10px] text-gray-500">Pengeluaran</p>
                <p className="text-xs font-bold text-red-500 mt-0.5">Rp {summary.pengeluaran.toLocaleString('id-ID')}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
                <div className="flex items-center gap-1 text-indigo-600 text-xs mb-1">
                  <PiggyBank size={13} />
                </div>
                <p className="text-[10px] text-gray-500">Sisa</p>
                <p className="text-xs font-bold text-indigo-700 mt-0.5">Rp {summary.saldo.toLocaleString('id-ID')}</p>
              </div>
              <div className="bg-amber-50 rounded-xl border border-amber-100 p-3 shadow-sm">
                <div className="flex items-center gap-1 text-amber-600 text-xs mb-1">
                  <PiggyBank size={13} />
                </div>
                <p className="text-[10px] text-amber-600">Menabung</p>
                {savingsLoading ? (
                  <div className="h-3 w-14 bg-amber-200 rounded animate-pulse mt-1" />
                ) : (
                  <p className="text-xs font-bold text-amber-700 mt-0.5">Rp {monthlySavings.toLocaleString('id-ID')}</p>
                )}
              </div>
            </div>
          )}

          {/* Savings History — 6 month bar chart */}
          {savingsHistory.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <PiggyBank size={18} className="text-amber-600" />
                <h2 className="font-semibold text-gray-800">Riwayat Tabungan</h2>
              </div>
              <div className="flex items-end gap-2 h-32">
                {savingsHistory.map((s, i) => (
                  <div key={s.month} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                    <span className="text-[10px] font-semibold text-gray-700">
                      Rp {(s.total / 1000).toFixed(0)}K
                    </span>
                    <div
                      className={`w-full rounded-t-lg transition-all duration-500 ${
                        s.total > 0 ? 'bg-amber-400' : 'bg-gray-100'
                      }`}
                      style={{
                        height: `${Math.max((s.total / maxSavings) * 100, s.total > 0 ? 8 : 4)}%`,
                        minHeight: s.total > 0 ? '8px' : '4px',
                      }}
                    />
                    <span className="text-[10px] text-gray-400">{s.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Category breakdown */}
          {breakdown.length > 0 && (() => {
            const maxTotal = Math.max(...breakdown.map(b => b.total), 1)
            return (
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 size={18} className="text-indigo-600" />
                <h2 className="font-semibold text-gray-800">Pengeluaran per Kategori</h2>
              </div>
              <div className="space-y-3.5">
                {breakdown.map((cat, idx) => {
                  const pct = summary?.pengeluaran > 0 ? Math.round((cat.total / summary.pengeluaran) * 100) : 0
                  const barColors = ['bg-indigo-500', 'bg-violet-500', 'bg-blue-500', 'bg-cyan-500', 'bg-teal-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500']
                  return (
                    <div key={cat.name}>
                      <div className="flex justify-between text-sm mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${barColors[idx % barColors.length]}`} />
                          <span className="text-gray-700 font-medium">{cat.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-800">Rp {cat.total.toLocaleString('id-ID')}</span>
                          <span className="text-xs text-gray-400 w-8 text-right">{pct}%</span>
                        </div>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${barColors[idx % barColors.length]} rounded-full transition-all duration-500`}
                          style={{ width: `${(cat.total / maxTotal) * 100}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            )
          })()}

          {/* Tips */}
          {tips.length > 0 && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb size={18} className="text-amber-600" />
                <h2 className="font-semibold text-amber-800">Kata Rein 💬</h2>
              </div>
              <ul className="space-y-2">
                {tips.map((tip, i) => (
                  <li key={i} className="text-sm text-amber-900 leading-relaxed">{tip}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  )
}
