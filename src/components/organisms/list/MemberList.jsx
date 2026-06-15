import { useState } from 'react'
import { useSelector } from 'react-redux'
import { Crown, MoreVertical, X, UserCog, UserMinus, Eye } from 'lucide-react'
import { Switch } from '../../atoms/Switch'
import { useHouseholdMembers } from '../../../hooks/useHouseholdMembers'
import ConfirmModal from '../modals/ConfirmModal'

/**
 * List of household members with action menu (kick, transfer ownership)
 * and per-member share toggle.
 *
 * Share toggle rules:
 * - Self row: enabled. Clicking flips `share_personal_to_household`
 *   via the SECURITY DEFINER RPC. Optimistic update via the hook.
 * - Other rows: disabled with "Hanya yang bisa mengelola" hint.
 *   The status is still visible (ON/OFF badge) so members can see
 *   who has shared.
 */
export default function MemberList({ householdId }) {
  const user = useSelector((s) => s.auth.user)
  const currentUserId = user?.id
  const {
    members,
    invites,
    kick,
    transferOwnership,
    cancelInvite,
    setSharePreference,
    isSettingSharePreference,
  } = useHouseholdMembers(householdId)
  const [menuOpenId, setMenuOpenId] = useState(null)

  // ── Modal state ──
  const [kickTarget, setKickTarget] = useState(null)  // member object or null
  const [kicking, setKicking] = useState(false)
  const [kickError, setKickError] = useState(null)
  const [transferTarget, setTransferTarget] = useState(null)
  const [transferring, setTransferring] = useState(false)
  const [transferError, setTransferError] = useState(null)
  const [cancelInviteTarget, setCancelInviteTarget] = useState(null)
  const [cancelling, setCancelling] = useState(false)

  // Find current user's membership to determine if admin
  const myMembership = members.find(m => m.user_id === currentUserId)
  const isAdmin = myMembership?.role === 'admin' && myMembership?.status === 'accepted'

  const handleConfirmKick = async () => {
    if (!kickTarget) return
    setKicking(true)
    setKickError(null)
    try {
      await kick(kickTarget.id)
      setKickTarget(null)
    } catch (err) {
      setKickError(err.message)
      throw err  // keep modal open
    } finally {
      setKicking(false)
    }
  }

  const handleConfirmTransfer = async () => {
    if (!transferTarget) return
    setTransferring(true)
    setTransferError(null)
    try {
      await transferOwnership({
        householdId,
        currentAdminUserId: currentUserId,
        newAdminUserId: transferTarget.user_id,
      })
      setTransferTarget(null)
    } catch (err) {
      setTransferError(err.message)
      throw err
    } finally {
      setTransferring(false)
    }
  }

  const handleConfirmCancelInvite = async () => {
    if (!cancelInviteTarget) return
    setCancelling(true)
    try {
      await cancelInvite(cancelInviteTarget.id)
      setCancelInviteTarget(null)
    } catch (err) {
      console.error('[MemberList] cancelInvite failed', err)
      throw err
    } finally {
      setCancelling(false)
    }
  }

  const handleToggleShare = async (m) => {
    if (m.user_id !== currentUserId) return
    try {
      await setSharePreference(!m.share_personal_to_household)
    } catch (err) {
      console.error('[MemberList] toggle share failed', err)
    }
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
              onClick={() => setCancelInviteTarget(inv)}
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
        const shareOn = !!m.share_personal_to_household

        return (
          <div key={m.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3">
            <div className="flex items-center justify-between">
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
                              onClick={() => { setMenuOpenId(null); setTransferTarget(m) }}
                              className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                            >
                              <UserCog size={14} /> Jadikan Admin
                            </button>
                            <button
                              onClick={() => { setMenuOpenId(null); setKickTarget(m) }}
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

            {/* Per-user share preference row */}
            <div className="mt-2.5 ml-12 flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 min-w-0">
                <Eye size={12} className={shareOn ? 'text-purple-500' : 'text-gray-300'} />
                <span className="text-[11px] text-gray-500 truncate">
                  {isMe ? 'Bagikan transaksi pribadi' : shareOn ? 'Berbagi transaksi pribadi' : 'Tidak berbagi'}
                </span>
              </div>
              <Switch
                checked={shareOn}
                disabled={!isMe || isSettingSharePreference}
                onChange={() => handleToggleShare(m)}
                aria-label={isMe ? 'Toggle bagikan transaksi pribadi' : 'Status share'}
                title={!isMe ? 'Hanya yang bisa mengatur preference masing-masing' : ''}
              />
            </div>
          </div>
        )
      })}

      {/* Kick / Leave confirm */}
      <ConfirmModal
        isOpen={!!kickTarget}
        onClose={() => { if (!kicking) { setKickTarget(null); setKickError(null) } }}
        onConfirm={handleConfirmKick}
        title={
          kickError ? 'Gagal' :
          kickTarget?.user_id === currentUserId ? 'Keluar dari household?' :
          `Keluarkan member ini?`
        }
        message={
          kickError ||
          (kickTarget?.user_id === currentUserId
            ? 'Kamu tidak akan lagi melihat transaksi household ini. Transaksi yang sudah ada tetap tersimpan.'
            : `User ${(kickTarget?.user_id || '').substring(0, 6)} akan kehilangan akses ke household ini.`)
        }
        confirmText={kickError ? 'Tutup' : 'Keluar'}
        cancelText="Batal"
        variant="danger"
        loading={kicking}
      />

      {/* Transfer ownership confirm */}
      <ConfirmModal
        isOpen={!!transferTarget}
        onClose={() => { if (!transferring) { setTransferTarget(null); setTransferError(null) } }}
        onConfirm={handleConfirmTransfer}
        title={
          transferError ? 'Gagal transfer' :
          `Jadikan User ${(transferTarget?.user_id || '').substring(0, 6)} sebagai admin?`
        }
        message={
          transferError ||
          'Kamu akan turun jadi member biasa dan tidak bisa mengelola household ini lagi. Pastikan orang ini bisa dipercaya.'
        }
        confirmText={transferError ? 'Tutup' : 'Jadikan Admin'}
        cancelText="Batal"
        variant="default"
        loading={transferring}
      />

      {/* Cancel invite confirm */}
      <ConfirmModal
        isOpen={!!cancelInviteTarget}
        onClose={() => { if (!cancelling) setCancelInviteTarget(null) }}
        onConfirm={handleConfirmCancelInvite}
        title={`Batalkan undangan ke ${cancelInviteTarget?.email}?`}
        message="Undangan ini akan dihapus dan tidak bisa dipakai lagi. Orang yang diundang harus diundang ulang kalau ingin bergabung."
        confirmText="Batalkan Undangan"
        cancelText="Kembali"
        variant="danger"
        loading={cancelling}
      />
    </div>
  )
}
