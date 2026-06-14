import { useState, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Plus, ArrowLeftRight, BarChart3, List, TrendingUp, TrendingDown, Home, ArrowLeft, Wallet } from 'lucide-react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import HouseholdTransactionItem from '../components/HouseholdTransactionItem'
import HouseholdTransactionForm from '../components/HouseholdTransactionForm'
import MonthPicker from '../components/MonthPicker'
import { useHousehold } from '../hooks/useHousehold'
import { useHouseholdMembers } from '../hooks/useHouseholdMembers'
import { useHouseholdCategories } from '../hooks/useHouseholdCategories'
import { useHouseholdWallets } from '../hooks/useHouseholdWallets'
import { useHouseholdTransactions } from '../hooks/useHouseholdTransactions'

function monthRange(month) {
  if (!month) return null
  const [y, m] = month.split('-')
  return {
    start: `${y}-${m}-01`,
    end: new Date(y, parseInt(m), 0).toISOString().split('T')[0],
  }
}

export default function HouseholdTransactionsPage() {
  const navigate = useNavigate()
  const user = useSelector((s) => s.auth.user)
  const userId = user?.id
  const { household, isMember, loading: householdLoading } = useHousehold(userId)

  const householdId = household?.id

  const [month, setMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [tab, setTab] = useState('riwayat')
  const [showForm, setShowForm] = useState(false)
  const [editTx, setEditTx] = useState(null)
  const [defaultType, setDefaultType] = useState(undefined)

  const { members } = useHouseholdMembers(householdId)
  // useHouseholdCategories returns { categories: {pemasukan, pengeluaran}, raw: [...] }.
  // Destructure `raw` (the array) — the previous `categories: rawCategories`
  // was the grouped object which has no .filter() method.
  const { raw: rawCategories } = useHouseholdCategories(householdId)
  const { wallets } = useHouseholdWallets(householdId)
  const { transactions, loading: txLoading, addTransaction, updateTransaction, deleteTransaction, unshareSharedTransaction } =
    useHouseholdTransactions(householdId, userId)

  // Bucket household categories by type
  const categories = useMemo(() => {
    const cats = rawCategories || []
    return {
      pengeluaran: cats.filter(c => c.type === 'pengeluaran'),
      pemasukan: cats.filter(c => c.type === 'pemasukan'),
    }
  }, [rawCategories])

  // Filter by month
  const filteredTransactions = useMemo(() => {
    const r = monthRange(month)
    if (!r) return transactions
    return transactions.filter(t => {
      const d = t._raw?.date || t.date
      return d >= r.start && d <= r.end
    })
  }, [transactions, month])

  // Summary for the month
  const monthSummary = useMemo(() => {
    return {
      pemasukan: filteredTransactions.filter(t => (t._raw?.type || t.type) === 'pemasukan').reduce((s, t) => s + (t._raw?.amount || t.amount || 0), 0),
      pengeluaran: filteredTransactions.filter(t => (t._raw?.type || t.type) === 'pengeluaran').reduce((s, t) => s + (t._raw?.amount || t.amount || 0), 0),
      count: filteredTransactions.length,
    }
  }, [filteredTransactions])

  // Category breakdown for the month
  const categoryBreakdown = useMemo(() => {
    const bk = {}
    filteredTransactions
      .filter(t => (t._raw?.type || t.type) === 'pengeluaran')
      .forEach(t => {
        const n = t._raw?.household_categories?.name || t.household_categories?.name || '—'
        const amt = t._raw?.amount || t.amount || 0
        bk[n] = (bk[n] || 0) + amt
      })
    return Object.entries(bk).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total)
  }, [filteredTransactions])

  const monthLabel = format(new Date(month + '-01'), 'MMMM yyyy', { locale: id })
  const barColors = ['bg-indigo-500', 'bg-violet-500', 'bg-blue-500', 'bg-cyan-500', 'bg-teal-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500']

  // Show loading or not-in-household
  if (householdLoading) {
    return (
      <div className="space-y-3">
        <div className="h-12 bg-gray-200 rounded-xl animate-pulse" />
        <div className="h-32 bg-gray-200 rounded-xl animate-pulse" />
      </div>
    )
  }

  if (!isMember) {
    return (
      <div className="text-center py-16 space-y-3">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-gray-100 rounded-2xl">
          <Home size={24} className="text-gray-400" />
        </div>
        <p className="text-gray-700 font-medium">Belum ada household</p>
        <p className="text-gray-400 text-xs">Buat atau terima invite dulu di Pengaturan</p>
        <button
          onClick={() => navigate('/settings')}
          className="mt-3 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium"
        >
          Ke Pengaturan
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/household')}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-700" />
          </button>
          <div>
            <h1 className="text-xl font-bold">Household</h1>
            <p className="text-[10px] text-gray-500">{household.name} · {members.length} anggota</p>
          </div>
        </div>
        {tab === 'riwayat' && (
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/household/wallets')}
              className="bg-gray-100 text-gray-700 p-3 rounded-xl hover:bg-gray-200 active:scale-95 transition-all"
              title="Dompet Household"
            >
              <Wallet size={20} />
            </button>
            <button
              onClick={() => { setEditTx(null); setDefaultType(undefined); setShowForm(true) }}
              className="bg-indigo-600 text-white p-3 rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all"
            >
              <Plus size={22} />
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
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

      {/* ══════ TAB: RIWAYAT ══════ */}
      {tab === 'riwayat' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-gray-400 font-medium">
              {filteredTransactions.length} transaksi · {monthLabel}
            </span>
          </div>

          {txLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-200 rounded-xl animate-pulse" />)}
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-gray-100 rounded-2xl mb-3">
                <ArrowLeftRight size={24} className="text-gray-400" />
              </div>
              <p className="text-gray-400 text-sm">Belum ada transaksi household</p>
              <p className="text-gray-300 text-xs mt-1">Tap + untuk catat, atau share dari pribadi</p>
            </div>
          ) : (
            filteredTransactions.map(tx => (
              <HouseholdTransactionItem
                key={tx.id}
                tx={tx}
                currentUserId={userId}
                onEdit={(t) => { setEditTx(t); setShowForm(true) }}
                onDelete={async (id, isShared) => {
                  if (isShared) {
                    // Revoke share: clear shared_to_household_id on the
                    // personal transaction so it stops appearing in the
                    // household ledger.
                    try {
                      await unshareSharedTransaction(id)
                    } catch (err) {
                      console.error('[HouseholdTx] unshare failed', err)
                      throw err
                    }
                  } else {
                    await deleteTransaction(id)
                  }
                }}
              />
            ))
          )}
        </div>
      )}

      {/* ══════ TAB: ANALISIS ══════ */}
      {tab === 'analisis' && (
        <div className="space-y-5">
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-gray-100 rounded-2xl mb-3">
                <BarChart3 size={24} className="text-gray-400" />
              </div>
              <p className="text-gray-400 text-sm">Belum ada data</p>
              <p className="text-gray-300 text-xs mt-1">Catat transaksi dulu ya</p>
            </div>
          ) : (
            <>
              {/* Summary */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
                  <TrendingUp size={13} className="text-green-600 mb-1" />
                  <p className="text-[10px] text-gray-500">Pemasukan</p>
                  <p className="text-xs font-bold text-green-700 mt-0.5">Rp {monthSummary.pemasukan.toLocaleString('id-ID')}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
                  <TrendingDown size={13} className="text-red-500 mb-1" />
                  <p className="text-[10px] text-gray-500">Pengeluaran</p>
                  <p className="text-xs font-bold text-red-500 mt-0.5">Rp {monthSummary.pengeluaran.toLocaleString('id-ID')}</p>
                </div>
                <div className="bg-indigo-50 rounded-xl border border-indigo-100 p-3 shadow-sm">
                  <BarChart3 size={13} className="text-indigo-600 mb-1" />
                  <p className="text-[10px] text-indigo-600">Sisa</p>
                  <p className="text-xs font-bold text-indigo-700 mt-0.5">Rp {(monthSummary.pemasukan - monthSummary.pengeluaran).toLocaleString('id-ID')}</p>
                </div>
              </div>

              {/* Category breakdown */}
              {categoryBreakdown.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart3 size={18} className="text-indigo-600" />
                    <h2 className="font-semibold text-gray-800">Pengeluaran per Kategori</h2>
                  </div>
                  <div className="space-y-3.5">
                    {categoryBreakdown.map((cat, idx) => {
                      const pct = monthSummary.pengeluaran > 0 ? Math.round((cat.total / monthSummary.pengeluaran) * 100) : 0
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
                              style={{ width: `${(cat.total / Math.max(...categoryBreakdown.map(b => b.total), 1)) * 100}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {showForm && (
        <HouseholdTransactionForm
          householdCategories={categories}
          householdWallets={wallets}
          editTx={editTx}
          defaultType={defaultType}
          onSubmit={editTx ? async (data) => {
            await updateTransaction(editTx._raw?.id || editTx.id, data)
            setShowForm(false); setEditTx(null)
          } : async (tx) => {
            await addTransaction({ ...tx, household_id: householdId })
            setShowForm(false)
          }}
          onClose={() => { setShowForm(false); setEditTx(null) }}
        />
      )}
    </div>
  )
}
