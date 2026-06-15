import { useState } from 'react'
import { X, Home } from 'lucide-react'
import { Button } from '../../atoms/Button'
import { Input } from '../../atoms/Input'
import { FormField } from '../../molecules/FormField'
import { useHousehold } from '../../../hooks/useHousehold'

export default function CreateHouseholdModal({ onClose }) {
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const { createHousehold } = useHousehold(null)  // userId tidak dipakai di create

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      await createHousehold(name.trim())
      onClose()
    } catch (err) {
      setError(err.message || 'Gagal membuat household')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
              <Home size={20} className="text-indigo-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Buat Household</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <FormField label="Nama Household">
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="cth: Rumah Tangga, Keluarga"
                autoFocus
                required
              />
            </FormField>
            <p className="text-xs text-gray-400 mt-1.5">
              Nama ini akan terlihat oleh pasangan/anggota yang kamu undang.
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-xs text-amber-800 leading-relaxed">
              <strong>Catatan:</strong> Setiap user hanya bisa menjadi anggota
              dari 1 household. Kamu akan otomatis menjadi admin.
            </p>
          </div>

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
            disabled={submitting || !name.trim()}
          >
            Buat Household
          </Button>
        </form>
      </div>
    </div>
  )
}
