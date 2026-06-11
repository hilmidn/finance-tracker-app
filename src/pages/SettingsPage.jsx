import { useState } from 'react'
import { Plus, Trash2, LogOut } from 'lucide-react'
import { useCategories } from '../hooks/useCategories'

export default function SettingsPage({ userId, onSignOut }) {
  const [activeTab, setActiveTab] = useState('pengeluaran')
  const [showAdd, setShowAdd] = useState(false)
  const [newCat, setNewCat] = useState('')

  const { categories, addCategory, deleteCategory } = useCategories(userId)

  const handleAdd = async () => {
    if (!newCat.trim()) return
    const { error } = await addCategory(newCat.trim(), activeTab)
    if (!error) {
      setNewCat('')
      setShowAdd(false)
    }
  }

  const catList = categories[activeTab] || []

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Tab toggle */}
      <div className="flex rounded-xl overflow-hidden border border-gray-200">
        <button
          onClick={() => setActiveTab('pengeluaran')}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'pengeluaran' ? 'bg-red-500 text-white' : 'bg-gray-50 text-gray-600'
          }`}
        >
          Pengeluaran
        </button>
        <button
          onClick={() => setActiveTab('pemasukan')}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'pemasukan' ? 'bg-green-500 text-white' : 'bg-gray-50 text-gray-600'
          }`}
        >
          Pemasukan
        </button>
      </div>

      {/* Category list */}
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {catList.map(cat => (
          <div key={cat.id} className="flex items-center justify-between px-4 py-3">
            <span className="text-sm font-medium text-gray-800">{cat.name}</span>
            <button
              onClick={() => deleteCategory(cat.id, activeTab)}
              className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {catList.length === 0 && (
          <p className="text-center text-gray-400 py-6 text-sm">Belum ada kategori</p>
        )}
      </div>

      {/* Add category */}
      {showAdd ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={newCat}
            onChange={e => setNewCat(e.target.value)}
            placeholder="Nama kategori baru"
            autoFocus
            className="flex-1 rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={handleAdd}
            className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700"
          >
            Simpan
          </button>
          <button
            onClick={() => { setShowAdd(false); setNewCat('') }}
            className="px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            Batal
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center justify-center gap-2 w-full py-3 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors"
        >
          <Plus size={18} /> Tambah Kategori
        </button>
      )}

      {/* Sign out */}
      <button
        onClick={onSignOut}
        className="flex items-center justify-center gap-2 w-full py-3 text-sm font-medium text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-colors mt-8"
      >
        <LogOut size={18} /> Keluar
      </button>
    </div>
  )
}
