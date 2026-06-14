import { useSelector, useDispatch } from 'react-redux'
import { setViewMode } from '../store/authSlice'
import { useHousehold } from './useHousehold'

/**
 * Single source of truth for "what scope is the user viewing right now".
 *
 * Returns:
 *   - mode: 'personal' | 'household' (the effective mode; viewMode
 *           snaps back to 'personal' if user has no accepted household)
 *   - isHousehold: boolean
 *   - userId: always the logged-in user
 *   - householdId: null if no membership
 *   - household: households row or null
 *   - isMember: true if user has accepted membership
 *   - loading: true while the membership query is in flight
 *   - displayName: 'Kamu' (personal) or 'Keluarga' (household)
 *   - setMode(mode): switch (no-op if switching to household with no membership)
 */
export function useDataScope() {
  const userId = useSelector((s) => s.auth.user?.id)
  const viewMode = useSelector((s) => s.auth.viewMode)
  const dispatch = useDispatch()
  const { household, isMember, loading } = useHousehold(userId)

  // Auto-snap to personal if the user has no accepted household,
  // so we never end up on a "blank dashboard looking for data" page.
  const effectiveMode = (viewMode === 'household' && isMember && household?.id)
    ? 'household'
    : 'personal'

  const displayName = effectiveMode === 'household'
    ? (household?.name || 'Household')
    : 'Kamu'

  const setMode = (mode) => {
    if (mode === 'household' && !isMember) return  // can't switch, no membership
    dispatch(setViewMode(mode))
  }

  return {
    mode: effectiveMode,
    isHousehold: effectiveMode === 'household',
    userId,
    householdId: household?.id || null,
    household,
    isMember,
    loading,
    displayName,
    setMode,
  }
}
