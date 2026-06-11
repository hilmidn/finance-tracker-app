import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import SummaryCard from '../components/SummaryCard'
import TransactionItem from '../components/TransactionItem'
import TransactionForm from '../components/TransactionForm'
import MonthPicker from '../components/MonthPicker'
import { useTransactions } from '../hooks/useTransactions'
import { useCategories } from '../hooks/useCategories'

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Keuangan</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-indigo-600 text-white p-2.5 rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-colors"
        >
          <Plus size={22} />
        </button>
      </div>

      <MonthPicker value={month} onChange={setMonth} />

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <SummaryCard title="Pemasukan" amount={summary?.pemasukan} type="income" loading={summaryLoading} />
        <SummaryCard title="Pengeluaran" amount={summary?.pengeluaran} type="expense" loading={summaryLoading} />
        <SummaryCard title="Saldo" amount={summary?.saldo} type="total" loading={summaryLoading} />
      </div>

      {/* Recent transactions */}
      <div>
        <h2 className="font-semibold text-gray-700 mb-2">Transaksi Terbaru</h2>
        <div className="space-y-2">
          {recent.length === 0 ? (
            <p className="text-center text-gray-400 py-8 text-sm">Belum ada transaksi bulan ini</p>
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
