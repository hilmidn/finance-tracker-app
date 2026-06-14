import { useQuery } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { supabase } from '../lib/supabase'
import db from '../db/local'

/**
 * Fetch another household member's personal transactions.
 *
 * RLS is the gating mechanism: the "Household members can view shared
 * personal transactions" policy only allows the viewer to see tx from
 * members who have `share_personal_to_household = TRUE` and share a
 * household with the viewer. So when ownerUserId is null OR the owner
 * has toggled sharing off, the result will be an empty list (which is
 * the correct UX — no error, just no data).
 *
 * @param {string} householdId - household UUID (kept for key scoping even
 *                               though RLS doesn't use it)
 * @param {string} ownerUserId - the user whose tx we want to peek at
 */
export function useSharedPersonalTransactions(householdId, ownerUserId) {
  const online = useSelector((s) => s.ui.online)
  const key = ['sharedPersonalTx', householdId, ownerUserId]

  return useQuery({
    queryKey: key,
    queryFn: async () => {
      if (!householdId || !ownerUserId) return []
      try {
        const { data, error } = await supabase
          .from('transactions')
          .select(`
            *,
            categories (name),
            wallets (id, name, type, icon)
          `)
          .eq('user_id', ownerUserId)
          .order('date', { ascending: false })
          .order('created_at', { ascending: false })
        if (error) throw error

        // Mirror to Dexie for offline read (don't pollute personal cache
        // keyed by current userId; use a synthetic clientId).
        for (const tx of data || []) {
          const cached = await db.transactions.where('serverId').equals(tx.id).first()
          if (cached) {
            await db.transactions.put({ ...cached, ...tx, synced: true })
          } else {
            await db.transactions.put({
              ...tx,
              clientId: `shared_${tx.id}`,
              serverId: tx.id,
              userId: tx.user_id,
              synced: true,
            })
          }
        }
        return data || []
      } catch (err) {
        if (!online || err.message?.includes('Failed to fetch')) {
          const cached = await db.transactions.toArray()
          return cached.filter(t => t.user_id === ownerUserId && !t._deleted)
        }
        return []
      }
    },
    enabled: !!householdId && !!ownerUserId,
    // Refetch when toggled on/off — the result set changes
    refetchOnWindowFocus: true,
  })
}
