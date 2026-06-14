import { useState } from 'react'
import { X, Home, Check, XIcon } from 'lucide-react'
import { useHouseholdMembers } from '../hooks/useHouseholdMembers'

export default function AcceptInviteModal({ invite, userId, onClose, onAccepted }) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const { acceptInvite, rejectInvite } = useHouseholdMembers(invite.household_id)

  const handleAccept = async () => {
    setSubmitting(true)
    setError(null)
    try {
      await acceptInvite({ inviteId: invite.id })
      onAccepted?.()
      onClose()
    } catch (err) {
      setError(err.message || 'Gagal menerima undangan')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReject = async () => {
    if (!confirm('Tolak undangan ini?')) return
    setSubmitting(true)
    setError(null)
    try {
      await rejectInvite(invite.id)
      onClose()
    } catch (err) {
      setError(err.message || 'Gagal menolak undangan')
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
            <h2 className="text-lg font-bold text-gray-900">Undangan Household</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-center">
            <p className="text-xs text-indigo-600 mb-1">Kamu diundang ke</p>
            <p className="text-lg font-bold text-indigo-900">
              {invite.households?.name || 'Household'}
            </p>
          </div>

          <div className="space-y-2 text-xs text-gray-600">
            <p>Dengan menerima undangan, kamu akan:</p>
            <ul className="space-y-1.5 pl-4">
              <li className="flex items-start gap-2">
                <span className="text-indigo-500">•</span>
                <span>Bisa melihat & input transaksi household</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-500">•</span>
                <span>Bergabung sebagai member (bukan admin)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-500">•</span>
                <span>Pengeluaran pribadi kamu tetap tidak terlihat</span>
              </li>
            </ul>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleReject}
              disabled={submitting}
              className="flex items-center justify-center gap-1.5 bg-gray-100 text-gray-700 rounded-xl py-3 font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50 active:scale-[0.98]"
            >
              <XIcon size={16} /> Tolak
            </button>
            <button
              onClick={handleAccept}
              disabled={submitting}
              className="flex items-center justify-center gap-1.5 bg-indigo-600 text-white rounded-xl py-3 font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 active:scale-[0.98]"
            >
              <Check size={16} /> {submitting ? 'Memproses...' : 'Terima'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
