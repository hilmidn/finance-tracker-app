import { useState } from 'react'
import { useSelector } from 'react-redux'
import { Crown, MoreVertical, X, UserCog, UserMinus } from 'lucide-react'
import { useHouseholdMembers } from '../hooks/useHouseholdMembers'

/**
 * List of household members with action menu (kick, transfer ownership).
 * Admin only — non-admins see the list read-only.
 */
export default function MemberList({ householdId }) {
  const user = useSelector((s) => s.auth.user)
  const currentUserId = user?.id
  const { members, invites, kick, transferOwnership, cancelInvite } = useHouseholdMembers(householdId)
  const [menuOpenId, setMenuOpenId] = useState(null)

  // Find current user's membership to determine if admin
  const myMembership = members.find(m => m.user_id === currentUserId)
  const isAdmin = myMembership?.role === 'admin' && myMembership?.status === 'accepted'

  const handleKick = async (m) => {
    if (!confirm(`Keluarkan ${m.user_id === currentUserId ? 'dirimu sendiri (leave)' : 'member ini'} dari household?`)) return
    if (m.user_id === currentUserId) {
      // Self-leave
      // (leaveMutation exists; we'll just use kick with confirmation)
    }
    await kick(m.id)
  }

  const handleTransfer = async (m) => {
    if (!confirm(`Jadikan member ini sebagai admin? Kamu akan turun jadi member biasa.`)) return
    await transferOwnership({
      householdId,
      currentAdminUserId: currentUserId,
      newAdminUserId: m.user_id,
    })
  }

  const handleCancelInvite = async (invite) => {
    if (!confirm(`Batalkan undangan ke ${invite.email}?`)) return
    await cancelInvite(invite.id)
  }

  if (members.length === 0 && invites.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-400 text-sm">Belum ada member</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Pending invites */}
      {invites.map(inv => (
        <div key={inv.id} className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 text-sm font-bold flex-shrink-0">
              ?
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{inv.email}</p>
              <p className="text-[10px] text-amber-700">Menunggu konfirmasi</p>
            </div>
          </div>
          {isAdmin && (
            <button
              onClick={() => handleCancelInvite(inv)}
              className="text-xs text-red-500 hover:text-red-700 font-medium"
            >
              Batalkan
            </button>
          )}
        </div>
      ))}

      {/* Active members */}
      {members.map(m => {
        const isMe = m.user_id === currentUserId
        const isTargetAdmin = m.role === 'admin'
        const initial = (m.user_id || '?').substring(0, 2).toUpperCase()

        return (
          <div key={m.id} className="flex items-center justify-between bg-white rounded-xl border border-gray-100 px-4 py-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                isTargetAdmin ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
              }`}>
                {initial}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {isMe ? 'Kamu' : `User ${(m.user_id || '').substring(0, 6)}`}
                  </p>
                  {isTargetAdmin && (
                    <Crown size={12} className="text-amber-500" />
                  )}
                </div>
                <p className="text-[10px] text-gray-400">
                  {isTargetAdmin ? 'Admin' : 'Member'}
                  {m.accepted_at && ` · Joined ${new Date(m.accepted_at).toLocaleDateString('id-ID')}`}
                </p>
              </div>
            </div>

            {isAdmin && (
              <div className="relative">
                <button
                  onClick={() => setMenuOpenId(menuOpenId === m.id ? null : m.id)}
                  className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <MoreVertical size={16} />
                </button>
                {menuOpenId === m.id && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpenId(null)} />
                    <div className="absolute right-0 top-9 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1 min-w-[160px]">
                      {isTargetAdmin ? (
                        <button
                          onClick={() => { setMenuOpenId(null) }}
                          disabled
                          className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-400 cursor-not-allowed"
                        >
                          <Crown size={14} /> Admin (kamu)
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => { setMenuOpenId(null); handleTransfer(m) }}
                            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                          >
                            <UserCog size={14} /> Jadikan Admin
                          </button>
                          <button
                            onClick={() => { setMenuOpenId(null); handleKick(m) }}
                            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-600 hover:bg-red-50"
                          >
                            <UserMinus size={14} /> {isMe ? 'Leave' : 'Keluarkan'}
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
