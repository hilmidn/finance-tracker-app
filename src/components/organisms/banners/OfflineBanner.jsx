import { useSelector } from 'react-redux'
import { Wifi, WifiOff, RefreshCw } from 'lucide-react'

export default function OfflineBanner() {
  const { online, syncing, pendingCount } = useSelector((s) => s.ui)

  if (online && !syncing && !pendingCount) return null

  return (
    <div className={`sticky top-0 z-50 px-4 py-2 text-xs font-medium flex items-center justify-center gap-2 ${
      online && !syncing
        ? 'bg-amber-50 text-amber-800 border-b border-amber-200'
        : syncing
        ? 'bg-indigo-50 text-indigo-800 border-b border-indigo-200'
        : 'bg-red-50 text-red-800 border-b border-red-200'
    }`}>
      {!online ? (
        <><WifiOff size={14} /> Kamu sedang offline. Transaksi akan disimpan dan dikirim otomatis saat online kembali.</>
      ) : syncing ? (
        <><RefreshCw size={14} className="animate-spin" /> Menyinkronkan data...</>
      ) : (
        <><RefreshCw size={14} /> {pendingCount} transaksi menunggu sinkronisasi</>
      )}
    </div>
  )
}
