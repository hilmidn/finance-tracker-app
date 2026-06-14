import { useState } from 'react'
import { useSelector } from 'react-redux'
import { Mail, X } from 'lucide-react'
import { useMyPendingInvites } from '../hooks/useHouseholdMembers'
import AcceptInviteModal from './AcceptInviteModal'

/**
 * Top banner shown when current user has pending household invites.
 * Tappable to open AcceptInviteModal.
 */
export default function PendingInviteBanner() {
  const user = useSelector((s) => s.auth.user)
  const userId = user?.id
  const [dismissed, setDismissed] = useState(false)
  const [selectedInvite, setSelectedInvite] = useState(null)

  const { data: invites = [], isLoading } = useMyPendingInvites(userId)
  const visibleInvites = invites.filter(i => !dismissed || true)

  if (isLoading || invites.length === 0 || dismissed) return null

  return (
    <>
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center gap-2 relative z-30">
        <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
          <Mail size={14} className="text-amber-700" />
        </div>
        <button
          onClick={() => setSelectedInvite(invites[0])}
          className="flex-1 text-left min-w-0"
        >
          <p className="text-xs font-semibold text-amber-900 truncate">
            {invites.length === 1
              ? `Undangan household: ${invites[0].households?.name || 'Household'}`
              : `${invites.length} undangan household`}
          </p>
          <p className="text-[10px] text-amber-700 truncate">
            Ketuk untuk lihat detail
          </p>
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 text-amber-700 hover:bg-amber-100 rounded-lg transition-colors flex-shrink-0"
        >
          <X size={14} />
        </button>
      </div>

      {selectedInvite && (
        <AcceptInviteModal
          invite={selectedInvite}
          userId={userId}
          onClose={() => setSelectedInvite(null)}
          onAccepted={() => {
            setSelectedInvite(null)
            setDismissed(false)
          }}
        />
      )}
    </>
  )
}
