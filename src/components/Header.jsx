import { useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { User, Home, LogOut, ChevronDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useDataScope } from '../hooks/useDataScope'
import { clearAuth } from '../store/authSlice'
import CreateHouseholdModal from './CreateHouseholdModal'

/**
 * Sticky top header.
 * - Left: avatar + name + scope pill (Personal / Household).
 *   The pill is the mode switcher — tap to toggle between personal
 *   and household data scope.
 * - Right: kebab menu with "Pengaturan Household" + "Keluar".
 *
 * If the user has no household, the pill is replaced with a "Buat
 * Household" CTA so they can opt in.
 */
export default function Header({ onSignOut }) {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const user = useSelector((s) => s.auth.user)
  const { mode, isHousehold, household, isMember, setMode } = useDataScope()
  const [menuOpen, setMenuOpen] = useState(false)
  const [showCreate, setShowCreate] = useState(false)

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
  const initial = displayName[0]?.toUpperCase() || '?'

  // ── Pill (mode switcher) ──
  const pill = isMember ? (
    <div className="inline-flex bg-gray-100 rounded-full p-0.5 text-xs font-medium">
      <button
        onClick={() => setMode('personal')}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-full transition-colors ${
          mode === 'personal'
            ? 'bg-white text-indigo-700 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        }`}
        aria-label="Lihat data pribadi"
        aria-pressed={mode === 'personal'}
      >
        <User size={11} /> Pribadi
      </button>
      <button
        onClick={() => setMode('household')}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-full transition-colors max-w-[120px] truncate ${
          mode === 'household'
            ? 'bg-white text-violet-700 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        }`}
        aria-label={`Lihat data household ${household?.name || ''}`}
        aria-pressed={mode === 'household'}
      >
        <Home size={11} /> <span className="truncate">{household?.name || 'Keluarga'}</span>
      </button>
    </div>
  ) : (
    <button
      onClick={() => setShowCreate(true)}
      className="text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-full px-3 py-1 transition-colors"
    >
      + Buat Household
    </button>
  )

  const handleSignOut = () => {
    setMenuOpen(false)
    if (onSignOut) onSignOut()
    else { dispatch(clearAuth()); navigate('/') }
  }

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-200">
      <div className="flex items-center justify-between gap-2 px-4 py-2.5">
        {/* Left: avatar + name + scope pill */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
            isHousehold
              ? 'bg-gradient-to-br from-violet-500 to-indigo-600 text-white'
              : 'bg-gradient-to-br from-indigo-500 to-blue-600 text-white'
          }`}>
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-gray-900 truncate leading-tight">{displayName}</p>
            <div className="mt-0.5">{pill}</div>
          </div>
        </div>

        {/* Right: kebab menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
            aria-label="Menu"
          >
            <ChevronDown size={18} />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1 min-w-[200px]">
                {isMember && (
                  <button
                    onClick={() => { setMenuOpen(false); navigate('/household') }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Home size={14} /> Pengaturan Household
                  </button>
                )}
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut size={14} /> Keluar
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {showCreate && (
        <CreateHouseholdModal onClose={() => setShowCreate(false)} />
      )}
    </header>
  )
}
