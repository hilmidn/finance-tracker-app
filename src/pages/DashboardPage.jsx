import { useState, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { Plus, ArrowLeftRight, PiggyBank, TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import BalanceCard from '../components/BalanceCard'
import TransactionItem from '../components/TransactionItem'
import TransactionForm from '../components/TransactionForm'
import MonthPicker from '../components/MonthPicker'
import { useTransactions, useSummary, useMonthlySavings } from '../hooks/useTransactions'
import { useWallets } from '../hooks/useWallets'
import { useCategories } from '../hooks/useCategories'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

export default function DashboardPage() {
  const user = useSelector((s) => s.auth.user)
  const userId = user?.id

  const [month, setMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [showForm, setShowForm] = useState(false)
  const [editTx, setEditTx] = useState(null)

  const { transactions, addTransaction, updateTransaction, deleteTransaction, deleteTransfer } = useTransactions(userId)
  const { wallets, loading: walletsLoading } = useWallets(userId)
  const { categories } = useCategories(userId)
  const { data: summary } = useSummary(userId, month)
  const { data: monthlySavings = 0, isLoading: savingsLoading } = useMonthlySavings(userId, month)

  const monthLabel = format(new Date(month + '-01'), 'MMMM yyyy', { locale: id })

  // Hitung saldo dari cache React Query — zero network
  const walletBalances = useMemo(() => {
    const b = {}
    wallets.forEach(w => { b[w.id] = w.initial_balance || 0 })
    transactions.forEach(t => {
      if (t.__type === 'transfer' && t._raw) {
        if (t._raw.from_wallet_id) b[t._raw.from_wallet_id] = (b[t._raw.from_wallet_id] || 0) - t._raw.amount
        if (t._raw.to_wallet_id) b[t._raw.to_wallet_id] = (b[t._raw.to_wallet_id] || 0) + t._raw.amount
      } else if (t.wallet_id) {
        if (t.type === 'pemasukan') b[t.wallet_id] = (b[t.wallet_id] || 0) + t.amount
        else b[t.wallet_id] = (b[t.wallet_id] || 0) - t.amount
      }
    })
    return b
  }, [wallets, transactions])

  const operasionalWallets = wallets.filter(w => !w.is_savings)
  const savingsWallets = wallets.filter(w => w.is_savings)
  const totalBalance = Object.values(walletBalances).reduce((s, b) => s + (b || 0), 0)
  const operasionalBalance = operasionalWallets.reduce((s, w) => s + (walletBalances[w.id] || 0), 0)
  const savingsBalance = savingsWallets.reduce((s, w) => s + (walletBalances[w.id] || 0), 0)

  const recent = transactions.slice(0, 5)
  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Pagi' : hour < 17 ? 'Siang' : 'Malam'

  return (
    <div className="space-y-5">
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

      <BalanceCard
        pemasukan={summary?.pemasukan}
        pengeluaran={summary?.pengeluaran}
        saldo={summary?.saldo}
        month={monthLabel}
        loading={!summary}
      />

      {!walletsLoading && wallets.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
            <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-1">
              <Wallet size={13} /> Saldo Operasional
            </div>
            <p className="text-sm font-bold text-gray-900">Rp {operasionalBalance.toLocaleString('id-ID')}</p>
          </div>
          <div className="bg-white rounded-xl border border-amber-100 p-3 shadow-sm">
            <div className="flex items-center gap-1.5 text-amber-600 text-xs mb-1">
              <PiggyBank size={13} /> Tabungan
            </div>
            <p className="text-sm font-bold text-amber-700">Rp {savingsBalance.toLocaleString('id-ID')}</p>
          </div>
        </div>
      )}

      {summary && (
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
          <div className="flex-1 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
            <div className="flex items-center gap-1 text-amber-600 text-xs mb-0.5">
              <PiggyBank size={13} /> Menabung
            </div>
            {savingsLoading ? (
              <div className="h-4 w-16 bg-amber-200 rounded animate-pulse" />
            ) : (
              <p className="text-sm font-bold text-amber-700">Rp {monthlySavings.toLocaleString('id-ID')}</p>
            )}
          </div>
        </div>
      )}

      {operasionalWallets.length > 0 && (
        <div>
          <h2 className="font-semibold text-gray-800 mb-2">Dompet & Rekening</h2>
          <div className="space-y-1.5">
            {operasionalWallets.map(w => (
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
                <span className={`text-sm font-bold ${(walletBalances[w.id] || 0) >= 0 ? 'text-gray-900' : 'text-red-500'}`}>
                  Rp {(walletBalances[w.id] || 0).toLocaleString('id-ID')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {savingsWallets.length > 0 && (
        <div>
          <h2 className="font-semibold text-amber-800 mb-2 flex items-center gap-1.5">
            <PiggyBank size={15} /> Tabungan
          </h2>
          <div className="space-y-1.5">
            {savingsWallets.map(w => (
              <div key={w.id} className="flex items-center justify-between bg-amber-50/50 rounded-xl px-4 py-2.5 shadow-sm border border-amber-100">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-lg">{w.icon || '🏦'}</span>
                  <span className="text-sm font-medium text-gray-700 truncate">{w.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium bg-amber-100 text-amber-700">Tabungan</span>
                </div>
                <span className="text-sm font-bold text-amber-700">Rp {(walletBalances[w.id] || 0).toLocaleString('id-ID')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

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
            })
          )}
        </div>
      </div>

      {showForm && (
        <TransactionForm
          categories={categories}
          wallets={wallets}
          editTx={editTx}
          userId={userId}
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
