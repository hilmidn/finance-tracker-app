import { useSelector } from 'react-redux'
import { useState } from 'react'
import { Plus, Trash2, LogOut, Tag } from 'lucide-react'
import { useCategories } from '../hooks/useCategories'

export default function SettingsPage({ onSignOut }) {
  const userId = useSelector((s) => s.auth.user?.id)
  const [activeTab, setActiveTab] = useState('pengeluaran')
  const [showAdd, setShowAdd] = useState(false)
  const [newCat, setNewCat] = useState('')

  const { categories, loading, addCategory, deleteCategory } = useCategories(userId)
  const catList = categories[activeTab] || []

  const handleAdd = async () => {
    if (!newCat.trim()) return
    await addCategory(newCat.trim(), activeTab)
    setNewCat(''); setShowAdd(false)
  }

  const handleDelete = (id, type) => {
    deleteCategory(id, type)
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">Pengaturan</h1>

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
              <button onClick={() => handleDelete(cat.id, activeTab)}
                className="p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50">
                <Trash2 size={15} />
              </button>
            </div>
          ))
        )}
      </div>

      {showAdd ? (
        <div className="flex gap-2">
          <input type="text" value={newCat} onChange={e => setNewCat(e.target.value)}
            placeholder="Nama kategori baru" autoFocus
            className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white" />
          <button onClick={handleAdd}
            className="bg-indigo-600 text-white px-4 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors">Simpan</button>
          <button onClick={() => { setShowAdd(false); setNewCat('') }}
            className="px-3 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors">Batal</button>
        </div>
      ) : (
        <button onClick={() => setShowAdd(true)}
          className="flex items-center justify-center gap-2 w-full py-3 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors active:scale-[0.98]">
          <Plus size={18} /> Tambah Kategori
        </button>
      )}

      <button onClick={onSignOut}
        className="flex items-center justify-center gap-2 w-full py-3 text-sm font-medium text-red-500 bg-red-50 rounded-xl hover:bg-red-100 transition-colors mt-8">
        <LogOut size={18} /> Keluar
      </button>
    </div>
  )
}
