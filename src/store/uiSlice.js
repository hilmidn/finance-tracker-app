import { createSlice } from '@reduxjs/toolkit'

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    online: navigator.onLine,
    syncing: false,
    pendingCount: 0,
  },
  reducers: {
    setOnline(state, action) {
      state.online = action.payload
    },
    setSyncing(state, action) {
      state.syncing = action.payload
    },
    setPendingCount(state, action) {
      state.pendingCount = action.payload
    },
  },
})

export const { setOnline, setSyncing, setPendingCount } = uiSlice.actions
export default uiSlice.reducer
