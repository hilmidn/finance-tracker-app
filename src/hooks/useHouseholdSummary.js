import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

/**
 * Lightweight household summary for the dashboard card.
 * Returns: household name, member count, total balance, this-month summary, recent tx count.
 *
 * Note: Per-user share of personal transactions does NOT contribute to
 * the household ledger balances/summary — shared tx stay in personal
 * scope and are visible in the Shared tab only.
 */
export function useHouseholdSummary(householdId, members = []) {
  // Get all household wallets
  const walletsQuery = useQuery({
    queryKey: ['householdWallets', householdId],
    queryFn: async () => {
      if (!householdId) return []
      const { data, error } = await supabase
        .from('household_wallets')
        .select('id, name, initial_balance')
        .eq('household_id', householdId)
      if (error) throw error
      return data || []
    },
    enabled: !!householdId,
  })

  // Get current month summary
  const currentMonth = (() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })()

  const summaryQuery = useHouseholdSummaryDirect(householdId, currentMonth)

  // Total balance across all household wallets (initial + net of all tx)
  const totalBalanceQuery = useQuery({
    queryKey: ['householdTotalBalance', householdId],
    queryFn: async () => {
      if (!householdId) return 0
      const wallets = walletsQuery.data || []
      const walletIds = wallets.map(w => w.id)
      if (walletIds.length === 0) return 0

      let initial = 0
      wallets.forEach(w => { initial += w.initial_balance || 0 })

      // Sum of all household transactions
      const { data: hh } = await supabase
        .from('household_transactions')
        .select('type, amount, household_wallet_id')
        .eq('household_id', householdId)
        .in('household_wallet_id', walletIds)

      const net = (hh || []).reduce((acc, t) => {
        return acc + (t.type === 'pemasukan' ? t.amount : -t.amount)
      }, 0)
      return initial + net
    },
    enabled: !!householdId && !!walletsQuery.data,
  })

  return {
    memberCount: members.length || 0,
    walletCount: walletsQuery.data?.length || 0,
    totalBalance: totalBalanceQuery.data || 0,
    monthSummary: summaryQuery.data,
    loading: walletsQuery.isLoading || summaryQuery.isLoading,
  }
}

/**
 * Hook helper: get current-month summary for household
 */
function useHouseholdSummaryDirect(householdId, month) {
  return useQuery({
    queryKey: ['householdSummary', householdId, month],
    queryFn: async () => {
      if (!householdId) return null
      const [y, m] = month.split('-')
      const start = `${y}-${m}-01`
      const end = new Date(y, parseInt(m), 0).toISOString().split('T')[0]

      const { data: hh } = await supabase
        .from('household_transactions')
        .select('type, amount')
        .eq('household_id', householdId)
        .gte('date', start)
        .lte('date', end)

      const txs = hh || []
      const pemasukan = txs.filter(t => t.type === 'pemasukan').reduce((s, t) => s + t.amount, 0)
      const pengeluaran = txs.filter(t => t.type === 'pengeluaran').reduce((s, t) => s + t.amount, 0)
      return { pemasukan, pengeluaran, saldo: pemasukan - pengeluaran, count: txs.length }
    },
    enabled: !!householdId,
  })
}
