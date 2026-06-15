import { useState } from 'react'
import { X, Mail, Users } from 'lucide-react'
import { Button } from '../../atoms/Button'
import { Input } from '../../atoms/Input'
import { FormField } from '../../molecules/FormField'
import { useHouseholdMembers } from '../../../hooks/useHouseholdMembers'

export default function InviteMemberModal({ householdId, onClose }) {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const { invite } = useHouseholdMembers(householdId)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setSubmitting(true)
    setError(null)
    setSuccess(false)
    try {
      await invite({ householdId, email: email.trim() })
      setSuccess(true)
      setEmail('')
      setTimeout(() => setSuccess(false), 2000)
    } catch (err) {
      setError(err.message || 'Gagal mengundang')
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
              <Users size={20} className="text-indigo-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Undang Member</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <FormField label="Email">
              <Input
                type="email"
                leftIcon={Mail}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                autoFocus
                required
              />
            </FormField>
            <p className="text-xs text-gray-400 mt-1.5">
              Orang yang diundang harus sudah punya akun di aplikasi ini.
              Mereka akan melihat notifikasi undangan saat buka app.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3">
              <p className="text-xs text-green-700">Undangan terkirim! ✓</p>
            </div>
          )}

          <Button
            type="submit"
            width="full"
            size="lg"
            loading={submitting}
            disabled={submitting || !email.trim()}
          >
            Kirim Undangan
          </Button>
        </form>
      </div>
    </div>
  )
}
