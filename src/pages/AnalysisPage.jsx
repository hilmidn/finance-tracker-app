import { useState, useEffect } from 'react'
import { BarChart3, Lightbulb, TrendingUp, TrendingDown, PiggyBank } from 'lucide-react'
import MonthPicker from '../components/MonthPicker'
import { useTransactions } from '../hooks/useTransactions'

export default function AnalysisPage({ userId }) {
  const [month, setMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [summary, setSummary] = useState(null)
  const [breakdown, setBreakdown] = useState([])
  const [loading, setLoading] = useState(true)
  const [tips, setTips] = useState([])

  const { getSummary, getCategoryBreakdown } = useTransactions(userId)

  useEffect(() => {
    loadData()
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

      // Top spender
      const topCat = b[0]
      if (topCat && totalPengeluaran > 0) {
        const pct = (topCat.total / totalPengeluaran) * 100
        if (pct > 40) {
          newTips.push(`⚠️ Pengeluaran untuk **${topCat.name}** mencapai ${Math.round(pct)}% dari total. Coba evaluasi lagi.`)
        } else if (pct > 25) {
          newTips.push(`📊 **${topCat.name}** adalah pengeluaran terbesar (${Math.round(pct)}%). Masih wajar, tapi pantau terus.`)
        }
      }

      // Saving rate
      if (s.pemasukan > 0) {
        const savingRate = ((s.pemasukan - s.pengeluaran) / s.pemasukan) * 100
        if (savingRate < 0) {
          newTips.push(`🔴 Defisit! Pengeluaran lebih besar dari pemasukan. Coba kurangi pengeluaran yang gak prioritas.`)
        } else if (savingRate < 10) {
          newTips.push(`💡 Saving rate cuma ${Math.round(savingRate)}%. Idealnya minimal 10-20%.`)
        } else if (savingRate >= 20) {
          newTips.push(`👍 Saving rate ${Math.round(savingRate)}%. Bagus! Pertahankan.`)
        }
      }
      setTips(newTips)
    }
  }

  const maxTotal = breakdown.length > 0 ? Math.max(...breakdown.map(b => b.total)) : 1

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Analisis</h1>
      <MonthPicker value={month} onChange={setMonth} />

      {loading ? (
        <div className="space-y-3">
          <div className="h-24 bg-gray-200 rounded-xl animate-pulse" />
          <div className="h-48 bg-gray-200 rounded-xl animate-pulse" />
        </div>
      ) : (
        <>
          {/* Summary mini */}
          {summary && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-green-700 text-xs mb-1">
                  <TrendingUp size={14} /> Pemasukan
                </div>
                <p className="text-lg font-bold text-green-700">Rp {summary.pemasukan.toLocaleString('id-ID')}</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-red-500 text-xs mb-1">
                  <TrendingDown size={14} /> Pengeluaran
                </div>
                <p className="text-lg font-bold text-red-500">Rp {summary.pengeluaran.toLocaleString('id-ID')}</p>
              </div>
              <div className="col-span-full bg-indigo-50 border border-indigo-200 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-indigo-700 text-xs mb-1">
                  <PiggyBank size={14} /> Sisa Saldo
                </div>
                <p className="text-lg font-bold text-indigo-700">Rp {summary.saldo.toLocaleString('id-ID')}</p>
              </div>
            </div>
          )}

          {/* Category breakdown bar chart */}
          {breakdown.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 size={18} className="text-gray-600" />
                <h2 className="font-semibold">Pengeluaran per Kategori</h2>
              </div>
              <div className="space-y-3">
                {breakdown.map(cat => (
                  <div key={cat.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">{cat.name}</span>
                      <span className="font-medium">Rp {cat.total.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full transition-all"
                        style={{ width: `${(cat.total / maxTotal) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tips / LLM-ready section */}
          {tips.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb size={18} className="text-amber-600" />
                <h2 className="font-semibold text-amber-800">Kata Rein</h2>
              </div>
              <ul className="space-y-2">
                {tips.map((tip, i) => (
                  <li key={i} className="text-sm text-amber-900">{tip}</li>
                ))}
              </ul>
            </div>
          )}

          {breakdown.length === 0 && (
            <p className="text-center text-gray-400 py-8">Belum ada data untuk dianalisis</p>
          )}
        </>
      )}
    </div>
  )
}
