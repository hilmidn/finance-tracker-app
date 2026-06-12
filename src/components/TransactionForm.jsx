import { useState, useEffect } from 'react'
import { X, ArrowUpFromLine, ArrowDownToLine } from 'lucide-react'
import { supabase } from '../lib/supabase'
import db from '../db/local'

export default function TransactionForm({ categories, onSubmit, onClose, editTx, userId }) {
  const [type, setType] = useState(editTx?.type || 'pengeluaran')
  const [categoryId, setCategoryId] = useState(editTx?.category_id?.toString() || '')
  const [walletId, setWalletId] = useState(editTx?.wallet_id?.toString() || '')
  const [wallets, setWallets] = useState([])
  const [amount, setAmount] = useState(editTx?.amount?.toString() || '')
  const [note, setNote] = useState(editTx?.note || '')
  const [date, setDate] = useState(editTx?.date || new Date().toISOString().split('T')[0])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('wallets').select('*').eq('is_savings', false).order('created_at')
      if (data) {
        // Cache to Dexie
        if (userId) await db.wallets.bulkPut(data.map(w => ({ ...w, userId })))
        setWallets(data)
        return
      }
      // Fallback: read from Dexie
      if (userId) {
        const cached = await db.wallets.where('userId').equals(userId).toArray()
        setWallets(cached.filter(w => !w.is_savings))
      }
    })()
  }, [userId])

  const catList = categories[type] || []

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!amount || !categoryId) return
    setSubmitting(true)
    await onSubmit({
      type,
      category_id: parseInt(categoryId),
      wallet_id: walletId ? parseInt(walletId) : null,
      amount: parseInt(amount),
      note,
      date,
    })
    setSubmitting(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
      <div 
        className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-5 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">
            {editTx ? 'Edit Transaksi' : 'Tambah Transaksi'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type toggle — modern pill style */}
          <div className="flex rounded-xl bg-gray-50 p-1 border border-gray-100">
            <button
              type="button"
              onClick={() => { setType('pengeluaran'); setCategoryId('') }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium rounded-lg transition-all ${
                type === 'pengeluaran' ? 'bg-white text-red-500 shadow-sm' : 'text-gray-500'
              }`}
            >
              <ArrowDownToLine size={16} /> Keluar
            </button>
            <button
              type="button"
              onClick={() => { setType('pemasukan'); setCategoryId('') }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium rounded-lg transition-all ${
                type === 'pemasukan' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500'
              }`}
            >
              <ArrowUpFromLine size={16} /> Masuk
            </button>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Kategori</label>
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              required
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">Pilih kategori...</option>
              {catList.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Wallet */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Dompet</label>
            <select
              value={walletId}
              onChange={e => setWalletId(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">Pilih dompet (opsional)...</option>
              {wallets.map(w => (
                <option key={w.id} value={w.id}>{w.icon || '💳'} {w.name}</option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Jumlah (Rp)</label>
            <input
              type="number"
              inputMode="numeric"
              min="1"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0"
              required
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Date full row */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Tanggal</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Note as textarea */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Catatan</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Opsional..."
              rows={3}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-indigo-600 text-white rounded-xl py-3.5 font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 active:scale-[0.98]"
          >
            {submitting ? 'Menyimpan...' : editTx ? 'Simpan Perubahan' : 'Simpan'}
          </button>
        </form>
      </div>
    </div>
  )
}
