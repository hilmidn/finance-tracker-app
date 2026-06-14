import { useState } from 'react'
import { useSelector } from 'react-redux'
import { Plus, Wallet, Trash2, Pencil, X, PiggyBank } from 'lucide-react'
import { useHouseholdWallets } from '../hooks/useHouseholdWallets'
import HouseholdWalletBalanceCard from '../components/HouseholdWalletBalanceCard'
import AddHouseholdWalletModal from '../components/AddHouseholdWalletModal'
import ConfirmModal from '../components/ConfirmModal'

const WALLET_ICONS = { cash: '👛', bank: '🏦', 'e-wallet': '📱' }
const WALLET_TYPES = [
  { value: 'cash', label: 'Tunai' },
  { value: 'bank', label: 'Bank' },
  { value: 'e-wallet', label: 'E-Wallet' },
]

/**
 * Household wallets page. Rendered when scope.isHousehold is true.
 * Receives the scope from the parent so it doesn't have to do its
 * own mode detection.
 */
export default function HouseholdWalletsPage({ scope }) {
  const householdId = scope.householdId
  const { wallets, balances, loading, deleteWallet } = useHouseholdWallets(householdId)
  const [showAdd, setShowAdd] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(null)  // wallet object or null
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteWallet(pendingDelete.id)
      setPendingDelete(null)
    } catch (err) {
      setDeleteError(err.message)
      throw err  // keep modal open
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Dompet</h1>
          <p className="text-xs text-gray-500 mt-0.5">{wallets.length} dompet household</p>
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
                <button onClick={() => { setDeleteError(null); setPendingDelete(w) }}
                  aria-label={`Hapus dompet ${w.name}`}
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

      <ConfirmModal
        isOpen={!!pendingDelete}
        onClose={() => { if (!deleting) { setPendingDelete(null); setDeleteError(null) } }}
        onConfirm={handleConfirmDelete}
        title={
          deleteError ? 'Gagal menghapus dompet household' :
          `Hapus dompet "${pendingDelete?.name}"?`
        }
        message={
          deleteError ||
          'Saldo awal akan hilang dari total household. Transaksi terkait (kalau ada) tetap tersimpan tanpa reference dompet ini.'
        }
        confirmText={deleteError ? 'Tutup' : 'Hapus'}
        cancelText="Batal"
        variant="danger"
        loading={deleting}
      />
    </div>
  )
}
