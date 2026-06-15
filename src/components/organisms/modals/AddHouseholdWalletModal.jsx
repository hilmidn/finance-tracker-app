import { useState } from 'react'
import { X, PiggyBank } from 'lucide-react'
import { Button } from '../../atoms/Button'
import { Input } from '../../atoms/Input'
import { Switch } from '../../atoms/Switch'
import { FormField } from '../../molecules/FormField'
import { useHouseholdWallets } from '../../../hooks/useHouseholdWallets'

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
          <FormField label="Nama Dompet">
            <Input type="text" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder={form.type === 'cash' ? 'Dompet Dapur' : form.type === 'bank' ? 'BCA, Mandiri...' : 'GoPay, OVO...'} required />
          </FormField>
          <FormField label="Icon (opsional)">
            <Input type="text" value={form.icon}
              onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
              placeholder="👛 🏦 📱 💳" maxLength={10} />
          </FormField>
          <label className="flex items-center gap-3 cursor-pointer">
            <Switch
              checked={form.is_savings}
              onChange={v => setForm(f => ({ ...f, is_savings: v }))}
              aria-label="Jadikan Tabungan"
            />
            <div className="flex items-center gap-1.5 text-sm text-gray-700">
              <PiggyBank size={16} className="text-amber-600" />
              <span>Jadikan Tabungan</span>
            </div>
          </label>
          <FormField label="Saldo Awal (Rp)">
            <Input type="number" inputMode="numeric" min="0" value={form.initial_balance}
              onChange={e => setForm(f => ({ ...f, initial_balance: e.target.value }))} placeholder="0" />
          </FormField>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}
          <Button
            type="submit"
            width="full"
            size="lg"
            loading={submitting}
            disabled={submitting}
          >
            Tambah Dompet
          </Button>
        </form>
      </div>
    </div>
  )
}
