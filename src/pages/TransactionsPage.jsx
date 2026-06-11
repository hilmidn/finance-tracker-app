import { useState } from 'react'
import { Plus, ArrowLeftRight } from 'lucide-react'
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

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Transaksi</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-indigo-600 text-white p-3 rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all"
        >
          <Plus size={22} />
        </button>
      </div>

      <MonthPicker value={month} onChange={(m) => { setMonth(m); fetchTransactions(m) }} />

      <div className="space-y-2">
        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-gray-100 rounded-2xl mb-3">
              <ArrowLeftRight size={24} className="text-gray-400" />
            </div>
            <p className="text-gray-400 text-sm">Belum ada transaksi</p>
            <p className="text-gray-300 text-xs mt-1">Bulan ini masih kosong</p>
          </div>
        ) : (
          <>
            <div className="text-xs text-gray-400 font-medium px-1">{transactions.length} transaksi</div>
            {transactions.map(tx => (
              <TransactionItem key={tx.id} tx={tx} onDelete={deleteTransaction} />
            ))}
          </>
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
