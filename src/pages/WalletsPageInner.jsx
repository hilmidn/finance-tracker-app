import { useState, useMemo } from 'react'
import { Plus, Wallet, Building2, Smartphone, Trash2, Pencil, ArrowLeftRight, X, PiggyBank } from 'lucide-react'
import { useWallets } from '../hooks/useWallets'
import { useTransfers } from '../hooks/useTransfers'
import { useTransactions } from '../hooks/useTransactions'
import TransferForm from '../components/organisms/forms/TransferForm'
import ConfirmModal from '../components/ConfirmModal'

const WALLET_ICONS = { cash: '👛', bank: '🏦', 'e-wallet': '📱' }
const WALLET_TYPES = [
  { value: 'cash', label: 'Tunai', icon: '👛' },
  { value: 'bank', label: 'Rekening Bank', icon: '🏦' },
  { value: 'e-wallet', label: 'E-Wallet', icon: '📱' },
]

export default function WalletsPageInner({ userId }) {
  const { wallets, loading, addWallet, updateWallet, deleteWallet } = useWallets(userId)
  const { transfers, addTransfer } = useTransfers(userId)
  const { transactions } = useTransactions(userId)

  // Hitung saldo dari cache React Query — zero network
  const balances = useMemo(() => {
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
  const [showAdd, setShowAdd] = useState(false)
  const [showTransfer, setShowTransfer] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({ name: '', type: 'cash', icon: '', initial_balance: '', is_savings: false })
  const [submitting, setSubmitting] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(null)  // wallet object or null
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  const totalBalance = Object.values(balances).reduce((sum, b) => sum + (b || 0), 0)
  const operasionalBalance = wallets.filter(w => !w.is_savings).reduce((s, w) => s + (balances[w.id] || 0), 0)
  const savingsBalance = wallets.filter(w => w.is_savings).reduce((s, w) => s + (balances[w.id] || 0), 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSubmitting(true)
    if (editId) {
      await updateWallet(editId, { name: form.name, type: form.type, icon: form.icon, is_savings: form.is_savings })
    } else {
      await addWallet({ name: form.name, type: form.type, icon: form.icon, initial_balance: parseInt(form.initial_balance) || 0, is_savings: form.is_savings })
    }
    setSubmitting(false); setShowAdd(false); setEditId(null)
    setForm({ name: '', type: 'cash', icon: '', initial_balance: '', is_savings: false })
  }

  const handleEdit = (w) => {
    setEditId(w.id)
    setForm({ name: w.name, type: w.type, icon: w.icon || '', initial_balance: '', is_savings: w.is_savings || false })
    setShowAdd(true)
  }

  const handleDelete = async (w) => {
    setPendingDelete(w)
  }

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

  const txCountForWallet = (walletId) =>
    transactions.filter(t => t.wallet_id === walletId).length

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Dompet</h1>
          <p className="text-xs text-gray-500 mt-0.5">{wallets.length} dompet / rekening</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowTransfer(true)} className="bg-gray-100 text-gray-700 p-3 rounded-xl hover:bg-gray-200 active:scale-95 transition-all">
            <ArrowLeftRight size={20} />
          </button>
          <button onClick={() => { setEditId(null); setForm({ name: '', type: 'cash', icon: '', initial_balance: '', is_savings: false }); setShowAdd(true) }}
            className="bg-indigo-600 text-white p-3 rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all">
            <Plus size={22} />
          </button>
        </div>
      </div>

      <div className="bg-gradient-to-r from-indigo-500 to-violet-500 rounded-2xl p-5 text-white shadow-xl shadow-indigo-200/50">
        <p className="text-sm text-indigo-200 font-medium">Total Saldo</p>
        {loading ? <div className="h-10 w-48 bg-white/20 rounded-lg animate-pulse mt-2" />
        : <p className="text-3xl font-bold tracking-tight mt-1">Rp {(totalBalance || 0).toLocaleString('id-ID')}</p>}
        {!loading && wallets.length > 0 && (
          <div className="flex gap-4 mt-3 pt-3 border-t border-white/15 text-sm">
            <div><p className="text-xs text-indigo-200">Operasional</p><p className="font-semibold text-white">Rp {(operasionalBalance || 0).toLocaleString('id-ID')}</p></div>
            <div><p className="text-xs text-amber-200">Tabungan</p><p className="font-semibold text-amber-200">Rp {(savingsBalance || 0).toLocaleString('id-ID')}</p></div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-20 bg-gray-200 rounded-xl animate-pulse" />)}</div>
      ) : wallets.length === 0 ? (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gray-100 rounded-2xl mb-3"><Wallet size={24} className="text-gray-400" /></div>
          <p className="text-gray-400 text-sm">Belum ada dompet</p>
          <p className="text-gray-300 text-xs mt-1">Buat dompet atau rekening pertama kamu</p>
        </div>
      ) : (
        <div className="space-y-3">
          {wallets.map(w => (
            <div key={w.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl ${w.is_savings ? 'bg-amber-50' : w.type === 'cash' ? 'bg-green-50' : w.type === 'bank' ? 'bg-blue-50' : 'bg-purple-50'}`}>
                  {w.icon || WALLET_ICONS[w.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900">{w.name}</p>
                    {w.is_savings ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium bg-amber-100 text-amber-700 flex items-center gap-0.5"><PiggyBank size={10} /> Tabungan</span>
                    ) : (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${w.type === 'cash' ? 'bg-green-100 text-green-700' : w.type === 'bank' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                        {WALLET_TYPES.find(t => t.value === w.type)?.label || w.type}
                      </span>
                    )}
                  </div>
                  <p className={`text-sm font-bold mt-0.5 ${(balances[w.id] || 0) >= 0 ? 'text-gray-900' : 'text-red-500'}`}>
                    Rp {(balances[w.id] || 0).toLocaleString('id-ID')}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(w)} aria-label={`Edit dompet ${w.name}`} className="p-1.5 text-gray-300 hover:text-indigo-500 transition-colors rounded-lg hover:bg-indigo-50"><Pencil size={14} /></button>
                  <button onClick={() => handleDelete(w)} aria-label={`Hapus dompet ${w.name}`} className="p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showTransfer && (
        <TransferForm userId={userId} wallets={wallets} onSubmit={async (tr) => {
          await addTransfer(tr); setShowTransfer(false);
        }} onClose={() => setShowTransfer(false)} />
      )}

      <ConfirmModal
        isOpen={!!pendingDelete}
        onClose={() => { if (!deleting) { setPendingDelete(null); setDeleteError(null) } }}
        onConfirm={handleConfirmDelete}
        title={
          deleteError ? 'Gagal menghapus dompet' :
          `Hapus dompet "${pendingDelete?.name}"?`
        }
        message={
          deleteError ||
          (() => {
            const txCount = txCountForWallet(pendingDelete?.id)
            if (txCount > 0) {
              return `Dompet ini dipakai ${txCount} transaksi. Hapus dompet akan mengosongkan saldo awal dari total, tapi transaksi terkait tidak akan terhapus.`
            }
            return 'Saldo awal akan hilang dari total. Transaksi terkait (kalau ada) tetap tersimpan tanpa reference dompet ini.'
          })()
        }
        confirmText={deleteError ? 'Tutup' : 'Hapus'}
        cancelText="Batal"
        variant="danger"
        loading={deleting}
      />

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">{editId ? 'Edit Dompet' : 'Tambah Dompet'}</h2>
              <button onClick={() => { setShowAdd(false); setEditId(null) }} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><X size={20} className="text-gray-500" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Tipe</label>
                <div className="grid grid-cols-3 gap-2">
                  {WALLET_TYPES.map(t => (
                    <button key={t.value} type="button" onClick={() => setForm(f => ({ ...f, type: t.value }))}
                      className={`flex flex-col items-center gap-1 py-3 rounded-xl border text-sm font-medium transition-all ${form.type === t.value ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                      <span className="text-xl">{t.icon}</span>
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Nama Dompet</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder={form.type === 'cash' ? 'Dompet Harian' : form.type === 'bank' ? 'BCA, Mandiri...' : 'GoPay, OVO...'} required
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Icon (opsional)</label>
                <input type="text" value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} placeholder="👛 🏦 📱 💳" maxLength={10}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
              </div>
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <button type="button" onClick={() => setForm(f => ({ ...f, is_savings: !f.is_savings }))}
                    className={`w-11 h-6 rounded-full transition-colors relative ${form.is_savings ? 'bg-amber-500' : 'bg-gray-200'}`}>
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${form.is_savings ? 'translate-x-5' : ''}`} />
                  </button>
                  <div className="flex items-center gap-1.5 text-sm text-gray-700"><PiggyBank size={16} className="text-amber-600" /><span>Jadikan Tabungan</span></div>
                </label>
                <p className="text-xs text-gray-400 mt-1 ml-14">Dompet tabungan tidak bisa dipilih untuk transaksi. Hanya bisa diisi/ditarik lewat transfer.</p>
              </div>
              {!editId && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Saldo Awal (Rp)</label>
                  <input type="number" inputMode="numeric" min="0" value={form.initial_balance}
                    onChange={e => setForm(f => ({ ...f, initial_balance: e.target.value }))} placeholder="0"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                </div>
              )}
              <button type="submit" disabled={submitting}
                className="w-full bg-indigo-600 text-white rounded-xl py-3.5 font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 active:scale-[0.98]">
                {submitting ? 'Menyimpan...' : editId ? 'Simpan' : 'Tambah Dompet'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
