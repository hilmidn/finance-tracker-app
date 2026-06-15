import { useState, useEffect } from 'react'
import { X, ArrowLeftRight, Home } from 'lucide-react'
import { useHouseholdWalletsForTransfer } from '../../../hooks/useTransfers'

/**
 * Transfer form. Supports two destination types:
 * - Personal wallet (existing behavior, to_wallet_id)
 * - Household wallet (US-7: auto-records as household income, to_household_wallet_id)
 *
 * Props:
 * - userId
 * - wallets: personal wallets
 * - onSubmit: async ({ from_wallet_id, to_wallet_id?, to_household_wallet_id?, amount, description, date }) => void
 * - onClose
 */
export default function TransferForm({ userId, wallets, onSubmit, onClose }) {
  const [fromId, setFromId] = useState('')
  const [toId, setToId] = useState('')
  const [toHouseholdId, setToHouseholdId] = useState('')
  const [destinationType, setDestinationType] = useState('personal') // 'personal' | 'household'
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [submitting, setSubmitting] = useState(false)

  const { data: householdWallets = [] } = useHouseholdWalletsForTransfer(userId)
  const hasHousehold = householdWallets.length > 0

  // Reset dependent fields when destination type changes
  useEffect(() => {
    if (destinationType === 'personal') setToHouseholdId('')
    else setToId('')
  }, [destinationType])
  // eslint-disable-next-line react-hooks/set-state-in-effect

  const fromWallet = wallets.find(w => w.id === parseInt(fromId))
  const toWallet = destinationType === 'personal' ? wallets.find(w => w.id === parseInt(toId)) : null
  const toHhWallet = destinationType === 'household' ? householdWallets.find(w => w.id === parseInt(toHouseholdId)) : null

  const canSubmit = (() => {
    if (!fromId || !amount) return false
    if (destinationType === 'personal') return toId && parseInt(fromId) !== parseInt(toId)
    if (destinationType === 'household') return toHouseholdId
    return false
  })()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    const payload = {
      from_wallet_id: parseInt(fromId),
      amount: parseInt(amount),
      description,
      date,
    }
    if (destinationType === 'personal') {
      payload.to_wallet_id = parseInt(toId)
    } else {
      payload.to_household_wallet_id = parseInt(toHouseholdId)
      if (!description) payload.description = 'Transfer ke household'
    }
    await onSubmit(payload)
    setSubmitting(false)
  }

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
                <option key={w.id} value={w.id}>
                  {w.icon || '💳'} {w.name}
                </option>
              ))}
            </select>
          </div>

          {/* Destination type toggle (only if user has household) */}
          {hasHousehold && (
            <div className="flex rounded-xl bg-gray-50 p-1 border border-gray-100">
              <button
                type="button"
                onClick={() => setDestinationType('personal')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  destinationType === 'personal' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'
                }`}
              >
                <ArrowLeftRight size={14} /> Pribadi
              </button>
              <button
                type="button"
                onClick={() => setDestinationType('household')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  destinationType === 'household' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500'
                }`}
              >
                <Home size={14} /> Household
              </button>
            </div>
          )}

          {/* To wallet (personal) */}
          {destinationType === 'personal' && (
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
          )}

          {/* To wallet (household) */}
          {destinationType === 'household' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Ke Dompet Household</label>
              <select
                value={toHouseholdId}
                onChange={e => setToHouseholdId(e.target.value)}
                required
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Pilih dompet household...</option>
                {householdWallets.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.icon || '💳'} {w.name}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-purple-600 mt-1">
                Otomatis tercatat sebagai pemasukan household
              </p>
            </div>
          )}

          {/* Preview */}
          {fromId && amount && fromWallet && (toWallet || toHhWallet) && (
            <div className="bg-gray-50 rounded-xl px-4 py-3 text-center">
              <p className="text-sm text-gray-600">
                Transfer <span className="font-bold text-gray-900">Rp {parseInt(amount).toLocaleString('id-ID')}</span>
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {fromWallet.icon || '💳'} {fromWallet.name} →{' '}
                {destinationType === 'household' && <Home size={10} className="inline" />}{' '}
                {(toHhWallet?.icon || toWallet?.icon || '💳')} {toHhWallet?.name || toWallet?.name}
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
                placeholder={destinationType === 'household' ? 'Iuran bulanan' : 'Isi saldo...'}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || !canSubmit}
            className="w-full bg-indigo-600 text-white rounded-xl py-3.5 font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 active:scale-[0.98]"
          >
            {submitting ? 'Memproses...' : 'Transfer'}
          </button>
        </form>
      </div>
    </div>
  )
}
