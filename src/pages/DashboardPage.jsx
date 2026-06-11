import { useState, useEffect } from 'react'
import { Plus, ArrowLeftRight, BarChart3, TrendingUp, TrendingDown } from 'lucide-react'
import BalanceCard from '../components/BalanceCard'
import TransactionItem from '../components/TransactionItem'
import TransactionForm from '../components/TransactionForm'
import MonthPicker from '../components/MonthPicker'
import { useTransactions } from '../hooks/useTransactions'
import { useCategories } from '../hooks/useCategories'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

export default function DashboardPage({ userId }) {
  const [month, setMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [summary, setSummary] = useState(null)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const { transactions, addTransaction, deleteTransaction, getSummary, fetchTransactions } = useTransactions(userId)
  const { categories } = useCategories(userId)

  const monthLabel = format(new Date(month + '-01'), 'MMMM yyyy', { locale: id })

  useEffect(() => {
    loadSummary()
    fetchTransactions(month)
  }, [month])

  const loadSummary = async () => {
    setSummaryLoading(true)
    const s = await getSummary(month)
    setSummary(s)
    setSummaryLoading(false)
  }

  const handleAdd = async (tx) => {
    await addTransaction(tx)
    loadSummary()
  }

  const handleDelete = async (id) => {
    await deleteTransaction(id)
    loadSummary()
  }

  const recent = transactions.slice(0, 5)

  // Morning greeting
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Pagi' : hour < 17 ? 'Siang' : 'Malam'

  return (
    <div className="space-y-5">
      {/* Header + greeting */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Selamat {greeting},</p>
          <h1 className="text-xl font-bold text-gray-900">Hilmi</h1>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-indigo-600 text-white p-3 rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all"
        >
          <Plus size={22} />
        </button>
      </div>

      {/* Balance Card — banking style */}
      <BalanceCard
        pemasukan={summary?.pemasukan}
        pengeluaran={summary?.pengeluaran}
        saldo={summary?.saldo}
        month={monthLabel}
        loading={summaryLoading}
      />

      {/* Quick Stats Pills */}
      {summary && !summaryLoading && (
        <div className="flex gap-2">
          <div className="flex-1 bg-green-50 border border-green-200 rounded-xl px-3 py-2.5">
            <div className="flex items-center gap-1 text-green-700 text-xs mb-0.5">
              <TrendingUp size={13} /> Pemasukan
            </div>
            <p className="text-sm font-bold text-green-700">Rp {summary.pemasukan.toLocaleString('id-ID')}</p>
          </div>
          <div className="flex-1 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
            <div className="flex items-center gap-1 text-red-500 text-xs mb-0.5">
              <TrendingDown size={13} /> Pengeluaran
            </div>
            <p className="text-sm font-bold text-red-500">Rp {summary.pengeluaran.toLocaleString('id-ID')}</p>
          </div>
        </div>
      )}

      {/* Recent transactions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-800">Transaksi Terbaru</h2>
          {transactions.length > 0 && (
            <span className="text-xs text-gray-400">{transactions.length} transaksi</span>
          )}
        </div>
        <div className="space-y-2">
          {recent.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-gray-100 rounded-2xl mb-3">
                <ArrowLeftRight size={24} className="text-gray-400" />
              </div>
              <p className="text-gray-400 text-sm">Belum ada transaksi</p>
              <p className="text-gray-300 text-xs mt-1">Ketuk + untuk mulai mencatat</p>
            </div>
          ) : (
            recent.map(tx => (
              <TransactionItem key={tx.id} tx={tx} onDelete={handleDelete} />
            ))
          )}
        </div>
      </div>

      {showForm && (
        <TransactionForm
          categories={categories}
          onSubmit={handleAdd}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  )
}
