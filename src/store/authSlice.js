import { createSlice } from '@reduxjs/toolkit'

// viewMode persists across reloads. Default is 'personal'. If the user
// is not in a household, the switcher auto-snaps back to 'personal'
// (handled in useDataScope). Stored in localStorage with a small wrapper
// so we can call it from the slice and from a hydration helper.

const STORAGE_KEY = 'finance.viewMode'

function loadViewMode() {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'personal' || v === 'household') return v
  } catch (_) { /* SSR / private mode — ignore */ }
  return 'personal'
}

const initialViewMode = typeof window !== 'undefined' ? loadViewMode() : 'personal'

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    loading: true,
    currentHouseholdId: null,    // legacy: kept for backward compat with existing code
    viewMode: initialViewMode,   // 'personal' | 'household' — drives the global scope switcher
  },
  reducers: {
    setUser(state, action) {
      state.user = action.payload
    },
    setLoading(state, action) {
      state.loading = action.payload
    },
    clearAuth(state) {
      state.user = null
      state.currentHouseholdId = null
      // Note: we deliberately keep viewMode here. If the user was looking
      // at household data, they'll come back to it next login.
    },
    setCurrentHouseholdId(state, action) {
      state.currentHouseholdId = action.payload
    },
    setViewMode(state, action) {
      state.viewMode = action.payload
      try { localStorage.setItem(STORAGE_KEY, action.payload) } catch (_) { /* ignore */ }
    },
  },
})

export const { setUser, setLoading, clearAuth, setCurrentHouseholdId, setViewMode } = authSlice.actions
export default authSlice.reducer
