import { useState } from 'react'
import { useSelector } from 'react-redux'
import { Plus, Trash2, LogOut, Tag, Home, ChevronRight, ListChecks, Wallet } from 'lucide-react'
import { useDataScope } from '../hooks/useDataScope'
import { useCategories } from '../hooks/useCategories'
import { useHouseholdCategories } from '../hooks/useHouseholdCategories'
import { useHousehold } from '../hooks/useHousehold'
import CreateHouseholdModal from '../components/CreateHouseholdModal'
import ConfirmModal from '../components/ConfirmModal'

export default function SettingsPage({ onSignOut }) {
  const userId = useSelector((s) => s.auth.user?.id)
  const { isHousehold, householdId } = useDataScope()
  const { household } = useHousehold(userId)

  const [activeTab, setActiveTab] = useState('pengeluaran')
  const [showAdd, setShowAdd] = useState(false)
  const [newCat, setNewCat] = useState('')
  const [showCreateHousehold, setShowCreateHousehold] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  // Mode-aware category hook. Both return { categories: grouped, loading,
  // addCategory(name, type), deleteCategory(id) } so the body is the same.
  // We always call both (React requires consistent hook order); only one is
  // active at a time because of the `enabled` guard inside each hook.
  const personal = useCategories(isHousehold ? null : userId)
  const householdCats = useHouseholdCategories(isHousehold ? householdId : null)
  const active = isHousehold ? householdCats : personal
  const { categories, loading, addCategory, deleteCategory } = active
  const catList = categories[activeTab] || []

  const handleAdd = async () => {
    if (!newCat.trim()) return
    try {
      await addCategory(newCat.trim(), activeTab)
      setNewCat(''); setShowAdd(false)
    } catch (err) {
      setDeleteError(err.message)
    }
  }

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteCategory(pendingDelete.id)
      setPendingDelete(null)
    } catch (err) {
      setDeleteError(err.message || 'Kategori yang dipakai transaksi tidak bisa dihapus. Hapus atau pindahkan transaksi terkait dulu.')
      throw err
    } finally {
      setDeleting(false)
    }
  }

  const sectionTitle = isHousehold ? 'Kategori Household' : 'Kategori Pribadi'
  const sectionAccent = isHousehold ? 'violet' : 'indigo'

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">Pengaturan</h1>

      {/* Household section — only shown in personal mode (in household mode,
          the header pill is the entry point and settings live in /household) */}
      {!isHousehold && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="w-full flex items-center gap-3 px-4 py-3.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Home size={16} className="text-indigo-600" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium text-gray-800">Household</p>
              <p className="text-[10px] text-gray-400">
                {household
                  ? `Anggota dari "${household.name}" — tap switcher di header untuk lihat data household`
                  : 'Belum ada household'}
              </p>
            </div>
          </div>
          {!household && (
            <button
              onClick={() => setShowCreateHousehold(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-medium text-indigo-600 bg-indigo-50/50 border-t border-gray-100 hover:bg-indigo-50 transition-colors"
            >
              <Plus size={14} /> Buat Household
            </button>
          )}
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-700">{sectionTitle}</h2>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
            isHousehold ? 'bg-violet-50 text-violet-700' : 'bg-indigo-50 text-indigo-600'
          }`}>
            {isHousehold ? 'Shared' : 'Pribadi'}
          </span>
        </div>
        <div className="flex rounded-xl overflow-hidden border border-gray-200 bg-gray-50 p-1">
          <button onClick={() => setActiveTab('pengeluaran')}
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'pengeluaran' ? `bg-white ${sectionAccent === 'violet' ? 'text-violet-600' : 'text-red-500'} shadow-sm` : 'text-gray-500'}`}>
            Pengeluaran
          </button>
          <button onClick={() => setActiveTab('pemasukan')}
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'pemasukan' ? `bg-white ${sectionAccent === 'violet' ? 'text-violet-600' : 'text-green-600'} shadow-sm` : 'text-gray-500'}`}>
            Pemasukan
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50 mt-2">
          {loading ? (
            <div className="space-y-2 p-4">{[1,2,3].map(i => <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />)}</div>
          ) : catList.length === 0 ? (
            <div className="text-center py-10">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-2xl mb-3">
                <Tag size={20} className="text-gray-400" />
              </div>
              <p className="text-gray-400 text-sm">Belum ada kategori</p>
            </div>
          ) : (
            catList.map(cat => (
              <div key={cat.id} className="flex items-center justify-between px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${activeTab === 'pengeluaran' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'}`}>
                    {cat.name[0]}
                  </div>
                  <span className="text-sm font-medium text-gray-800">{cat.name}</span>
                </div>
                <button onClick={() => { setDeleteError(null); setPendingDelete(cat) }}
                  aria-label={`Hapus kategori ${cat.name}`}
                  className="p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50">
                  <Trash2 size={15} />
                </button>
              </div>
            ))
          )}
        </div>

        {showAdd ? (
          <div className="flex gap-2 mt-2">
            <input type="text" value={newCat} onChange={e => setNewCat(e.target.value)}
              placeholder="Nama kategori baru" autoFocus
              className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white" />
            <button onClick={handleAdd}
              className={`${isHousehold ? 'bg-violet-600 hover:bg-violet-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white px-4 rounded-xl text-sm font-semibold transition-colors`}>Simpan</button>
            <button onClick={() => { setShowAdd(false); setNewCat('') }}
              className="px-3 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors">Batal</button>
          </div>
        ) : (
          <button onClick={() => setShowAdd(true)}
            className={`flex items-center justify-center gap-2 w-full py-3 text-sm font-medium ${isHousehold ? 'text-violet-600 bg-violet-50 hover:bg-violet-100' : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'} rounded-xl transition-colors active:scale-[0.98] mt-2`}>
            <Plus size={18} /> Tambah Kategori
          </button>
        )}
      </div>

      <button onClick={onSignOut}
        className="flex items-center justify-center gap-2 w-full py-3 text-sm font-medium text-red-500 bg-red-50 rounded-xl hover:bg-red-100 transition-colors mt-8">
        <LogOut size={18} /> Keluar
      </button>

      {showCreateHousehold && (
        <CreateHouseholdModal onClose={() => setShowCreateHousehold(false)} />
      )}

      <ConfirmModal
        isOpen={!!pendingDelete}
        onClose={() => { if (!deleting) { setPendingDelete(null); setDeleteError(null) } }}
        onConfirm={handleConfirmDelete}
        title={
          deleteError ? 'Gagal menghapus kategori' :
          `Hapus kategori "${pendingDelete?.name}"?`
        }
        message={
          deleteError ||
          'Kategori yang dipakai transaksi tidak bisa dihapus. Hapus atau pindahkan transaksi terkait dulu.'
        }
        confirmText={deleteError ? 'Tutup' : 'Hapus'}
        cancelText="Batal"
        variant="danger"
        loading={deleting}
      />
    </div>
  )
}
