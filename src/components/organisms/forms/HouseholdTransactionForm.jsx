import { useState, useEffect } from 'react'
import { X, ArrowUpFromLine, ArrowDownToLine } from 'lucide-react'

/**
 * Form for adding/editing household transactions.
 *
 * Props:
 * - householdCategories: { pengeluaran: [...], pemasukan: [...] }
 * - householdWallets: [{id, name, type, icon, initial_balance}]
 * - onSubmit: async (data) => void
 * - onClose: () => void
 * - editTx: optional existing tx
 * - defaultType: 'pemasukan' | 'pengeluaran' | undefined
 */
export default function HouseholdTransactionForm({
  householdCategories,
  householdWallets,
  onSubmit,
  onClose,
  editTx,
  defaultType,
}) {
  const [type, setType] = useState(editTx?.type || defaultType || 'pengeluaran')
  const [categoryId, setCategoryId] = useState(editTx?.household_category_id?.toString() || '')
  const [walletId, setWalletId] = useState(editTx?.household_wallet_id?.toString() || '')
  const [amount, setAmount] = useState(editTx?.amount?.toString() || '')
  const [note, setNote] = useState(editTx?.note || '')
  const [date, setDate] = useState(editTx?.date || new Date().toISOString().split('T')[0])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (editTx) {
      setType(editTx.type)
      setCategoryId(editTx.household_category_id?.toString() || '')
      setWalletId(editTx.household_wallet_id?.toString() || '')
    }
  }, [editTx])
  // eslint-disable-next-line react-hooks/set-state-in-effect

  const catList = householdCategories?.[type] || []
  const walletList = householdWallets || []

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!amount || !categoryId) return
    setSubmitting(true)
    await onSubmit({
      type,
      household_category_id: parseInt(categoryId),
      household_wallet_id: walletId ? parseInt(walletId) : null,
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
            {editTx ? 'Edit Transaksi Household' : 'Tambah Transaksi Household'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type toggle */}
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
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Kategori Household</label>
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
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Dompet Household</label>
            <select
              value={walletId}
              onChange={e => setWalletId(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">Pilih dompet (opsional)...</option>
              {walletList.map(w => (
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

          {/* Date */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Tanggal</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Note */}
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
