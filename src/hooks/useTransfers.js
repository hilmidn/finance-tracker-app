import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import db from '../db/local'

const transferKey = (uid) => ['transfers', uid]

/**
 * Transfers between personal wallets, OR from a personal wallet to a household wallet.
 * When to_household_wallet_id is set, the from-wallet is debited (existing behavior)
 * AND a household_transactions row is auto-created as income (US-7).
 */
export function useTransfers(userId) {
  const queryClient = useQueryClient()
  const key = transferKey(userId)

  const allQuery = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transfers')
        .select(`
          *,
          from_wallet:wallets!from_wallet_id(id,name,type,icon),
          to_wallet:wallets!to_wallet_id(id,name,type,icon),
          to_household_wallet:household_wallets!to_household_wallet_id(id,name,type,icon,household_id)
        `)
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) throw error

      // Cache
      for (const tr of data || []) {
        await db.transfers.put({
          ...tr,
          clientId: `srv_${tr.id}`,
          serverId: tr.id,
          userId: tr.user_id,
          to_household_wallet_id: tr.to_household_wallet_id,
          synced: true,
        })
      }
      return data || []
    },
    enabled: !!userId,
  })

  const addMutation = useMutation({
    mutationFn: async (tr) => {
      const payload = { ...tr, user_id: userId }
      // Strip the optional to_household_wallet_id if null/undefined
      if (!payload.to_household_wallet_id) {
        delete payload.to_household_wallet_id
      }
      const { data, error } = await supabase
        .from('transfers')
        .insert(payload)
        .select(`
          *,
          from_wallet:wallets!from_wallet_id(id,name,type,icon),
          to_wallet:wallets!to_wallet_id(id,name,type,icon),
          to_household_wallet:household_wallets!to_household_wallet_id(id,name,type,icon,household_id)
        `)
        .single()
      if (error) throw error
      return data
    },
    onSuccess: async (data) => {
      // If this transfer was to a household wallet, auto-create household_transactions row
      if (data.to_household_wallet_id && data.to_household_wallet?.household_id) {
        try {
          // Find "Transfer dari Pribadi" category for this household
          const { data: cat } = await supabase
            .from('household_categories')
            .select('id')
            .eq('household_id', data.to_household_wallet.household_id)
            .eq('name', 'Transfer dari Pribadi')
            .eq('type', 'pemasukan')
            .maybeSingle()

          const { error: hhErr } = await supabase
            .from('household_transactions')
            .insert({
              household_id: data.to_household_wallet.household_id,
              household_wallet_id: data.to_household_wallet_id,
              household_category_id: cat?.id || null,
              type: 'pemasukan',
              amount: data.amount,
              note: data.description || `Transfer dari pribadi`,
              date: data.date,
              source_transfer_id: data.id,
              created_by: userId,
            })
          if (hhErr) console.warn('Failed to auto-create household tx:', hhErr)
        } catch (e) {
          console.warn('Household auto-tx failed:', e)
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key })
      queryClient.invalidateQueries({ queryKey: ['transactions', userId] })
      queryClient.invalidateQueries({ queryKey: ['householdTransactions'] })
      queryClient.invalidateQueries({ queryKey: ['householdSummary'] })
      queryClient.invalidateQueries({ queryKey: ['householdTotalBalance'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      // First, check if there's a linked household_transaction to clean up
      const { data: linkedHh } = await supabase
        .from('household_transactions')
        .select('id')
        .eq('source_transfer_id', id)
        .maybeSingle()

      if (linkedHh) {
        await supabase.from('household_transactions').delete().eq('id', linkedHh.id)
      }

      const { error } = await supabase.from('transfers').delete().eq('id', id)
      if (error) throw error
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key })
      queryClient.invalidateQueries({ queryKey: ['transactions', userId] })
      queryClient.invalidateQueries({ queryKey: ['householdTransactions'] })
    },
  })

  return {
    transfers: allQuery.data || [],
    loading: allQuery.isLoading,
    addTransfer: (tr) => addMutation.mutateAsync(tr),
    deleteTransfer: (id) => deleteMutation.mutateAsync(id),
  }
}

/**
 * Get household wallets for the current user (any household they belong to).
 * Used in TransferForm to populate the "to household wallet" dropdown.
 */
export function useHouseholdWalletsForTransfer(userId) {
  return useQuery({
    queryKey: ['userHouseholdWallets', userId],
    queryFn: async () => {
      if (!userId) return []
      // Get user's accepted household
      const { data: membership } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', userId)
        .eq('status', 'accepted')
        .maybeSingle()
      if (!membership) return []
      // Get household wallets
      const { data: wallets, error } = await supabase
        .from('household_wallets')
        .select('id, name, type, icon, household_id')
        .eq('household_id', membership.household_id)
      if (error) throw error
      return wallets || []
    },
    enabled: !!userId,
  })
}
