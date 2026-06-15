/**
 * MemberPicker — chip selector for picking a household member.
 * Shows "Kamu" for current user, "User xxx" (first 6 chars of user_id) for others.
 * Used in HouseholdTransactionsPage Shared tab.
 */
export function MemberPicker({ members, selectedId, onSelect, currentUserId, className = '' }) {
  return (
    <div className={`flex flex-wrap gap-1.5 px-1 ${className}`}>
      {members.map(m => {
        const isMe = m.user_id === currentUserId
        const selected = m.user_id === selectedId
        const label = isMe ? 'Kamu' : `User ${(m.user_id || '').substring(0, 6)}`
        return (
          <button
            key={m.id}
            onClick={() => onSelect?.(m.user_id)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
              selected
                ? 'bg-purple-600 text-white border-purple-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

export default MemberPicker
