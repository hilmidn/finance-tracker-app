import { useState, useMemo, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { Plus, ArrowLeftRight, Download, BarChart3, List, TrendingUp, TrendingDown, PiggyBank, ChartPie, Lightbulb, Filter, X } from 'lucide-react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import TransactionItem from '../components/TransactionItem'
import TransactionForm from '../components/organisms/forms/TransactionForm'
import MonthPicker from '../components/molecules/MonthPicker'
import { useTransactions, useSummary, useCategoryBreakdown, useMonthlySavings } from '../hooks/useTransactions'
import { useCategories } from '../hooks/useCategories'
import { useWallets } from '../hooks/useWallets'
import { exportToPDF } from '../utils/exportPdf'

function monthRange(month) {
  if (!month) return null
  const [y, m] = month.split('-')
  return {
    start: `${y}-${m}-01`,
    end: new Date(y, parseInt(m), 0).toISOString().split('T')[0],
  }
}

export default function TransactionsPageInner({ userId }) {
  const user = useSelector((s) => s.auth.user)

  const [month, setMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [tab, setTab] = useState('riwayat') // 'riwayat' | 'analisis'
  const [showForm, setShowForm] = useState(false)
  const [editTx, setEditTx] = useState(null)

  // Filters
  const [filterCategories, setFilterCategories] = useState([])
  const [filterDateStart, setFilterDateStart] = useState('')
  const [filterDateEnd, setFilterDateEnd] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Reset date range when month changes
  useEffect(() => {
    const r = monthRange(month)
    if (r) {
      setFilterDateStart(r.start)
      setFilterDateEnd(r.end)
    }
  }, [month])

  const { transactions, loading, addTransaction, updateTransaction, deleteTransaction, deleteTransfer, txRaw, trRaw } = useTransactions(userId)
  const { categories } = useCategories(userId)
  const { wallets } = useWallets(userId)
  const { data: summary, isLoading: summaryLoading } = useSummary(userId, month)
  const { data: breakdown = [], isLoading: breakdownLoading } = useCategoryBreakdown(userId, month)
  const { data: monthlySavings = 0, isLoading: savingsLoading } = useMonthlySavings(userId, month)

  // Filter transactions by month, category, and date range
  const filteredTransactions = useMemo(() => {
    const r = monthRange(month)
    if (!r) return transactions
    let list = transactions.filter(t => t.date >= r.start && t.date <= r.end)

    if (filterCategories.length > 0) {
      list = list.filter(t => filterCategories.includes(t.category_id))
    }

    if (filterDateStart) {
      list = list.filter(t => t.date >= filterDateStart)
    }
    if (filterDateEnd) {
      list = list.filter(t => t.date <= filterDateEnd)
    }

    return list
  }, [transactions, month, filterCategories, filterDateStart, filterDateEnd])

  const monthLabel = format(new Date(month + '-01'), 'MMMM yyyy', { locale: id })
  const loadingAnalisis = summaryLoading || breakdownLoading

  const tips = useMemo(() => {
    const t = []
    if (summary && breakdown.length > 0) {
      const totalPengeluaran = summary.pengeluaran
      const topCat = breakdown[0]
      if (topCat && totalPengeluaran > 0) {
        const pct = (topCat.total / totalPengeluaran) * 100
        if (pct > 40) t.push(`⚠️ Pengeluaran untuk **${topCat.name}** mencapai ${Math.round(pct)}% dari total. Perlu dievaluasi.`)
        else if (pct > 25) t.push(`📊 **${topCat.name}** pengeluaran terbesar (${Math.round(pct)}%). Masih wajar, pantau terus.`)
      }
      if (summary.pemasukan > 0) {
        const savingRate = ((summary.pemasukan - summary.pengeluaran) / summary.pemasukan) * 100
        if (savingRate < 0) t.push('🔴 Defisit! Pengeluaran lebih besar dari pemasukan. Coba kurangi pengeluaran yang tidak prioritas.')
        else if (savingRate < 10) t.push(`💡 Saving rate cuma ${Math.round(savingRate)}%. Idealnya minimal 10-20%.`)
        else if (savingRate >= 20) t.push(`👍 Saving rate ${Math.round(savingRate)}%. Bagus! Pertahankan.`)
      }
    }
    return t
  }, [summary, breakdown])

  const savingsHistory = useMemo(() => {
    const savingsIds = wallets.filter(w => w.is_savings).map(w => w.id)
    if (savingsIds.length === 0) return []
    const byMonth = {}
    transactions.forEach(t => {
      if (t.__type === 'transfer' && t._raw && savingsIds.includes(t._raw.to_wallet_id)) {
        const k = t._raw.date.substring(0, 7)
        byMonth[k] = (byMonth[k] || 0) + t._raw.amount
      }
    })
    const months = []
    const names = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i)
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      months.push({ month: names[d.getMonth()], key: k, total: byMonth[k] || 0 })
    }
    return months
  }, [wallets, transactions])
  const maxSavings = savingsHistory.length > 0 ? Math.max(...savingsHistory.map(s => s.total), 1) : 1

  const allCategories = useMemo(() => {
    const all = [...(categories.pengeluaran || []), ...(categories.pemasukan || [])]
    return all.sort((a, b) => a.name.localeCompare(b.name))
  }, [categories])

  const monthTransactions = useMemo(() => {
    const r = monthRange(month)
    if (!r) return transactions
    return transactions.filter(t => t.date >= r.start && t.date <= r.end)
  }, [transactions, month])

  const usedCategoryIds = useMemo(() => {
    return new Set(monthTransactions.map(t => t.category_id).filter(Boolean))
  }, [monthTransactions])

  const availableCategories = useMemo(() => {
    return allCategories.filter(cat => usedCategoryIds.has(cat.id))
  }, [allCategories, usedCategoryIds])

  const barColors = ['bg-indigo-500', 'bg-violet-500', 'bg-blue-500', 'bg-cyan-500', 'bg-teal-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500']

  const handleExport = async () => {
    const savingsTransactions = transactions.filter(t => t.__type === 'transfer' && t._raw?.to_wallet?.is_savings)
    const bal = {}
    wallets?.forEach(w => { bal[w.id] = w.initial_balance || 0 })
    txRaw?.forEach(t => {
      if (!t.wallet_id) return
      if (t.type === 'pemasukan') bal[t.wallet_id] = (bal[t.wallet_id] || 0) + t.amount
      else bal[t.wallet_id] = (bal[t.wallet_id] || 0) - t.amount
    })
    trRaw?.forEach(t => {
      if (t.from_wallet_id) bal[t.from_wallet_id] = (bal[t.from_wallet_id] || 0) - t.amount
      if (t.to_wallet_id) bal[t.to_wallet_id] = (bal[t.to_wallet_id] || 0) + t.amount
    })
    const walletSummary = wallets?.map(w => ({
      name: w.name, icon: w.icon || (w.is_savings ? '🐷' : '💳'), balance: bal[w.id] || 0, is_savings: w.is_savings,
    })) || []
    exportToPDF({ transactions, user, monthLabel, savingsTransactions, walletSummary })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Transaksi</h1>
        {tab === 'riwayat' && (
          <div className="flex gap-2">
            {transactions.length > 0 && (
              <button onClick={handleExport} className="bg-gray-100 text-gray-700 p-3 rounded-xl hover:bg-gray-200 active:scale-95 transition-all" title="Export PDF">
                <Download size={20} />
              </button>
            )}
            <button onClick={() => { setEditTx(null); setShowForm(true) }} className="bg-indigo-600 text-white p-3 rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all">
              <Plus size={22} />
            </button>
          </div>
        )}
      </div>

      <div className="flex rounded-xl overflow-hidden border border-gray-200 bg-gray-50 p-1">
        <button onClick={() => setTab('riwayat')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium rounded-lg transition-all ${tab === 'riwayat' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}>
          <List size={16} /> Riwayat
        </button>
        <button onClick={() => setTab('analisis')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium rounded-lg transition-all ${tab === 'analisis' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}>
          <BarChart3 size={16} /> Analisis
        </button>
      </div>

      <MonthPicker value={month} onChange={setMonth} />

      {tab === 'riwayat' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-gray-400 font-medium">
              {filteredTransactions.length} transaksi
              {filterCategories.length > 0 && ` · ${filterCategories.length} kategori`}
            </span>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`text-xs flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-all ${
                showFilters || filterCategories.length > 0 ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Filter size={13} />
              {filterCategories.length > 0 ? 'Tersaring' : 'Filter'}
            </button>
          </div>

          {showFilters && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-700">Filter</span>
                <button
                  onClick={() => { setFilterCategories([]); const r = monthRange(month); if (r) { setFilterDateStart(r.start); setFilterDateEnd(r.end) } }}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Reset
                </button>
              </div>

              <div className="space-y-2">
                {['pengeluaran', 'pemasukan'].map(type => {
                  const cats = availableCategories.filter(c => c.type === type)
                  if (cats.length === 0) return null
                  return (
                    <div key={type}>
                      <label className="block text-xs text-gray-500 mb-1.5">
                        Kategori {type === 'pengeluaran' ? 'Pengeluaran' : 'Pemasukan'}
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {cats.map(cat => {
                          const selected = filterCategories.includes(cat.id)
                          return (
                            <button
                              key={cat.id}
                              onClick={() => {
                                setFilterCategories(prev =>
                                  selected ? prev.filter(id => id !== cat.id) : [...prev, cat.id]
                                )
                              }}
                              className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                                selected
                                  ? 'bg-indigo-600 text-white border-indigo-600'
                                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              {cat.name}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Dari</label>
                  <input type="date" value={filterDateStart}
                    onChange={e => setFilterDateStart(e.target.value)}
                    min={monthRange(month)?.start}
                    max={filterDateEnd || monthRange(month)?.end}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Sampai</label>
                  <input type="date" value={filterDateEnd}
                    onChange={e => setFilterDateEnd(e.target.value)}
                    min={filterDateStart || monthRange(month)?.start}
                    max={monthRange(month)?.end}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-200 rounded-xl animate-pulse" />)}
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-gray-100 rounded-2xl mb-3">
                <ArrowLeftRight size={24} className="text-gray-400" />
              </div>
              <p className="text-gray-400 text-sm">
                {filterCategories.length > 0 || filterDateStart !== monthRange(month)?.start ? 'Tidak ada transaksi dengan filter ini' : 'Belum ada transaksi'}
              </p>
              <p className="text-gray-300 text-xs mt-1">{monthLabel}</p>
            </div>
          ) : (
            filteredTransactions.map(tx => {
              const key = tx.__type === 'transfer' ? `tr_${tx._raw?.id}` : `tx_${tx.id}`
              return (
                <TransactionItem
                  key={key} tx={tx}
                  onDelete={(id, isTransfer) => { isTransfer ? deleteTransfer(id) : deleteTransaction(id) }}
                  onEdit={(t) => {
                    if (t.__type !== 'transfer') { setEditTx({ ...t, category_id: t.category_id, wallet_id: t.wallet_id }); setShowForm(true) }
                  }}
                />
              )
            })
          )}
        </div>
      )}

      {tab === 'analisis' && (
        <div className="space-y-5">
          {loadingAnalisis ? (
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
              {summary && (
                <div className="grid grid-cols-4 gap-2">
                  <div className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
                    <TrendingUp size={13} className="text-green-600 mb-1" />
                    <p className="text-[10px] text-gray-500">Pemasukan</p>
                    <p className="text-xs font-bold text-green-700 mt-0.5">Rp {summary.pemasukan.toLocaleString('id-ID')}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
                    <TrendingDown size={13} className="text-red-500 mb-1" />
                    <p className="text-[10px] text-gray-500">Pengeluaran</p>
                    <p className="text-xs font-bold text-red-500 mt-0.5">Rp {summary.pengeluaran.toLocaleString('id-ID')}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
                    <PiggyBank size={13} className="text-indigo-600 mb-1" />
                    <p className="text-[10px] text-gray-500">Sisa</p>
                    <p className="text-xs font-bold text-indigo-700 mt-0.5">Rp {summary.saldo.toLocaleString('id-ID')}</p>
                  </div>
                  <div className="bg-amber-50 rounded-xl border border-amber-100 p-3 shadow-sm">
                    <PiggyBank size={13} className="text-amber-600 mb-1" />
                    <p className="text-[10px] text-amber-600">Menabung</p>
                    {savingsLoading ? (
                      <div className="h-3 w-14 bg-amber-200 rounded animate-pulse mt-1" />
                    ) : (
                      <p className="text-xs font-bold text-amber-700 mt-0.5">Rp {monthlySavings.toLocaleString('id-ID')}</p>
                    )}
                  </div>
                </div>
              )}

              {savingsHistory.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <PiggyBank size={18} className="text-amber-600" />
                    <h2 className="font-semibold text-gray-800">Riwayat Tabungan</h2>
                  </div>
                  <div className="flex items-end gap-2 h-32">
                    {savingsHistory.map(s => (
                      <div key={s.month} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                        <span className="text-[10px] font-semibold text-gray-700">Rp {(s.total / 1000).toFixed(0)}K</span>
                        <div className={`w-full rounded-t-lg transition-all duration-500 ${s.total > 0 ? 'bg-amber-400' : 'bg-gray-100'}`}
                          style={{ height: `${Math.max((s.total / maxSavings) * 100, s.total > 0 ? 8 : 4)}%`, minHeight: s.total > 0 ? '8px' : '4px' }}
                        />
                        <span className="text-[10px] text-gray-400">{s.month}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {breakdown.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart3 size={18} className="text-indigo-600" />
                    <h2 className="font-semibold text-gray-800">Pengeluaran per Kategori</h2>
                  </div>
                  <div className="space-y-3.5">
                    {breakdown.map((cat, idx) => {
                      const pct = summary?.pengeluaran > 0 ? Math.round((cat.total / summary.pengeluaran) * 100) : 0
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
                            <div className={`h-full ${barColors[idx % barColors.length]} rounded-full transition-all duration-500`}
                              style={{ width: `${(cat.total / Math.max(...breakdown.map(b => b.total), 1)) * 100}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {tips.length > 0 && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb size={18} className="text-amber-600" />
                    <h2 className="font-semibold text-amber-800">Kata Rein</h2>
                  </div>
                  <ul className="space-y-2">
                    {tips.map((tip, i) => <li key={i} className="text-sm text-amber-900 leading-relaxed">{tip}</li>)}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {showForm && (
        <TransactionForm
          userId={userId}
          categories={categories}
          wallets={wallets}
          editTx={editTx}
          onSubmit={editTx ? (data) => {
            updateTransaction(editTx.id, data)
            setShowForm(false); setEditTx(null)
          } : async (tx) => {
            await addTransaction(tx)
            setShowForm(false)
          }}
          onClose={() => { setShowForm(false); setEditTx(null) }}
        />
      )}
    </div>
  )
}
