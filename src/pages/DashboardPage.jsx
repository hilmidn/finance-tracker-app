import { useState, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { Plus, ArrowLeftRight, PiggyBank, Wallet } from 'lucide-react'
import BalanceCard from '../components/BalanceCard'
import HouseholdSummaryCard from '../components/HouseholdSummaryCard'
import TransactionItem from '../components/TransactionItem'
import TransactionForm from '../components/TransactionForm'
import MonthPicker from '../components/MonthPicker'
import { useTransactions, useSummary } from '../hooks/useTransactions'
import { useWallets } from '../hooks/useWallets'
import { useCategories } from '../hooks/useCategories'
import { useHousehold } from '../hooks/useHousehold'
import { useHouseholdMembers } from '../hooks/useHouseholdMembers'
import { useHouseholdSummary } from '../hooks/useHouseholdSummary'
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
  const { wallets } = useWallets(userId)
  const { categories } = useCategories(userId)
  const { data: summary } = useSummary(userId, month)

  // Household context
  const { household, isMember } = useHousehold(userId)
  const { members } = useHouseholdMembers(household?.id)
  const householdSummary = useHouseholdSummary(household?.id, members)

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
        saldo={summary?.saldo}
        month={monthLabel}
        loading={!summary}
        operasionalBalance={operasionalBalance}
        savingsBalance={savingsBalance}
        pemasukan={summary?.pemasukan}
        pengeluaran={summary?.pengeluaran}
      />

      {/* Household summary card (only if user is a member) */}
      {isMember && household && (
        <HouseholdSummaryCard
          household={household}
          memberCount={householdSummary.memberCount}
          totalBalance={householdSummary.totalBalance}
          monthSummary={householdSummary.monthSummary}
          loading={householdSummary.loading}
        />
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
                  isHouseholdMember={isMember}
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
                  onShare={(t) => {
                    setEditTx({ ...t, category_id: t.category_id, wallet_id: t.wallet_id, _forceShare: true })
                    setShowForm(true)
                  }}
                  onUnshare={async (t) => {
                    await updateTransaction(t.id, {
                      shared_to_household_id: null,
                      household_category_id: null,
                      household_wallet_id: null,
                    })
                  }}
                />
              )
            })
          )}
        </div>
      </div>

      {showForm && (
        <TransactionForm
          userId={userId}
          categories={categories}
          wallets={wallets}
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
