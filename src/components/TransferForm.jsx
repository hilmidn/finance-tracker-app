import { useState } from 'react'
import { X, ArrowLeftRight } from 'lucide-react'

export default function TransferForm({ wallets, onSubmit, onClose }) {
  const [fromId, setFromId] = useState('')
  const [toId, setToId] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!fromId || !toId || !amount || fromId === toId) return
    setSubmitting(true)
    await onSubmit({
      from_wallet_id: parseInt(fromId),
      to_wallet_id: parseInt(toId),
      amount: parseInt(amount),
      description,
      date,
    })
    setSubmitting(false)
  }

  const fromWallet = wallets.find(w => w.id === parseInt(fromId))
  const toWallet = wallets.find(w => w.id === parseInt(toId))

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">Transfer</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* From wallet */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Dari Dompet</label>
            <select
              value={fromId}
              onChange={e => setFromId(e.target.value)}
              required
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">Pilih dompet sumber...</option>
              {wallets.map(w => (
                <option key={w.id} value={w.id} disabled={w.id === parseInt(toId)}>
                  {w.icon || '💳'} {w.name}
                </option>
              ))}
            </select>
          </div>

          {/* To wallet */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Ke Dompet</label>
            <select
              value={toId}
              onChange={e => setToId(e.target.value)}
              required
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">Pilih dompet tujuan...</option>
              {wallets.map(w => (
                <option key={w.id} value={w.id} disabled={w.id === parseInt(fromId)}>
                  {w.icon || '💳'} {w.name}
                </option>
              ))}
            </select>
          </div>

          {/* Swap button */}
          {fromId && toId && (
            <button
              type="button"
              onClick={() => { const tmp = fromId; setFromId(toId); setToId(tmp) }}
              className="w-full flex items-center justify-center gap-2 py-2 text-sm text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors"
            >
              <ArrowLeftRight size={16} /> Balik arah transfer
            </button>
          )}

          {/* Preview */}
          {fromId && toId && amount && fromWallet && toWallet && (
            <div className="bg-gray-50 rounded-xl px-4 py-3 text-center">
              <p className="text-sm text-gray-600">
                Transfer <span className="font-bold text-gray-900">Rp {parseInt(amount).toLocaleString('id-ID')}</span>
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {fromWallet.icon || '💳'} {fromWallet.name} → {toWallet.icon || '💳'} {toWallet.name}
              </p>
            </div>
          )}

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

          {/* Date + description */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Tanggal</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Catatan</label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Isi saldo..."
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || !fromId || !toId || fromId === toId}
            className="w-full bg-indigo-600 text-white rounded-xl py-3.5 font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 active:scale-[0.98]"
          >
            {submitting ? 'Memproses...' : 'Transfer'}
          </button>
        </form>
      </div>
    </div>
  )
}
