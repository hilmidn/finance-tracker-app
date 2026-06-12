import { useState, useEffect } from 'react'
import { Wifi, WifiOff, RefreshCw } from 'lucide-react'
import { onNetworkChange } from '../services/sync'

export default function OfflineBanner({ pendingCount }) {
  const [status, setStatus] = useState({ isOnline: navigator.onLine, syncing: false })

  useEffect(() => {
    return onNetworkChange(setStatus)
  }, [])

  if (status.isOnline && !status.syncing && !pendingCount) return null

  return (
    <div className={`sticky top-0 z-50 px-4 py-2 text-xs font-medium flex items-center justify-center gap-2 ${
      status.isOnline && !status.syncing
        ? 'bg-amber-50 text-amber-800 border-b border-amber-200'
        : status.syncing
        ? 'bg-indigo-50 text-indigo-800 border-b border-indigo-200'
        : 'bg-red-50 text-red-800 border-b border-red-200'
    }`}>
      {!status.isOnline ? (
        <><WifiOff size={14} /> Kamu sedang offline. Transaksi akan disimpan dan dikirim otomatis saat online kembali.</>
      ) : status.syncing ? (
        <><RefreshCw size={14} className="animate-spin" /> Menyinkronkan data...</>
      ) : (
        <><RefreshCw size={14} /> {pendingCount} transaksi menunggu sinkronisasi</>
      )}
    </div>
  )
}
