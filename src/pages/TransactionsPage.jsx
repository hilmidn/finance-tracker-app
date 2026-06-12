import { useState } from 'react'
import { Plus, ArrowLeftRight, Download } from 'lucide-react'
import TransactionItem from '../components/TransactionItem'
import TransactionForm from '../components/TransactionForm'
import MonthPicker from '../components/MonthPicker'
import { useTransactions } from '../hooks/useTransactions'
import { useCategories } from '../hooks/useCategories'
import { supabase } from '../lib/supabase'
import { exportToPDF } from '../utils/exportPdf'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

export default function TransactionsPage({ user }) {
  const userId = user.id
  const [month, setMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [showForm, setShowForm] = useState(false)
  const [editTx, setEditTx] = useState(null)

  const { transactions, loading, addTransaction, updateTransaction, deleteTransaction, deleteTransfer, fetchTransactions } = useTransactions(userId)
  const { categories } = useCategories(userId)

  const monthLabel = format(new Date(month + '-01'), 'MMMM yyyy', { locale: id })

  const handleExport = async () => {
    const savingsTransactions = transactions.filter(
      t => t.__type === 'transfer' && t._raw?.to_wallet?.is_savings
    )

    // Fetch wallet balances for ringkasan dompet
    const { data: wallets } = await supabase
      .from('wallets')
      .select('id, name, icon, initial_balance, is_savings')
      .eq('user_id', userId)

    const { data: txData } = await supabase
      .from('transactions')
      .select('wallet_id, type, amount')
      .eq('user_id', userId)

    const { data: trData } = await supabase
      .from('transfers')
      .select('from_wallet_id, to_wallet_id, amount')
      .eq('user_id', userId)

    // Compute balances
    const bal = {}
    wallets?.forEach(w => { bal[w.id] = w.initial_balance || 0 })
    txData?.forEach(t => {
      if (!t.wallet_id) return
      if (t.type === 'pemasukan') bal[t.wallet_id] = (bal[t.wallet_id] || 0) + t.amount
      else bal[t.wallet_id] = (bal[t.wallet_id] || 0) - t.amount
    })
    trData?.forEach(t => {
      if (t.from_wallet_id) bal[t.from_wallet_id] = (bal[t.from_wallet_id] || 0) - t.amount
      if (t.to_wallet_id) bal[t.to_wallet_id] = (bal[t.to_wallet_id] || 0) + t.amount
    })

    const walletSummary = wallets?.map(w => ({
      name: w.name,
      icon: w.icon || (w.is_savings ? '🐷' : '💳'),
      balance: bal[w.id] || 0,
      is_savings: w.is_savings,
    })) || []

    exportToPDF({
      transactions,
      user,
      monthLabel,
      savingsTransactions,
      walletSummary,
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Transaksi</h1>
        <div className="flex gap-2">
          {transactions.length > 0 && (
            <button
              onClick={handleExport}
              className="bg-gray-100 text-gray-700 p-3 rounded-xl hover:bg-gray-200 active:scale-95 transition-all"
              title="Export PDF"
            >
              <Download size={20} />
            </button>
          )}
          <button
            onClick={() => { setEditTx(null); setShowForm(true) }}
            className="bg-indigo-600 text-white p-3 rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all"
          >
            <Plus size={22} />
          </button>
        </div>
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
            {transactions.map(tx => {
              const key = tx.__type === 'transfer' ? `tr_${tx._raw?.id}` : `tx_${tx.id}`
              return (
                <TransactionItem
                  key={key}
                  tx={tx}
                  onDelete={(id, isTransfer) => {
                    if (isTransfer) deleteTransfer(id)
                    else deleteTransaction(id)
                  }}
                  onEdit={(t) => {
                    if (t.__type !== 'transfer') {
                      setEditTx({ ...t, category_id: t.category_id, wallet_id: t.wallet_id })
                      setShowForm(true)
                    }
                  }}
                />
              )
            })}
          </>
        )}
      </div>

      {showForm && (
        <TransactionForm
          categories={categories}
          editTx={editTx}
          onSubmit={editTx ? (data) => {
            updateTransaction(editTx.id, data)
            setShowForm(false)
            setEditTx(null)
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
