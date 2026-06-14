import { useState, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeftRight, Plus, Wallet, TrendingUp, TrendingDown, PiggyBank, BarChart3 } from 'lucide-react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { useWallets } from '../hooks/useWallets'
import { useTransactions } from '../hooks/useTransactions'
import { useHousehold } from '../hooks/useHousehold'
import TransactionItem from '../components/TransactionItem'
import BalanceCard from '../components/BalanceCard'
import TransactionForm from '../components/TransactionForm'
import CreateHouseholdModal from '../components/CreateHouseholdModal'

export default function DashboardPageInner({ userId }) {
  const user = useSelector((s) => s.auth.user)
  const { wallets, balances, loading: walletsLoading, totalBalance, totalSavings, totalNonSavings } = useWallets(userId)
  const { transactions, loading: txLoading, addTransaction, updateTransaction, deleteTransaction, deleteTransfer } = useTransactions(userId)
  const { isMember, household, hasPendingInvite, loading: householdLoading } = useHousehold(userId)

  const [showForm, setShowForm] = useState(false)
  const [showCreateHousehold, setShowCreateHousehold] = useState(false)
  const [editTx, setEditTx] = useState(null)
  const navigate = useNavigate()

  const recentTransactions = useMemo(() => {
    return transactions
      .slice()
      .sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.id || 0) - (a.id || 0))
      .slice(0, 5)
  }, [transactions])

  const todayLabel = format(new Date(), "EEEE, d MMMM yyyy", { locale: id })

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs text-gray-500">{todayLabel}</p>
        <h1 className="text-xl font-bold">Halo, {user?.user_metadata?.full_name || 'kamu'} 👋</h1>
      </div>

      <BalanceCard
        totalBalance={totalBalance}
        totalSavings={totalSavings}
        totalNonSavings={totalNonSavings}
        walletCount={wallets.length}
      />

      {/* CTA: Buat household / Lihat household */}
      {!householdLoading && !isMember && !hasPendingInvite && (
        <button
          onClick={() => setShowCreateHousehold(true)}
          className="w-full bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100 rounded-xl p-4 hover:from-indigo-100 hover:to-violet-100 transition-colors text-left"
        >
          <p className="text-sm font-semibold text-indigo-700">Bikin Household? 🏠</p>
          <p className="text-xs text-indigo-600 mt-0.5">Catat keuangan bareng pasangan/keluarga. Sharing dompet & transaksi.</p>
        </button>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => setShowForm(true)}
          className="flex items-center justify-center gap-2 bg-indigo-600 text-white rounded-xl py-3.5 shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all">
          <Plus size={20} /> <span className="text-sm font-semibold">Catat</span>
        </button>
        <button onClick={() => navigate('/wallets')}
          className="flex items-center justify-center gap-2 bg-white border border-gray-200 rounded-xl py-3.5 hover:bg-gray-50 active:scale-95 transition-all">
          <Wallet size={20} className="text-gray-700" /> <span className="text-sm font-semibold text-gray-700">Dompet</span>
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <p className="text-sm font-semibold text-gray-800">Dompet</p>
          <Link to="/wallets" className="text-xs text-indigo-600 font-medium">Lihat semua</Link>
        </div>
        {walletsLoading ? (
          <div className="h-20 bg-gray-200 rounded-xl animate-pulse" />
        ) : wallets.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-xl p-6 text-center">
            <Wallet size={28} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">Belum ada dompet</p>
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
            <p className="text-sm text-gray-500">Belum ada transaksi</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentTransactions.map(tx => {
              const key = tx.__type === 'transfer' ? `tr_${tx._raw?.id}` : `tx_${tx.id}`
              return (
                <TransactionItem
                  key={key} tx={tx}
                  isHouseholdMember={isMember}
                  onDelete={(id, isTransfer) => { isTransfer ? deleteTransfer(id) : deleteTransaction(id) }}
                  onEdit={(t) => {
                    if (t.__type !== 'transfer') { setEditTx({ ...t, category_id: t.category_id, wallet_id: t.wallet_id }); setShowForm(true) }
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
            })}
          </div>
        )}
      </div>

      {showForm && (
        <TransactionForm
          userId={userId}
          categories={null}  // form fetches its own
          wallets={wallets}
          editTx={editTx}
          onSubmit={editTx ? (data) => {
            updateTransaction(editTx.id, data)
            setShowForm(false); setEditTx(null)
          } : async (tx) => {
            await addTransaction(tx)
            setShowForm(false)
          }}
          onClose={() => { setShowForm(false); setEditTx(null) }}
        />
      )}

      {showCreateHousehold && (
        <CreateHouseholdModal onClose={() => setShowCreateHousehold(false)} />
      )}
    </div>
  )
}
