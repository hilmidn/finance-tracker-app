import { createSlice } from '@reduxjs/toolkit'

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    loading: true,
    currentHouseholdId: null,  // household yang lagi aktif (kalau ada)
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
    },
    setCurrentHouseholdId(state, action) {
      state.currentHouseholdId = action.payload
    },
  },
})

export const { setUser, setLoading, clearAuth, setCurrentHouseholdId } = authSlice.actions
export default authSlice.reducer
