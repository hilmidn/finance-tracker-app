import { useState } from 'react'
import { useSelector } from 'react-redux'
import { Plus, Wallet, Trash2, Pencil, ArrowLeftRight, X, PiggyBank } from 'lucide-react'
import { useHouseholdWallets } from '../hooks/useHouseholdWallets'
import { useHousehold } from '../hooks/useHousehold'
import HouseholdWalletBalanceCard from '../components/HouseholdWalletBalanceCard'
import AddHouseholdWalletModal from '../components/AddHouseholdWalletModal'

const WALLET_ICONS = { cash: '👛', bank: '🏦', 'e-wallet': '📱' }
const WALLET_TYPES = [
  { value: 'cash', label: 'Tunai' },
  { value: 'bank', label: 'Bank' },
  { value: 'e-wallet', label: 'E-Wallet' },
]

export default function HouseholdWalletsPage() {
  const user = useSelector((s) => s.auth.user)
  const userId = user?.id
  // Use useHousehold (RPC-backed) instead of Redux currentHouseholdId
  // because Redux state is lost on page reload. The RPC always finds
  // the user's membership even after reload.
  const { household, isMember, loading: householdLoading } = useHousehold(userId)
  const householdId = household?.id
  const { wallets, balances, loading, deleteWallet } = useHouseholdWallets(householdId)
  const [showAdd, setShowAdd] = useState(false)

  if (householdLoading) {
    return (
      <div className="space-y-3">
        <div className="h-20 bg-gray-200 rounded-xl animate-pulse" />
        <div className="h-20 bg-gray-200 rounded-xl animate-pulse" />
      </div>
    )
  }

  if (!isMember) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400 text-sm">Kamu belum punya household</p>
        <p className="text-gray-300 text-xs mt-1">Buat household dulu di Pengaturan</p>
      </div>
    )
  }

  const handleDelete = async (w) => {
    if (!confirm(`Hapus dompet "${w.name}"?`)) return
    await deleteWallet(w.id)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Dompet Household</h1>
          <p className="text-xs text-gray-500 mt-0.5">{wallets.length} dompet / rekening</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="bg-indigo-600 text-white p-3 rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all">
          <Plus size={22} />
        </button>
      </div>

      <HouseholdWalletBalanceCard householdId={householdId} />

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-20 bg-gray-200 rounded-xl animate-pulse" />)}</div>
      ) : wallets.length === 0 ? (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gray-100 rounded-2xl mb-3">
            <Wallet size={24} className="text-gray-400" />
          </div>
          <p className="text-gray-400 text-sm">Belum ada dompet household</p>
          <p className="text-gray-300 text-xs mt-1">Tambah dompet untuk mulai mencatat</p>
        </div>
      ) : (
        <div className="space-y-3">
          {wallets.map(w => (
            <div key={w.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl ${
                  w.is_savings ? 'bg-amber-50' : w.type === 'cash' ? 'bg-green-50' : w.type === 'bank' ? 'bg-blue-50' : 'bg-purple-50'
                }`}>
                  {w.icon || WALLET_ICONS[w.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900">{w.name}</p>
                    {w.is_savings ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium bg-amber-100 text-amber-700">Tabungan</span>
                    ) : (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
                        w.type === 'cash' ? 'bg-green-100 text-green-700' : w.type === 'bank' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                      }`}>
                        {WALLET_TYPES.find(t => t.value === w.type)?.label}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-bold mt-0.5 text-gray-900">
                    Rp {(balances[w.id] || 0).toLocaleString('id-ID')}
                  </p>
                </div>
                <button onClick={() => handleDelete(w)}
                  className="p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <AddHouseholdWalletModal
          householdId={householdId}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  )
}
