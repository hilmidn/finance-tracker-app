import { useState } from 'react'
import { Plus, Trash2, Tag } from 'lucide-react'
import { Button } from '../../atoms/Button'
import { Input } from '../../atoms/Input'
import { useHouseholdCategories } from '../../../hooks/useHouseholdCategories'
import ConfirmModal from '../modals/ConfirmModal'

export default function HouseholdCategoriesTab({ householdId }) {
  const [activeTab, setActiveTab] = useState('pengeluaran')
  const [showAdd, setShowAdd] = useState(false)
  const [newCat, setNewCat] = useState('')
  const [addError, setAddError] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)  // category object or null
  const [deleting, setDeleting] = useState(false)
  const { categories, loading, addCategory, deleteCategory } = useHouseholdCategories(householdId)
  const catList = categories[activeTab] || []

  const handleAdd = async () => {
    if (!newCat.trim()) return
    setAddError(null)
    try {
      await addCategory(newCat.trim(), activeTab)
      setNewCat(''); setShowAdd(false)
    } catch (err) {
      setAddError(err.message || 'Gagal menambah kategori')
    }
  }

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      await deleteCategory(pendingDelete.id)
      setPendingDelete(null)
    } catch (err) {
      console.error('[HouseholdCategoriesTab] delete failed', err)
      throw err  // keep modal open so user can see error
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex rounded-xl overflow-hidden border border-gray-200 bg-gray-50 p-1">
        <button onClick={() => setActiveTab('pengeluaran')}
          className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'pengeluaran' ? 'bg-white text-red-500 shadow-sm' : 'text-gray-500'}`}>
          Pengeluaran
        </button>
        <button onClick={() => setActiveTab('pemasukan')}
          className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'pemasukan' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500'}`}>
          Pemasukan
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
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
              <button
                onClick={() => setPendingDelete(cat)}
                className="p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                aria-label={`Hapus kategori ${cat.name}`}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))
        )}
      </div>

      {showAdd ? (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input type="text" value={newCat} onChange={e => setNewCat(e.target.value)}
              placeholder="Nama kategori baru" autoFocus className="flex-1" />
            <Button onClick={handleAdd}>Simpan</Button>
            <Button variant="ghost" onClick={() => { setShowAdd(false); setNewCat(''); setAddError(null) }}>Batal</Button>
          </div>
          {addError && (
            <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{addError}</p>
          )}
        </div>
      ) : (
        <Button
          onClick={() => setShowAdd(true)}
          width="full"
          className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
          leftIcon={<Plus size={18} />}
        >
          Tambah Kategori
        </Button>
      )}

      <ConfirmModal
        isOpen={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleConfirmDelete}
        title={`Hapus kategori "${pendingDelete?.name}"?`}
        message="Kategori yang dipakai transaksi tidak bisa dihapus. Hapus atau pindahkan transaksi terkait dulu."
        confirmText="Hapus"
        variant="danger"
        loading={deleting}
      />
    </div>
  )
}
