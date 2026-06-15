import { useNavigate } from 'react-router-dom'
import { Home, Users, TrendingUp, TrendingDown, ChevronRight } from 'lucide-react'

/**
 * Compact card for the dashboard showing household summary.
 * Tap → /household/transactions
 */
export default function HouseholdSummaryCard({ household, memberCount, totalBalance, monthSummary, loading }) {
  const navigate = useNavigate()
  if (!household) return null

  return (
    <div
      onClick={() => navigate('/household')}
      className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-4 shadow-lg shadow-indigo-200 text-white cursor-pointer active:scale-[0.98] transition-transform"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
            <Home size={18} />
          </div>
          <div>
            <p className="text-[10px] text-white/70 font-medium">Household</p>
            <p className="text-sm font-bold">{household.name}</p>
          </div>
        </div>
        <ChevronRight size={18} className="text-white/70" />
      </div>

      {loading ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-6 w-32 bg-white/20 rounded" />
          <div className="h-3 w-20 bg-white/10 rounded" />
        </div>
      ) : (
        <>
          <div className="mb-3">
            <p className="text-[10px] text-white/70 mb-0.5">Total Saldo</p>
            <p className="text-2xl font-bold">Rp {(totalBalance || 0).toLocaleString('id-ID')}</p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white/10 rounded-xl px-2.5 py-1.5">
              <div className="flex items-center gap-1 text-[10px] text-white/70 mb-0.5">
                <Users size={10} /> {memberCount} anggota
              </div>
            </div>
            <div className="bg-white/10 rounded-xl px-2.5 py-1.5">
              <div className="flex items-center gap-1 text-[10px] text-white/70 mb-0.5">
                <TrendingUp size={10} /> Bulan ini
              </div>
              <p className="text-[11px] font-bold">
                +Rp {(monthSummary?.pemasukan || 0).toLocaleString('id-ID')}
              </p>
            </div>
            <div className="bg-white/10 rounded-xl px-2.5 py-1.5">
              <div className="flex items-center gap-1 text-[10px] text-white/70 mb-0.5">
                <TrendingDown size={10} /> Pengeluaran
              </div>
              <p className="text-[11px] font-bold">
                -Rp {(monthSummary?.pengeluaran || 0).toLocaleString('id-ID')}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
