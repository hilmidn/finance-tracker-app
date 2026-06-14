import { useState, useEffect } from 'react'
import { X, ArrowUpFromLine, ArrowDownToLine, Share2, Home } from 'lucide-react'
import { useHousehold } from '../hooks/useHousehold'
import { useHouseholdCategories } from '../hooks/useHouseholdCategories'
import { useHouseholdWallets } from '../hooks/useHouseholdWallets'

/**
 * Form for adding/editing personal transactions.
 * Supports US-8: sharing a transaction to household.
 *
 * Props:
 * - userId
 * - categories: { pengeluaran, pemasukan }
 * - wallets: personal wallets
 * - onSubmit: async (data) => void — data includes shared_to_household_id, household_category_id, household_wallet_id
 * - onClose
 * - editTx
 */
export default function TransactionForm({ userId, categories, wallets, onSubmit, onClose, editTx }) {
  const { household, isMember } = useHousehold(userId)
  const householdId = household?.id
  const { categories: rawHhCategories } = useHouseholdCategories(householdId || null)
  const { wallets: hhWallets } = useHouseholdWallets(householdId || null)

  const [type, setType] = useState(editTx?.type || 'pengeluaran')
  const [categoryId, setCategoryId] = useState(editTx?.category_id?.toString() || '')
  const [walletId, setWalletId] = useState(editTx?.wallet_id?.toString() || '')
  const [amount, setAmount] = useState(editTx?.amount?.toString() || '')
  const [note, setNote] = useState(editTx?.note || '')
  const [date, setDate] = useState(editTx?.date || new Date().toISOString().split('T')[0])

  // Share to household
  const [shareToHousehold, setShareToHousehold] = useState(
    editTx ? (Boolean(editTx.shared_to_household_id) || editTx._forceShare) : false
  )
  const [hhCategoryId, setHhCategoryId] = useState(editTx?.household_category_id?.toString() || '')
  const [hhWalletId, setHhWalletId] = useState(editTx?.household_wallet_id?.toString() || '')

  const [submitting, setSubmitting] = useState(false)

  const walletList = (wallets || []).filter(w => !w.is_savings)
  const catList = categories[type] || []
  const hhCatList = rawHhCategories?.[type] || []

  useEffect(() => {
    if (editTx) {
      setType(editTx.type)
      setCategoryId(editTx.category_id?.toString() || '')
      setWalletId(editTx.wallet_id?.toString() || '')
      setShareToHousehold(Boolean(editTx.shared_to_household_id) || editTx._forceShare)
      setHhCategoryId(editTx.household_category_id?.toString() || '')
      setHhWalletId(editTx.household_wallet_id?.toString() || '')
    }
  }, [editTx])
  // eslint-disable-next-line react-hooks/set-state-in-effect

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!amount || !categoryId) return
    if (shareToHousehold && !hhCategoryId) return
    setSubmitting(true)
    const payload = {
      type,
      category_id: parseInt(categoryId),
      wallet_id: walletId ? parseInt(walletId) : null,
      amount: parseInt(amount),
      note,
      date,
    }
    if (shareToHousehold && isMember) {
      payload.shared_to_household_id = householdId
      payload.household_category_id = parseInt(hhCategoryId)
      payload.household_wallet_id = hhWalletId ? parseInt(hhWalletId) : null
    } else {
      // Explicitly clear on un-share
      payload.shared_to_household_id = null
      payload.household_category_id = null
      payload.household_wallet_id = null
    }
    await onSubmit(payload)
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

          {/* Share to household (only if user is a member) */}
          {isMember && household && (
            <div className="border-t border-gray-100 pt-4 space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Share2 size={14} className="text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">Bagikan ke Household</p>
                    <p className="text-[10px] text-gray-500">{household.name}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShareToHousehold(!shareToHousehold)}
                  className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${
                    shareToHousehold ? 'bg-purple-500' : 'bg-gray-200'
                  }`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                    shareToHousehold ? 'translate-x-5' : ''
                  }`} />
                </button>
              </label>

              {shareToHousehold && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      <Home size={11} className="inline mr-1" />
                      Kategori Household
                    </label>
                    <select
                      value={hhCategoryId}
                      onChange={e => setHhCategoryId(e.target.value)}
                      required={shareToHousehold}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">Pilih kategori household...</option>
                      {hhCatList.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      Dompet Household (opsional)
                    </label>
                    <select
                      value={hhWalletId}
                      onChange={e => setHhWalletId(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">Pilih dompet household...</option>
                      {hhWallets.map(w => (
                        <option key={w.id} value={w.id}>{w.icon || '💳'} {w.name}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>
          )}

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
