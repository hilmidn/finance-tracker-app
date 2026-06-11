import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import TransactionItem from '../components/TransactionItem'
import TransactionForm from '../components/TransactionForm'
import MonthPicker from '../components/MonthPicker'
import { useTransactions } from '../hooks/useTransactions'
import { useCategories } from '../hooks/useCategories'

export default function TransactionsPage({ userId }) {
  const [month, setMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [showForm, setShowForm] = useState(false)

  const { transactions, loading, addTransaction, deleteTransaction, fetchTransactions } = useTransactions(userId)
  const { categories } = useCategories(userId)

  useEffect(() => {
    fetchTransactions(month)
  }, [month])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Transaksi</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-indigo-600 text-white p-2.5 rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-colors"
        >
          <Plus size={22} />
        </button>
      </div>

      <MonthPicker value={month} onChange={setMonth} />

      <div className="space-y-2">
        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <p className="text-center text-gray-400 py-12 text-sm">Belum ada transaksi bulan ini</p>
        ) : (
          transactions.map(tx => (
            <TransactionItem key={tx.id} tx={tx} onDelete={deleteTransaction} />
          ))
        )}
      </div>

      {showForm && (
        <TransactionForm
          categories={categories}
          onSubmit={async (tx) => {
            await addTransaction(tx)
            setShowForm(false)
          }}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  )
}
