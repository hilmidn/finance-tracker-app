import { useState, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { ArrowLeftRight, Plus, Wallet, Home, Users, ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { useHouseholdWallets } from '../hooks/useHouseholdWallets'
import { useHouseholdTransactions } from '../hooks/useHouseholdTransactions'
import { useHouseholdMembers } from '../hooks/useHouseholdMembers'
import { useHouseholdCategories } from '../hooks/useHouseholdCategories'
import HouseholdWalletBalanceCard from '../components/organisms/cards/HouseholdWalletBalanceCard'
import HouseholdTransactionItem from '../components/organisms/list/HouseholdTransactionItem'
import HouseholdTransactionForm from '../components/organisms/forms/HouseholdTransactionForm'
import AddHouseholdWalletModal from '../components/organisms/modals/AddHouseholdWalletModal'

export default function HouseholdDashboardPage({ scope }) {
  const user = useSelector((s) => s.auth.user)
  const userId = user?.id
  const householdId = scope.householdId

  const { wallets, balances, loading: walletsLoading } = useHouseholdWallets(householdId)
  const { transactions, loading: txLoading, addTransaction, updateTransaction, deleteTransaction, unshareSharedTransaction } =
    useHouseholdTransactions(householdId, userId)
  const { members } = useHouseholdMembers(householdId)
  const { raw: rawCategories } = useHouseholdCategories(householdId)

  const [showForm, setShowForm] = useState(false)
  const [showAddWallet, setShowAddWallet] = useState(false)
  const [editTx, setEditTx] = useState(null)

  const recentTransactions = useMemo(() => {
    return transactions
      .slice()
      .sort((a, b) => {
        const d1 = a._raw?.date || a.date || ''
        const d2 = b._raw?.date || b.date || ''
        return d2.localeCompare(d1)
      })
      .slice(0, 5)
  }, [transactions])

  const categories = useMemo(() => {
    const cats = rawCategories || []
    return {
      pengeluaran: cats.filter(c => c.type === 'pengeluaran'),
      pemasukan: cats.filter(c => c.type === 'pemasukan'),
    }
  }, [rawCategories])

  const todayLabel = format(new Date(), "EEEE, d MMMM yyyy", { locale: id })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">{todayLabel}</p>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Home size={20} className="text-violet-600" /> {scope.household?.name}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
            <Users size={11} /> {members.length} anggota
          </p>
        </div>
      </div>

      <HouseholdWalletBalanceCard householdId={householdId} />

      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => setShowForm(true)}
          className="flex items-center justify-center gap-2 bg-indigo-600 text-white rounded-xl py-3.5 shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all">
          <Plus size={20} /> <span className="text-sm font-semibold">Catat</span>
        </button>
        <button onClick={() => setShowAddWallet(true)}
          className="flex items-center justify-center gap-2 bg-white border border-gray-200 rounded-xl py-3.5 hover:bg-gray-50 active:scale-95 transition-all">
          <Wallet size={20} className="text-gray-700" /> <span className="text-sm font-semibold text-gray-700">Dompet</span>
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <p className="text-sm font-semibold text-gray-800">Dompet Household</p>
          <Link to="/wallets" className="text-xs text-indigo-600 font-medium">Lihat semua</Link>
        </div>
        {walletsLoading ? (
          <div className="h-20 bg-gray-200 rounded-xl animate-pulse" />
        ) : wallets.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-xl p-6 text-center">
            <Wallet size={28} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">Belum ada dompet household</p>
            <button onClick={() => setShowAddWallet(true)}
              className="mt-2 text-xs text-indigo-600 font-medium">+ Tambah dompet</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {wallets.slice(0, 4).map(w => (
              <div key={w.id} className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-base">{w.icon || (w.is_savings ? '🐷' : w.type === 'cash' ? '👛' : w.type === 'bank' ? '🏦' : '📱')}</span>
                  <p className="text-xs font-medium text-gray-700 truncate">{w.name}</p>
                </div>
                <p className="text-sm font-bold text-gray-900">Rp {(balances[w.id] || 0).toLocaleString('id-ID')}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <p className="text-sm font-semibold text-gray-800">Transaksi Terbaru</p>
          <Link to="/transactions" className="text-xs text-indigo-600 font-medium">Lihat semua</Link>
        </div>
        {txLoading ? (
          <div className="h-32 bg-gray-200 rounded-xl animate-pulse" />
        ) : recentTransactions.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-xl p-6 text-center">
            <ArrowLeftRight size={28} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">Belum ada transaksi household</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentTransactions.map(tx => (
              <HouseholdTransactionItem
                key={tx.id}
                tx={tx}
                currentUserId={userId}
                onEdit={(t) => { setEditTx(t); setShowForm(true) }}
                onDelete={async (id, isShared) => {
                  if (isShared) {
                    try { await unshareSharedTransaction(id) } catch (err) { console.error(err); throw err }
                  } else {
                    await deleteTransaction(id)
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <HouseholdTransactionForm
          householdCategories={categories}
          householdWallets={wallets}
          editTx={editTx}
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

      {showAddWallet && (
        <AddHouseholdWalletModal
          householdId={householdId}
          onClose={() => setShowAddWallet(false)}
        />
      )}
    </div>
  )
}
