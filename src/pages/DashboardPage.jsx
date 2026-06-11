import { useState, useEffect } from 'react'
import { Plus, ArrowLeftRight, BarChart3, TrendingUp, TrendingDown } from 'lucide-react'
import BalanceCard from '../components/BalanceCard'
import TransactionItem from '../components/TransactionItem'
import TransactionForm from '../components/TransactionForm'
import MonthPicker from '../components/MonthPicker'
import { useTransactions } from '../hooks/useTransactions'
import { useWallets } from '../hooks/useWallets'
import { useCategories } from '../hooks/useCategories'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

export default function DashboardPage({ user }) {
  const userId = user.id
  const [month, setMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [summary, setSummary] = useState(null)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editTx, setEditTx] = useState(null)
  const [walletBalances, setWalletBalances] = useState({})
  const [walletBalLoading, setWalletBalLoading] = useState(true)

  const { transactions, addTransaction, updateTransaction, deleteTransaction, deleteTransfer, getSummary, fetchTransactions } = useTransactions(userId)
  const { wallets, getWalletBalances } = useWallets(userId)
  const { categories } = useCategories(userId)

  const monthLabel = format(new Date(month + '-01'), 'MMMM yyyy', { locale: id })

  useEffect(() => {
    loadSummary()
    fetchTransactions(month)
    loadWalletBalances()
  }, [month])

  const loadWalletBalances = async () => {
    setWalletBalLoading(true)
    const b = await getWalletBalances()
    setWalletBalances(b)
    setWalletBalLoading(false)
  }

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

  const handleEdit = async (tx) => {
    const { id, ...updates } = tx
    await updateTransaction(id, updates)
    loadSummary()
  }

  const handleDelete = async (id, isTransfer) => {
    if (isTransfer) {
      await deleteTransfer(id)
    } else {
      await deleteTransaction(id)
    }
    loadSummary()
  }

  const recent = transactions.slice(0, 5)

  // Display name from email or metadata
  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'

  // Morning greeting
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Pagi' : hour < 17 ? 'Siang' : 'Malam'

  return (
    <div className="space-y-5">
      {/* Header + greeting */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Selamat {greeting},</p>
          <h1 className="text-xl font-bold text-gray-900">{displayName}</h1>
        </div>
        <button
          onClick={() => { setEditTx(null); setShowForm(true) }}
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

      {/* Wallet Balances Mini */}
      {wallets.length > 0 && (
        <div>
          <h2 className="font-semibold text-gray-800 mb-2">Dompet & Rekening</h2>
          <div className="space-y-1.5">
            {wallets.map(w => (
              <div key={w.id} className="flex items-center justify-between bg-white rounded-xl px-4 py-2.5 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-lg">{w.icon || '💳'}</span>
                  <span className="text-sm font-medium text-gray-700 truncate">{w.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
                    w.type === 'cash' ? 'bg-green-100 text-green-700' :
                    w.type === 'bank' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                  }`}>
                    {w.type === 'cash' ? 'Tunai' : w.type === 'bank' ? 'Bank' : 'E-Wallet'}
                  </span>
                </div>
                {walletBalLoading ? (
                  <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                ) : (
                  <span className={`text-sm font-bold ${(walletBalances[w.id] || 0) >= 0 ? 'text-gray-900' : 'text-red-500'}`}>
                    Rp {(walletBalances[w.id] || 0).toLocaleString('id-ID')}
                  </span>
                )}
              </div>
            ))}
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
            recent.map(tx => {
              const key = tx.__type === 'transfer' ? `tr_${tx._raw?.id}` : `tx_${tx.id}`
              return (
                <TransactionItem
                  key={key}
                  tx={tx}
                  onDelete={handleDelete}
                  onEdit={(t) => {
                    if (t.__type !== 'transfer') {
                      setEditTx({ ...t, category_id: t.category_id, wallet_id: t.wallet_id })
                      setShowForm(true)
                    }
                  }}
                />
              )
            })
          )}
        </div>
      </div>

      {showForm && (
        <TransactionForm
          categories={categories}
          editTx={editTx}
          onSubmit={editTx ? (data) => handleEdit({ id: editTx.id, ...data }) : handleAdd}
          onClose={() => { setShowForm(false); setEditTx(null) }}
        />
      )}
    </div>
  )
}
