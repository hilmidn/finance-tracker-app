import { useState } from 'react'
import { X, PiggyBank } from 'lucide-react'
import { useHouseholdWallets } from '../hooks/useHouseholdWallets'

const WALLET_TYPES = [
  { value: 'cash', label: 'Tunai', icon: '👛' },
  { value: 'bank', label: 'Rekening Bank', icon: '🏦' },
  { value: 'e-wallet', label: 'E-Wallet', icon: '📱' },
]

export default function AddHouseholdWalletModal({ householdId, onClose }) {
  const { addWallet } = useHouseholdWallets(householdId)
  const [form, setForm] = useState({
    name: '',
    type: 'cash',
    icon: '',
    initial_balance: '',
    is_savings: false,
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      await addWallet({
        name: form.name.trim(),
        type: form.type,
        icon: form.icon,
        initial_balance: parseInt(form.initial_balance) || 0,
        is_savings: form.is_savings,
      })
      onClose()
    } catch (err) {
      setError(err.message || 'Gagal menambah dompet')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">Tambah Dompet Household</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Tipe</label>
            <div className="grid grid-cols-3 gap-2">
              {WALLET_TYPES.map(t => (
                <button key={t.value} type="button"
                  onClick={() => setForm(f => ({ ...f, type: t.value }))}
                  className={`flex flex-col items-center gap-1 py-3 rounded-xl border text-sm font-medium transition-all ${
                    form.type === t.value ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}>
                  <span className="text-xl">{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Nama Dompet</label>
            <input type="text" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder={form.type === 'cash' ? 'Dompet Dapur' : form.type === 'bank' ? 'BCA, Mandiri...' : 'GoPay, OVO...'} required
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Icon (opsional)</label>
            <input type="text" value={form.icon}
              onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
              placeholder="👛 🏦 📱 💳" maxLength={10}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
          </div>
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <button type="button" onClick={() => setForm(f => ({ ...f, is_savings: !f.is_savings }))}
                className={`w-11 h-6 rounded-full transition-colors relative ${form.is_savings ? 'bg-amber-500' : 'bg-gray-200'}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${form.is_savings ? 'translate-x-5' : ''}`} />
              </button>
              <div className="flex items-center gap-1.5 text-sm text-gray-700">
                <PiggyBank size={16} className="text-amber-600" />
                <span>Jadikan Tabungan</span>
              </div>
            </label>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Saldo Awal (Rp)</label>
            <input type="number" inputMode="numeric" min="0" value={form.initial_balance}
              onChange={e => setForm(f => ({ ...f, initial_balance: e.target.value }))} placeholder="0"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}
          <button type="submit" disabled={submitting}
            className="w-full bg-indigo-600 text-white rounded-xl py-3.5 font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 active:scale-[0.98]">
            {submitting ? 'Menyimpan...' : 'Tambah Dompet'}
          </button>
        </form>
      </div>
    </div>
  )
}
